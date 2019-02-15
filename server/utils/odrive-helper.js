const { odriveCreds } = require('../config/config');
const { User } = require('../models/user');
const axios = require('axios');
const qs = require('querystring');

var getAuthorizationUrl = () => {
  const url = `https://login.live.com/oauth20_authorize.srf?client_id=${odriveCreds.clientID}&scope=${odriveCreds.scope}&response_type=${odriveCreds.responseType}&redirect_uri=${odriveCreds.redirectUrl}`
  return url;
}

var saveToken = async (req, user) => {

  try {

    const code = req.query.code;

    const response = await axios({
      method: 'post',
      url: 'https://login.live.com/oauth20_token.srf',
      data: qs.stringify({
        client_id: odriveCreds.clientID,
        client_secret: odriveCreds.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: odriveCreds.redirectUrl,
        code
      }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
      .catch((e) => {
        console.log(e);
        throw 'Error getting token from Microsoft Servers';
      });

    var token = await response.data;
    // Graph API doesn't send the token expiry date so we add expires_in with current time to get the expiry date
    token['expiry_date'] = new Date().getTime() + token.expires_in * 1000;
    const email = await getUserInfo(token.access_token);
    const accounts = await user.addAccount(token, 'odrive', email);
    return accounts;

  } catch (e) {
    throw e;
  }

}

var getUserInfo = async (accessToken) => {

  const info = await axios({
    method: 'get',
    url: 'https://graph.microsoft.com/v1.0/me',
    headers: { 'Authorization': 'Bearer ' + accessToken }
  })
    .catch((e) => {
      console.log(e);
      throw 'Error getting account info from Microsoft Servers';
    });

  return await info.data.userPrincipalName;
}

var getFilesForAccount = async (token) => {
  token = await verifyTokenValidity(token);
  const files = await axios({
    method: 'get',
    url: 'https://graph.microsoft.com/v1.0/me/drive/root/children',
    headers: { 'Authorization': 'Bearer ' + token.access_token }
  })
    .catch((e) => {
      console.log(e);
      throw 'Error getting files from Microsoft Servers';
    });

  return await files.data.value;
}

var getDownloadUrl = async (token, fileId) => {
  const file = await getItemInfo(token, fileId).catch((e) => { throw e });
  return file['@microsoft.graph.downloadUrl'];
}

var getItemInfo = async (token, fileId) => {
  token = await verifyTokenValidity(token);

  const file = await axios({
    method: 'get',
    url: `https://graph.microsoft.com/v1.0//me/drive/items/${fileId}`,
    headers: { 'Authorization': 'Bearer ' + token.access_token }
  })
    .catch((e) => {
      console.log(e);
      throw 'Error getting file from Microsoft Servers';
    });

  return await file.data;
}

var getStorageInfo = async (token) => {
  token = await verifyTokenValidity(token);

  const info = await axios({
    method: 'get',
    url: 'https://graph.microsoft.com/v1.0/drive',
    headers: { 'Authorization': 'Bearer ' + token.access_token }
  })
    .catch((e) => {
      console.log(e);
      throw 'Error getting onedrive info from Microsoft Servers';
    });

  return await info.data.quota;
}

var verifyTokenValidity = async (token) => {
  var currentTime = new Date();
  var tokenExpiryTime = new Date(token.expiry_date);

  // if current time is 5 mins or more than token expiry
  if (((currentTime - tokenExpiryTime) > - (5 * 60 * 1000))) {

    console.log('Getting new onedrive token');
    // requesting new token
    const newToken = await axios({
      method: 'post',
      url: 'https://login.live.com/oauth20_token.srf',
      data: qs.stringify({
        client_id: odriveCreds.clientID,
        client_secret: odriveCreds.clientSecret,
        grant_type: 'refresh_token',
        redirect_uri: odriveCreds.redirectUrl,
        refresh_token: token.refresh_token
      }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
      .catch((e) => {
        console.log(e);
        throw 'Error refreshing onedrive token';
      });

    // TODO:
    // use the user instance instead of searching the whole database.

    await User.findOneAndUpdate(
      {
        'accounts': {
          '$elemMatch': {
            'token.access_token': token.access_token
          }
        }
      },
      {
        '$set': {
          "accounts.$.token.access_token": newToken.data.access_token,
          "accounts.$.token.refresh_token": newToken.data.refresh_token,
          "accounts.$.token.expiry_date": new Date().getTime() + (newToken.data.expires_in) * 1000
        }
      }
    ).catch((e) => {
      console.log(e);
      throw 'Error putting new token into db';
    });

    return newToken.data;
  }

  //token is good
  else {
    return token;
  }
}


module.exports = { getAuthorizationUrl, saveToken, getFilesForAccount, getDownloadUrl, getStorageInfo }
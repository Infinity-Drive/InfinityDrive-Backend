const axios = require('axios');
const qs = require('querystring');
const oneDriveAPI = require('onedrive-api');

const { odriveCreds } = require('../config/config');
const { User } = require('../models/user');

var getAuthorizationUrl = () => {
  const url = `https://login.live.com/oauth20_authorize.srf?client_id=${odriveCreds.clientID}&scope=${odriveCreds.scope}&response_type=${odriveCreds.responseType}&redirect_uri=${odriveCreds.redirectUrl}`
  return url;
}

var saveToken = async (req, user) => {

  try {

    const code = req.body.code;

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
    }).catch((e) => {
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
  }).catch((e) => {
    console.log(e);
    throw 'Error getting account info from Microsoft Servers';
  });

  return await info.data.userPrincipalName;
}

var getFilesForAccount = async (token, folderId = 'root') => {
  token = await verifyTokenValidity(token);
  const files = await axios({
    method: 'get',
    url: `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children?select=id,name,size,file,lastModifiedDateTime,@microsoft.graph.downloadUrl`,
    headers: { 'Authorization': 'Bearer ' + token.access_token }
  }).catch((e) => {
    console.log(e);
    throw 'Error getting files from Microsoft Servers';
  });

  return await files.data.value;
}

var getDownloadUrl = async (token, fileId) => {
  token = await verifyTokenValidity(token);

  const file = await axios({
    method: 'get',
    url: `https://graph.microsoft.com/v1.0//me/drive/items/${fileId}?select=id,@microsoft.graph.downloadUrl`,
    headers: { 'Authorization': 'Bearer ' + token.access_token }
  }).catch((e) => {
    console.log(e);
    throw 'Error getting file from Microsoft Servers';
  });

  const url = await file.data['@microsoft.graph.downloadUrl'];

  if (url)
    return url;
  else
    throw 'URL not found for item';

}

var getStorageInfo = async (token) => {
  token = await verifyTokenValidity(token);

  const info = await axios({
    method: 'get',
    url: 'https://graph.microsoft.com/v1.0/drive',
    headers: { 'Authorization': 'Bearer ' + token.access_token }
  }).catch((e) => {
    console.log(e);
    throw 'Error getting OneDrive info from Microsoft Servers';
  });

  return await {total: info.data.quota.total.toString(), used: info.data.quota.used.toString()};
}

var upload = async (token, filename, readableStream) => {
  token = await verifyTokenValidity(token);

  const item = await oneDriveAPI.items.uploadSimple({
    accessToken: token.access_token,
    filename,
    readableStream
  }).catch((e) => {
    console.log(e);
    throw 'Unable to upload file to OneDrive';
  });

  return item;
}

var deleteItem = async (token, itemId) => {
  token = await verifyTokenValidity(token);

  await oneDriveAPI.items.delete({
    accessToken: token.access_token,
    itemId
  }).catch((e) => {
    console.log(e);
    throw 'Unable to delete item from OneDrive';
  });
}

var verifyTokenValidity = async (token) => {
  var currentTime = new Date();
  var tokenExpiryTime = new Date(token.expiry_date);

  // if current time is NOT 5 mins or more than token expiry
  if (!((currentTime - tokenExpiryTime) > - (5 * 60 * 1000)))
    return token; //token is good

  //token is expired/close to expiring
  else {
    console.log('Getting new OneDrive token');
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
    }).catch((e) => {
      console.log(e);
      throw 'Error refreshing OneDrive token';
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
}

module.exports = { 
  getAuthorizationUrl, 
  saveToken, 
  getFilesForAccount, 
  getDownloadUrl, 
  getStorageInfo, 
  upload, 
  deleteItem 
}
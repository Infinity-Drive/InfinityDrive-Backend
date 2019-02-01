var fetch = require('isomorphic-fetch');

const config = {
  fetch: fetch,
  clientId: 'zxj96cyp7qvu5fp',
  clientSecret: 'nennum8mk99tvoi'
};

const Dropbox = require('dropbox').Dropbox;
var dbx = new Dropbox(config);

const redirectUri = `http://localhost:3000/dropbox/saveToken`;

var getAuthorizationUrl = () => {
  return dbx.getAuthenticationUrl(redirectUri, null, 'code')
}

var saveToken = async (req, user) => {
  try {
    let code = req.query.code;
    const token = await dbx.getAccessTokenFromCode(redirectUri, code);
    const userInfo = await getUserInfo(token);
    const accounts = await user.addAccount({ 'access_token': token }, 'dropbox', userInfo.email);
    return accounts;
  } catch (error) {
    throw error;
  }

}

var getFilesForAccount = async (token) => {
  var dbx = new Dropbox({ accessToken: token.access_token, fetch: fetch });
  return await dbx.filesListFolder({ path: '' });
}

var getUserInfo = async (token) => {
  var dbx = new Dropbox({ accessToken: token, fetch: fetch });
  const info = await dbx.usersGetCurrentAccount().catch((e) => {
    console.log(e);
    throw 'Error getting user info from Dropbox';
  });
  return info;
}

var getStorageInfo = async (token) => {
  var dbx = new Dropbox({ accessToken: token.access_token, fetch: fetch });
  const info = await dbx.usersGetSpaceUsage().catch((e) => {
    console.log(e);
    throw 'Error getting storage info from Dropbox';
  });
  return info;
}

var getDownloadUrl = async (token, fileId) => {
  var dbx = new Dropbox({ accessToken: token.access_token, fetch: fetch });
  const response = await dbx.filesGetTemporaryLink({ path: `id:${fileId}` }).catch((e) => {
    console.log(e);
    throw 'Unable to get file from Dropbox';
  });
  return response.link;
}

module.exports = { getAuthorizationUrl, saveToken, getFilesForAccount, getDownloadUrl, getStorageInfo }
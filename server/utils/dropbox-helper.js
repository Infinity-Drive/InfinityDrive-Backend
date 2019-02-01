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

  let code = req.query.code;
  const token = await dbx.getAccessTokenFromCode(redirectUri, code);

  // requesting dropbox API for account information for current token
  // this holds the user's email address
  const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!(response.status >= 400)) {
    var accountInfo = await response.json();
    return await user.addAccount({ 'access_token': token }, 'dropbox', accountInfo.email);
  }
  else
    return Promise.reject('Failed to reach dropbox servers!');

}

var getFilesForAccount = async (token) => {
  var dbx = new Dropbox({ accessToken: token.access_token, fetch: fetch });
  return await dbx.filesListFolder({ path: '' });
}

var getDownloadUrl = async (token, fileId) => {
  var dbx = new Dropbox({ accessToken: token.access_token, fetch: fetch });
  const response = await dbx.filesGetTemporaryLink({path: `id:${fileId}`}).catch((e) => {
    console.log(e);
    throw 'Unable to get file from Dropbox';
  });
  return response.link;
}

module.exports = { getAuthorizationUrl, saveToken, getFilesForAccount, getDownloadUrl }
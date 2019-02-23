const Dropbox = require('dropbox').Dropbox;
const fetch = require('isomorphic-fetch');
const dropboxStream = require('dropbox-stream');
const { dropboxCreds } = require('../config/config');

var dbx = new Dropbox({
  fetch: fetch,
  clientId: dropboxCreds.clientId,
  clientSecret: dropboxCreds.clientSecret
});

var getAuthorizationUrl = () => {
  return dbx.getAuthenticationUrl(dropboxCreds.redirectUri, null, 'code')
}

var saveToken = async (req, user) => {
  try {
    let code = req.body.code;
    const token = await dbx.getAccessTokenFromCode(dropboxCreds.redirectUri, code);
    const userInfo = await getUserInfo(token);
    const accounts = await user.addAccount({ 'access_token': token }, 'dropbox', userInfo.email);
    return accounts;
  } catch (e) {
    console.log(e);
    throw e;
  }

}

var getFilesForAccount = async (token, folderId = '') => {
  var dbx = new Dropbox({ accessToken: token.access_token, fetch: fetch });
  return await dbx.filesListFolder({ path: folderId });
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
  return { total: info.allocation.allocated.toString(), used: info.used.toString() };
}

var getDownloadUrl = async (token, fileId) => {
  var dbx = new Dropbox({ accessToken: token.access_token, fetch: fetch });
  const response = await dbx.filesGetTemporaryLink({ path: fileId }).catch((e) => {
    console.log(e);
    throw 'Unable to get file from Dropbox';
  });
  return response.link;
}

var upload = async (token, filename, readableStream, path = '/') => {

  const up = dropboxStream.createDropboxUploadStream({
    token: token.access_token,
    path: `${path}` + filename,
    chunkSize: 1000 * 1024,
    autorename: true,
    mode: 'add'
  })
    .on('error', err => {
      console.log(err);
      throw 'Unable to upload file to dropbox';
    })
    .on('progress', res => console.log(filename + ' uploaded: '+ res))
    .on('metadata', metadata => {
      return metadata;
    })

  readableStream.pipe(up)

}

var deleteItem = async (token, itemId) => {
  var dbx = new Dropbox({ accessToken: token.access_token, fetch: fetch });
  await dbx.filesDelete({ path: itemId }).catch((e) => {
    console.log(e);
    throw 'Unable to delete file from Dropbox';
  });
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
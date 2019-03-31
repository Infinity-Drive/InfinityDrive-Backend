const Dropbox = require('dropbox').Dropbox;
const fetch = require('isomorphic-fetch');
const dropboxStream = require('dropbox-stream');
const { dropboxCreds } = require('../config/config');

const dbx = new Dropbox({
  fetch,
  clientId: dropboxCreds.clientId,
  clientSecret: dropboxCreds.clientSecret,
});

const getAuthorizationUrl = () => dbx.getAuthenticationUrl(dropboxCreds.redirectUri, null, 'code');

const getUserInfo = (token) => {
  const dbx = new Dropbox({ accessToken: token, fetch });
  return dbx.usersGetCurrentAccount().catch((e) => {
    console.log(e);
    throw new Error('Error getting user info from Dropbox');
  });
};

const saveToken = async (req, user) => {
  try {
    const code = req.body.code;
    const token = await dbx.getAccessTokenFromCode(dropboxCreds.redirectUri, code);
    const userInfo = await getUserInfo(token);
    return user.addAccount({ access_token: token }, 'dropbox', userInfo.email);
  }
  catch (e) {
    console.log(e);
    throw e;
  }
};

const getFilesForAccount = async (token, folderId = '') => {
  const dbx = new Dropbox({ accessToken: token.access_token, fetch });
  return dbx.filesListFolder({ path: folderId });
};

const getStorageInfo = async (token) => {
  const dbx = new Dropbox({ accessToken: token.access_token, fetch });
  const info = await dbx.usersGetSpaceUsage().catch((e) => {
    console.log(e);
    throw new Error('Error getting storage info from Dropbox');
  });
  return { total: info.allocation.allocated.toString(), used: info.used.toString() };
};

const getDownloadUrl = async (token, fileId) => {
  const dbx = new Dropbox({ accessToken: token.access_token, fetch });
  const response = await dbx.filesGetTemporaryLink({ path: fileId }).catch((e) => {
    console.log(e);
    throw new Error('Unable to get file from Dropbox');
  });
  return response.link;
};

const upload = async (token, filename, readableStream, path = '/') => new Promise((resolve, reject) => {
  console.log(`---- Uploading ${filename} to Dropbox ----`);

  const up = dropboxStream.createDropboxUploadStream({
    token: token.access_token,
    path: `${path}${filename}`,
    chunkSize: 1000 * 1024,
    autorename: true,
    mode: 'add',
  })
    .on('error', (err) => {
      console.log(err);
      reject('Unable to upload file to dropbox');
    })
    .on('progress', res => console.log(`${res} uploaded dropbox`))
    .on('metadata', (metadata) => {
      resolve(metadata.id);
    });

  readableStream.pipe(up);
});

const deleteItem = (token, itemId) => {
  const dbx = new Dropbox({ accessToken: token.access_token, fetch });
  return dbx.filesDelete({ path: itemId }).catch((e) => {
    console.log(e);
    throw new Error('Unable to delete file from Dropbox');
  });
};

const getDownloadStream = (token, fileId) => {
  const stream = dropboxStream.createDropboxDownloadStream({
    token: token.access_token,
    path: fileId,
  })
    .on('error', (err) => {
      console.log(err);
      throw new Error('Unable to download file from Dropbox');
    })
    .on('progress', res => console.log(res));

  return stream;
};

const getProperties = async (token, itemId) => {
  const dbx = new Dropbox({ accessToken: token.access_token, fetch });
  return dbx.filesGetMetadata({ path: itemId });
};

module.exports = {
  getAuthorizationUrl,
  saveToken,
  getFilesForAccount,
  getDownloadUrl,
  getStorageInfo,
  upload,
  deleteItem,
  getDownloadStream,
  getProperties,
};

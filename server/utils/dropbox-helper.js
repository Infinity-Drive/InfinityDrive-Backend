const { Dropbox } = require('dropbox');
const fetch = require('isomorphic-fetch');
const dropboxStream = require('dropbox-stream');
const { dropboxCreds } = require('../config/config');

const getAuthorizationUrl = () => {
  const dbx = new Dropbox({
    fetch,
    clientId: dropboxCreds.clientId,
    clientSecret: dropboxCreds.clientSecret,
  });

  return dbx.getAuthenticationUrl(dropboxCreds.redirectUri, null, 'code');
};

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
    if (code) {
      // intialize new dbx oAuth2 client
      const dbx = new Dropbox({
        fetch,
        clientId: dropboxCreds.clientId,
        clientSecret: dropboxCreds.clientSecret,
      });

      const token = await dbx.getAccessTokenFromCode(dropboxCreds.redirectUri, code)
        .catch((e) => {
          throw new Error('Error getting access token from code!');
        });
      const userInfo = await getUserInfo(token);
      return user.addAccount({ access_token: token }, 'dropbox', userInfo.email);
    }
    throw new Error('Unable to get code from request');
  }
  catch (e) {
    console.log(e);
    throw e;
  }
};

const getFilesForAccount = async (token, folderId = '') => {
  const dbx = new Dropbox({ accessToken: token.access_token, fetch });
  const files = await dbx.filesListFolder({ path: folderId })
    .catch((e) => {
      throw new Error('Error getting files from dropbox');
    });
  return files;
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
    throw new Error('Unable to get download link from Dropbox');
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

const deleteItem = async (token, itemId) => {
  const dbx = new Dropbox({ accessToken: token.access_token, fetch });
  const deletedItem = await dbx.filesDelete({ path: itemId }).catch((e) => {
    console.log(e);
    throw new Error('Unable to delete file from Dropbox');
  });
  return deletedItem;
};

const getDownloadStream = (token, fileId) => new Promise((resolve, reject) => {
  const stream = dropboxStream.createDropboxDownloadStream({
    token: token.access_token,
    path: fileId,
  })
    .on('error', (err) => {
      console.log(err);
      reject('Unable to download file from Dropbox');
    })
    .on('progress', res => console.log(res));

  resolve(stream);
});

const getProperties = async (token, itemId) => {
  const dbx = new Dropbox({ accessToken: token.access_token, fetch });
  const metadata = await dbx.filesGetMetadata({ path: itemId }).catch((e) => {
    console.log(e);
    throw new Error('Unable to get file properties from Dropbox');
  });
  return metadata;
};

const createFolder = async (token, folderName, path = '/') => {
  const dbx = new Dropbox({ accessToken: token.access_token, fetch });
  const metadata = await dbx.filesCreateFolder({ path: `${path}${folderName}`, autorename: true })
    .catch((e) => {
      console.log(e);
      throw new Error('Error creating folder in Dropbox');
    });
  return {
    id: metadata.id,
    name: metadata.name,
    mimeType: 'folder',
    modifiedTime: '-',
  };
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
  createFolder,
};

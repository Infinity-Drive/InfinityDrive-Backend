const { google } = require('googleapis');
const axios = require('axios');

const { gdriveCreds } = require('../config/config');
const { User } = require('../models/user');


const auth = new google.auth.OAuth2(gdriveCreds.client_id,
  gdriveCreds.client_secret,
  gdriveCreds.redirect_uri);

const verifyTokenValidity = async (token) => {
  const currentTime = new Date();
  const tokenExpiryTime = new Date(token.expiry_date);

  // if current time is NOT 5 mins or more than token expiry
  if (!((currentTime - tokenExpiryTime) > -(5 * 60 * 1000))) {
    return token;
  }

  // token is expired/close to expiring

  console.log('Getting new google drive token');
  // requesting new token
  const newToken = await axios.post(
    'https://www.googleapis.com/oauth2/v4/token',
    { // refresh_token doesnt expire unless revoked by user
      refresh_token: token.refresh_token,
      client_id: gdriveCreds.client_id,
      client_secret: gdriveCreds.client_secret,
      grant_type: 'refresh_token',
    },
  ).catch((e) => {
    console.log(e);
    throw new Error('Error refreshing token');
  });

  // TODO:
  // use the user instance instead of searching the whole database.

  await User.findOneAndUpdate(
    {
      accounts: {
        $elemMatch: {
          'token.access_token': token.access_token,
        },
      },
    },
    {
      $set: {
        'accounts.$.token.access_token': newToken.data.access_token,
        'accounts.$.token.expiry_date': new Date().getTime() + (newToken.data.expires_in) * 1000,
      },
    },
  ).catch((e) => {
    console.log(e);
    throw new Error('Error putting new token into db');
  });

  return newToken.data;
};

const getAuthorizationUrl = () => {
  const url = auth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: gdriveCreds.scope,
    // access_type: 'online',
  });

  return url;
};

const getUserInfo = async (auth) => {
  const drive = google.drive({ version: 'v3', auth });
  const userInfoResponse = await drive.about.get({
    fields: 'user',
  }).catch((e) => {
    console.log(e);
    throw new Error('Error getting email from Google Servers');
  });
  return userInfoResponse.data.user.emailAddress;
};

const saveToken = async (req, user) => {
  try {
    const code = req.body.code;
    // we're throwing a custom error here because in response we
    // cannot send the original error when generated via oAuth client (circular structure)
    const response = await auth.getToken(code).catch((e) => {
      throw new Error('Error getting token from Google Servers');
    });
    const token = response.tokens;
    auth.setCredentials(token);
    const email = await getUserInfo(auth);
    const accounts = await user.addAccount(token, 'gdrive', email);
    return accounts;
  }
  catch (e) {
    throw e;
  }
};


const getStorageInfo = async (token) => {
  // token = await verifyTokenValidity(token);
  auth.setCredentials(token);
  const drive = google.drive({ version: 'v3', auth });
  const userInfoResponse = await drive.about.get({
    fields: 'storageQuota',
  }).catch((e) => {
    console.log(e);
    throw new Error('Error getting storage info from Google Servers');
  });
  return {
    total: userInfoResponse.data.storageQuota.limit,
    used: userInfoResponse.data.storageQuota.usage,
  };
};

const getFilesForAccount = async (token, folderId = 'root') => {
  // token = await verifyTokenValidity(token);
  try {
    auth.setCredentials(token);
  }
  catch (error) {
    console.log(error);
    throw new Error('Error authenticating with Google Drive');
  }

  // need to specify auth as auth: auth or auth: any_other_name
  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.files.list({
    q: `'me' in owners and '${folderId}' in parents and trashed = false`,
    pageSize: 50,
    fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime)',
    key: 'AIzaSyDHtla9ZqVhQm-dqEbFsM-sArr29XizGg4',
  }).catch((e) => {
    console.log(e);
    throw new Error('Error getting files');
  });

  const files = res.data.files;
  if (files.length) {
    return files;
  }

  return [];
};

const upload = async (token, fileName, readStream) => {
  // token = await verifyTokenValidity(token);
  auth.setCredentials(token);

  console.log(`---- Uploading ${fileName} to Google Drive ----`);
  const drive = google.drive({ version: 'v3', auth });
  const fileMetadata = {
    name: fileName,
  };
  const media = {
    body: readStream,
  };

  const response = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: 'id',
  }, {
    // max redirects prevents backpressure, if not used, whole stream is buffered first
    maxRedirects: 0,
    onUploadProgress: (progress) => {
      console.log(`${progress.bytesRead.toString()} uploaded gdrive`);
    },
  }).catch((e) => {
    console.log(e);
    throw new Error('Unable to upload file to Google Drive');
  });

  return response.data.id;
};

const getDownloadUrl = async (token, fileId) => {
  token = await verifyTokenValidity(token);
  auth.setCredentials(token);
  const drive = google.drive({ version: 'v3', auth });
  await drive.files.get({
    fileId,
  }).catch((e) => {
    console.log(e);
    throw new Error('Unable to get file from Google');
  });

  return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&access_token=${token.access_token}`;
};

const deleteItem = async (token, itemId) => {
  // token = await verifyTokenValidity(token);
  auth.setCredentials(token);
  const drive = google.drive({ version: 'v3', auth });
  await drive.files.delete({
    fileId: itemId,
  }).catch((e) => {
    console.log(e);
    throw new Error('Unable to delete file from Google Drive');
  });
};

const getDownloadStream = async (token, fileId) => {
  auth.setCredentials(token);
  const drive = google.drive({ version: 'v3', auth });

  const stream = await drive.files.get({
    fileId,
    alt: 'media',
  }, {
    responseType: 'stream',
  });

  return stream.data;
};

module.exports = {
  getAuthorizationUrl,
  saveToken,
  getFilesForAccount,
  upload,
  getStorageInfo,
  getDownloadUrl,
  deleteItem,
  getDownloadStream,
};

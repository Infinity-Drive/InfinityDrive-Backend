const { google } = require('googleapis');
const axios = require('axios');

const { gdriveCreds } = require('../config/config');
const { User } = require('../models/user');


var auth = new google.auth.OAuth2(gdriveCreds.client_id, gdriveCreds.client_secret, gdriveCreds.redirect_uri);

var getAuthorizationUrl = () => {

    const url = auth.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: gdriveCreds.scope,
        // access_type: 'online',
    });

    return url;
}

var saveToken = async (req, user) => {

    try {
        var code = req.body.code;
        // we're throwing a custom error here because in response we cannot send the original error when generated via oAuth client (circular structure)
        const response = await auth.getToken(code).catch((e) => { throw 'Error getting token from Google Servers' });
        var token = response.tokens;
        auth.setCredentials(token);
        const email = await getUserInfo(auth);
        var accounts = await user.addAccount(token, 'gdrive', email);
        return accounts;
    } catch (e) {
        throw e;
    }
}

var getUserInfo = async (auth) => {
    const drive = google.drive({ version: 'v3', auth });
    const userInfoResponse = await drive.about.get({
        fields: 'user'
    }).catch((e) => {
        console.log(e);
        throw 'Error getting email from Google Servers';
    });
    return userInfoResponse.data.user.emailAddress;
}

var getStorageInfo = async (token) => {
    // token = await verifyTokenValidity(token);
    auth.setCredentials(token);
    const drive = google.drive({ version: 'v3', auth });
    const userInfoResponse = await drive.about.get({
        fields: 'storageQuota'
    }).catch((e) => {
        console.log(e);
        throw 'Error getting storage info from Google Servers';
    });
    return { total: userInfoResponse.data.storageQuota.limit, used: userInfoResponse.data.storageQuota.usage };
}

var getFilesForAccount = async (token, folderId = 'root') => {
    // token = await verifyTokenValidity(token);
    auth.setCredentials(token);

    const drive = google.drive({ version: 'v3', auth }); // need to specify auth as auth: auth or auth: any_other_name

    var res = await drive.files.list({
        q: `'me' in owners and '${folderId}' in parents and trashed = false`,
        pageSize: 50,
        fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime)',
        key: 'AIzaSyDHtla9ZqVhQm-dqEbFsM-sArr29XizGg4'
    }).catch((e) => {
        console.log(e);
        throw 'Error getting files';
    });

    var files = res.data.files;
    if (files.length)
        return files;

    else
        return [];

}

var upload = async (token, fileName, readStream) => {
    // token = await verifyTokenValidity(token);
    auth.setCredentials(token);

    console.log(`---- Uploading ${fileName} to Google Drive ----`);
    const drive = google.drive({ version: 'v3', auth });
    var fileMetadata = {
        'name': fileName
    };
    var media = {
        body: readStream
    };

    const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id'
        },{
            // max redirects prevents backpressure, if not used, whole stream is buffered first
            maxRedirects: 0,
            onUploadProgress: (progress) => {
                console.log(progress.bytesRead.toString() + ' uploaded');
            }
        }).catch((e) => {
            console.log(e);
            throw 'Unable to upload file to Google Drive';
        });

    return response.data.id;

}

var getDownloadUrl = async (token, fileId) => {
    token = await verifyTokenValidity(token);
    auth.setCredentials(token);
    const drive = google.drive({ version: 'v3', auth });
    await drive.files.get({
        fileId
    }).catch((e) => {
        console.log(e);
        throw 'Unable to get file from Google';
    });

    return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&access_token=${token.access_token}`;
}

var deleteItem = async (token, itemId) => {
    // token = await verifyTokenValidity(token);
    auth.setCredentials(token);
    const drive = google.drive({ version: 'v3', auth });
    await drive.files.delete({
        fileId: itemId
    }).catch((e) => {
        console.log(e);
        throw 'Unable to delete file from Google Drive';
    });
}

var verifyTokenValidity = async (token) => {
    var currentTime = new Date();
    var tokenExpiryTime = new Date(token.expiry_date);

    // if current time is NOT 5 mins or more than token expiry
    if (!((currentTime - tokenExpiryTime) > - (5 * 60 * 1000)))
        return token;

    //token is expired/close to expiring
    else {
        console.log('Getting new google drive token');
        // requesting new token
        const newToken = await axios.post(
            'https://www.googleapis.com/oauth2/v4/token',
            {   //refresh_token doesnt expire unless revoked by user
                refresh_token: token.refresh_token,
                client_id: gdriveCreds.client_id,
                client_secret: gdriveCreds.client_secret,
                grant_type: 'refresh_token'
            }).catch((e) => {
                console.log(e);
                throw 'Error refreshing token';
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
    upload,
    getStorageInfo,
    getDownloadUrl,
    deleteItem
}
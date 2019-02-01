const fs = require('fs');
const { google } = require('googleapis');
const { gdriveCreds } = require('../config/config');
const { User } = require('../models/user');
const axios = require('axios');

const SCOPES = ['https://www.googleapis.com/auth/drive'];

var auth = new google.auth.OAuth2(gdriveCreds.client_id, gdriveCreds.client_secret, gdriveCreds.redirect_uri);

var saveToken = async (req, user) => {

    var code = req.query.code;
    var response;
    try {
        // we're throwing a custom error here because in response we cannot send the original error when generated via oAuth client (circular structure)
        response = await auth.getToken(code).catch((e) => { throw 'Error getting token from Google Servers' });
        var token = response.tokens;
        auth.setCredentials(token);
        const email = await getUserInfo(auth);
        var accounts = await user.addAccount(token, 'gdrive', email);
        return accounts;
    } catch (e) {
        throw e;
    }
}

var getAuthorizationUrl = () => {

    const url = auth.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: SCOPES,
        // access_type: 'online',
    });

    return url;
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
    auth.setCredentials(token);
    const drive = google.drive({ version: 'v3', auth });
    const userInfoResponse = await drive.about.get({
        fields: 'storageQuota'
    }).catch((e) => {
        console.log(e);
        throw 'Error getting storage info from Google Servers';
    });
    return userInfoResponse.data;
}

var getFilesForAccount = async (token) => {

    auth.setCredentials(token);

    const drive = google.drive({ version: 'v3', auth }); // need to specify auth as auth: auth or auth: any_other_name

    var res = await drive.files.list({
        pageSize: 10,
        fields: 'nextPageToken, files(id, name, mimeType)',
        key: 'AIzaSyDHtla9ZqVhQm-dqEbFsM-sArr29XizGg4'
    }).catch((e) => {
        console.log(e);
        throw 'Error getting files';
    });

    const files = res.data.files;
    if (files.length)
        return files;
    else
        throw 'No files found!';

}

var upload = (auth, fileName, readStream, res, lastChunk) => {
    console.log(`uploading ${fileName}`);
    const drive = google.drive({ version: 'v3', auth });
    var fileMetadata = {
        'name': fileName
    };
    var media = {
        body: fs.createReadStream(`${fileName}.bin`)
    };
    drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id'
    }, function (err, file) {
        if (err) {
            console.error(err);
        } else {

            if (lastChunk)
                res.send('Upload success');

            console.log('File Id: ', file.data.id);
        }
    });
}

var getDownloadUrl = async (token, fileId) => {
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

var verifyTokenValidity = async (token) => {
    var currentTime = new Date();
    var tokenExpiryTime = new Date(token.expiry_date);

    // if current time is 5 mins or more than token expiry
    if (((currentTime - tokenExpiryTime) > - (5 * 60 * 1000))) {

        console.log('Getting new token');
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
                    "accounts.$.token.id_token": newToken.data.id_token,
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

module.exports = { getAuthorizationUrl, saveToken, getFilesForAccount, upload, getStorageInfo, getDownloadUrl, verifyTokenValidity }
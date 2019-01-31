const fs = require('fs');
const { google } = require('googleapis');
const os = require('os');
const uuid = require('uuid');
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'];

var saveToken = async (req, res, oAuth2Client, user) => {

    var code = req.query.code;
    var response;
    try {
        // we're throwing a custom error here because in response we cannot send the original error when generated via oAuth client (circular structure)
        response = await oAuth2Client.getToken(code).catch((e) => { throw 'Error getting token from Google Servers' });
        var token = response.tokens;
        oAuth2Client.setCredentials(token);
        var email = await getUserEmail(oAuth2Client);
        var accounts = await user.addAccount(token, 'gdrive', email);
    } catch (error) {
        return res.status(400).send(error);
    }

    res.send(accounts);

}

var getAuthorizationUrl = (req, res, oAuth2Client) => {

    const url = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: SCOPES,
        // access_type: 'online',
    });

    res.send({ url });

}

var getUserEmail = async (auth) => {
    var me;
    try {
        const plus = google.plus({ version: 'v1', auth });
        me = await plus.people.get({ userId: 'me' });
    } catch (error) {
        throw 'Error getting user email!';
    }
    const userEmail = me.data.emails[0].value;
    return userEmail;
}

var getFilesForAccount = async (auth, token) => {

    auth.setCredentials(token);

    const drive = google.drive({ version: 'v3', auth }); // need to specify auth as auth: auth or auth: any_other_name

    try {

        var res = await drive.files.list({
            pageSize: 10,
            fields: 'nextPageToken, files(id, name, mimeType)',
            key: 'AIzaSyDHtla9ZqVhQm-dqEbFsM-sArr29XizGg4'
        }).catch((e) => { throw 'Error getting files' });

        const files = res.data.files;
        if (files.length)
            return files;
        else
            throw 'No files found!';

    } catch (error) {
        throw error;
    }

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

// reference: https://github.com/googleapis/google-api-nodejs-client/blob/master/samples/drive/download.js
var download = async (auth, token, fileId, name, response) => {

    auth.setCredentials(token);
    const drive = google.drive({ version: 'v3', auth });

    return new Promise(async (resolve, reject) => {
        const filePath = path.join(os.tmpdir(), uuid.v4());
        console.log(`writing to ${filePath}`);
        const dest = fs.createWriteStream(filePath);
        let progress = 0;
        const res = await drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'stream' }
        );
        res.data
            .on('end', () => {
                console.log('Done downloading file.');
                resolve(filePath);
            })
            .on('error', err => {
                console.error('Error downloading file.');
                reject(err);
            })
            .on('data', d => {
                progress += d.length;
                if (process.stdout.isTTY) {
                    process.stdout.clearLine();
                    process.stdout.cursorTo(0);
                    process.stdout.write(`Downloaded ${progress} bytes`);
                }
            })
            .pipe(dest);
    });
}

var getDownloadUrl = async (user, accountId, auth, token, fileId) => {

    auth.setCredentials(token);

    const drive = google.drive({ version: 'v3', auth });

    // only doing this, incase the token is expired/expiring, we can get an updated token
    await drive.files.get({
        fileId
    });

    //checking if old token was expired, in case it is, after making the above request we have the updated token in the db
    if(auth.isTokenExpiring()){
        // getting updated token
        console.log('Getting updated token');
        token = await user.getTokensForAccounts([accountId]);
    } 
       
    return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&access_token=${token.access_token}`;
    
}

module.exports = { getAuthorizationUrl, saveToken, getFilesForAccount, upload, download, getDownloadUrl }
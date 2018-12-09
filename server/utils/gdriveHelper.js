const fs = require('fs');
const utils = require('./utils');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile'];

var saveToken = (req, res, oAuth2Client, user) => {

    var code = req.query.code;

    oAuth2Client.getToken(code, (err, token) => {

        if (err) return console.error('Error retrieving access token');

            oAuth2Client.setCredentials(token);

            getUserEmail(oAuth2Client).then((email) => {
                user.addAccount(token, 'gdrive', email).then((msg) => {
                    console.log(msg);
                    res.send(user.accounts);
                }).catch((e) => {
                    console.log(e);
                    res.send(e);
                });
            }).catch((e) => {
                console.log(e);
            });

    });

}

var getAuthorizationUrl = (req, res, oAuth2Client) => {

    const url = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        // access_type: 'online',
        scope: SCOPES
    });

    res.send({ url });

}

var getUserEmail = async (auth) => {
    const plus = google.plus({ version: 'v1', auth });
    const me = await plus.people.get({ userId: 'me' });
    const userEmail = me.data.emails[0].value;
    return userEmail;
}

var getFilesForAccount = (auth, token) => {

    return new Promise((resolve, reject) => {

        auth.setCredentials(token);

        const drive = google.drive({ version: 'v3', auth }); // need to specify auth as auth: auth or auth: any_other_name

        drive.files.list({
            pageSize: 10,
            fields: 'nextPageToken, files(id, name, mimeType)',
            key: 'AIzaSyDHtla9ZqVhQm-dqEbFsM-sArr29XizGg4'
        }, (err, res) => {

            if (err) reject('The API returned an error: ' + err);
            
            const files = res.data.files;

            if (files.length) {
                resolve(files);
            } else {
                reject('No files found.');
            }
        });

    });

}

var upload = (auth, fileName, readStream, totalChunks, res, lastChunk) => {
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
                res.render('upload-success.hbs');
            
            console.log('File Id: ', file.id);
        }
    });
}

module.exports = { getAuthorizationUrl, saveToken, getFilesForAccount, upload}
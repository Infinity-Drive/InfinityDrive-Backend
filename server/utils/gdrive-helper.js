const fs = require('fs');
const { google } = require('googleapis');
const os = require('os');
const uuid = require('uuid');
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile'];

var saveToken = (req, res, oAuth2Client, user) => {

    var code = req.query.code;

    oAuth2Client.getToken(code, (err, token) => {

        if (err) return console.error('Error retrieving access token');

            oAuth2Client.setCredentials(token);

            getUserEmail(oAuth2Client).then((email) => {
                user.addAccount(token, 'gdrive', email).then((accounts) => {
                    res.send(user.accounts);
                }, (err) => res.send(err));
            }, (err) => console.log(err));

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
function download(auth, token, fileId, name, response) {

    auth.setCredentials(token);
    const drive = google.drive({ version: 'v3', auth });

    return new Promise(async (resolve, reject) => {
        const filePath = path.join(os.tmpdir(), uuid.v4());
        console.log(`writing to ${filePath}`);
        const dest = fs.createWriteStream(filePath);
        let progress = 0;
        const res = await drive.files.get(
          {fileId, alt: 'media'},
          {responseType: 'stream'}
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

module.exports = { getAuthorizationUrl, saveToken, getFilesForAccount, upload, download}
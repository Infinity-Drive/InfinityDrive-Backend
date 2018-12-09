const fs = require('fs');
const utils = require('./utils.js');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/drive'];

var saveToken = (req, res, oAuth2Client) => {

    var code = req.query.code;

    oAuth2Client.getToken(code, (err, token) => {
        if (err) return console.error('Error retrieving access token');
        //if token successfully obtained:
        utils.saveToken(token, 'gdrive').then((msg) => {
            console.log(msg);
            res.redirect('/');
        }).catch((e) => {console.log(e)})
    });

}

var setAuthorizationPage = (req, res, oAuth2Client) => {

    const url = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        // access_type: 'online',
        scope: SCOPES
    });

    res.render('home.hbs', { url });

}

var getUserEmail = async (auth) => {
    const plus = google.plus({ version: 'v1', auth });
    const me = await plus.people.get({ userId: 'me' });
    const userEmail = me.data.emails[0].value;
    return userEmail;
}

var getFilesForAllAccounts = (req, res, oAuth2Client) => {

    return new Promise((resolve, reject) => {

        utils.getGdriveTokens().then((tokens) => {

            files = [];
            
            tokens.forEach(token => {

                oAuth2Client.setCredentials(token);

                getFilesForAccount(oAuth2Client).then((fetchedFiles) => {

                    files.push(fetchedFiles);

                    if (files.length == tokens.length)
                        resolve(files);     //files for each account fetched, return them

                }, (err) => reject(err)).catch((err) => reject(err));

            });

        }, (err) => reject(err)).catch((err) => reject(err));

    });

};

var getFilesForAccount = (auth) => {

    return new Promise((resolve, reject) => {

        const drive = google.drive({ version: 'v3', auth });

        drive.files.list({
            pageSize: 10,
            fields: 'nextPageToken, files(id, name)',
            key: 'AIzaSyDHtla9ZqVhQm-dqEbFsM-sArr29XizGg4'
        }, (err, res) => {

            if (err) reject('The API returned an error: ' + err);
            
            const files = res.data.files;

            if (files.length) {
                resolve(files.map(file => file.name));
            } else {
                resolve('No files found.');
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

module.exports = { setAuthorizationPage, saveToken, getFilesAllGdriveAccounts, upload}
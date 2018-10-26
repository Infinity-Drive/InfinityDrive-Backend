const fs = require('fs');
const utils = require('./utils/utils');

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
        access_type: 'online',
        scope: SCOPES,
    });

    res.render('home.hbs', { url });

}

var getFilesAllGdriveAccounts = (req, res, gdriveUtils) => {

    return new Promise((resolve, reject) => {

        utils.getGdriveTokens().then((tokens) => {

            files = [];
            
            tokens.forEach(token => {

                gdriveUtils.oAuth2Client.setCredentials(token);

                getFilesForAccount(gdriveUtils.oAuth2Client, gdriveUtils.google).then((fetchedFiles) => {

                    files.push(fetchedFiles);

                    if (files.length == tokens.length)
                        resolve(files);     //files for each account fetched, return them

                }, (err) => reject(err)).catch((err) => reject(err));

            });

        }, (err) => reject(err)).catch((err) => reject(err));

    });

};

var getFilesForAccount = (auth, google) => {

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

var upload = (auth, google, fileName, readStream, totalChunks, res, lastChunk) => {
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
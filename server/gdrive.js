const fs = require('fs');
const splitter = require('./splitter');

const SCOPES = ['https://www.googleapis.com/auth/drive'];

var saveToken = (req, res, gdriveUtils) => {

    fs.readFile('tokens.json', (err, tokens) => {

        var updatedTokens = [];

        var code = req.query.code;

        if (err) {

            console.log('creating token file');

            gdriveUtils.oAuth2Client.getToken(code, (err, token) => {
                if (err) return console.error('Error retrieving access token');
                updatedTokens.push(token);
                fs.writeFileSync('tokens.json', JSON.stringify(updatedTokens));
            });
        }

        else {
            updatedTokens = JSON.parse(tokens);

            gdriveUtils.oAuth2Client.getToken(code, (err, token) => {
                if (err) return console.error('Error retrieving access token');
                updatedTokens.push(token);
                fs.writeFileSync('tokens.json', JSON.stringify(updatedTokens));
            });
        }

        res.redirect('/');

    });

}

var listFiles = (req, res, gdriveUtils) => {
    
    return new Promise((resolve, reject) => {
        fs.readFile('tokens.json', (err, tokens) => {

            if (!err) {

                tokens = JSON.parse(tokens);
                files = [];

                tokens.forEach(token => {
                    gdriveUtils.oAuth2Client.setCredentials(token);
                    files.push(getFilesForAccount(gdriveUtils.oAuth2Client, gdriveUtils.google));
                });

                resolve(files);     

            }

            else
                reject();

        });
    });
    
};

var setAuthorizationPage = (req, res, gdriveUtils) => {

    const url = gdriveUtils.oAuth2Client.generateAuthUrl({
        access_type: 'online',
        scope: SCOPES,
    });

    res.render('home.hbs', { url });

}

function getFilesForAccount(auth, gdriveUtils) {
    const drive = gdriveUtils.google.drive({ version: 'v3', auth });
    drive.files.list({
        pageSize: 10,
        fields: 'nextPageToken, files(id, name)',
        key: 'AIzaSyDHtla9ZqVhQm-dqEbFsM-sArr29XizGg4'
    }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const files = res.data.files;

        if (files.length) {
            console.log(files.map(file => file.name));
        } else {
            console.log('No files found.');
        }
    });
}

var upload = (gdriveUtils, fileName, readStream, totalChunks, res) => {
    console.log(`uploading ${fileName}`);
    const drive = gdriveUtils.google.drive({ version: 'v3', auth });
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
            chunksUploaded++;
            if (chunksUploaded == totalChunks) {
                res.render('upload-success.hbs', { chunksUploaded });
            }
            console.log('File Id: ', file.id);
        }
    });
}

module.exports = { setAuthorizationPage, saveToken, listFiles, upload}
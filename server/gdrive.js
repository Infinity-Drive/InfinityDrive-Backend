const fs = require('fs');
const splitter = require('./splitter');

const SCOPES = ['https://www.googleapis.com/auth/drive'];

var saveToken = (req, res, oAuth2Client) => {

    fs.readFile('tokens.json', (err, tokens) => {

        var updatedTokens = [];

        var code = req.query.code;

        if (err) {

            console.log('creating token file');

            oAuth2Client.getToken(code, (err, token) => {
                if (err) return console.error('Error retrieving access token');
                updatedTokens.push(token);
                fs.writeFileSync('tokens.json', JSON.stringify(updatedTokens));
            });
        }

        else {
            updatedTokens = JSON.parse(tokens);

            oAuth2Client.getToken(code, (err, token) => {
                if (err) return console.error('Error retrieving access token');
                updatedTokens.push(token);
                fs.writeFileSync('tokens.json', JSON.stringify(updatedTokens));
            });
        }

        res.redirect('/');

    });

}

var listFiles = (req, res, oAuth2Client, google) => {
    
    return new Promise((resolve, reject) => {
        fs.readFile('tokens.json', (err, tokens) => {

            if (!err) {

                tokens = JSON.parse(tokens);
                files = [];

                tokens.forEach(token => {
                    oAuth2Client.setCredentials(token);
                    files.push(getFilesForAccount(oAuth2Client, google));
                });

                resolve(files);     

            }

            else
                reject();

        });
    });
    

};


var uploadFile = (req, res, oAuth2Client, google) => {

    fs.readFile('tokens.json', (err, tokens) => {

        if (!err) {

            tokens = JSON.parse(tokens);

            var fileName = __dirname + '/a.zip';

            var readStream = fs.createReadStream(fileName);

            var stats = fs.statSync(fileName);
            var fileSizeInBytes = stats["size"];

            splitter.splitFileAndUpload(tokens, 3, readStream, fileSizeInBytes, oAuth2Client, google, res);

        }

    });

};

var setAuthorizationPage = (req, res, oAuth2Client) => {

    const url = oAuth2Client.generateAuthUrl({
        access_type: 'online',
        scope: SCOPES,
    });

    res.render('home.hbs', { url });

}

function getFilesForAccount(auth, google) {
    const drive = google.drive({ version: 'v3', auth });
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

module.exports = { setAuthorizationPage, saveToken, listFiles, uploadFile}
const express = require('express');
const { google } = require('googleapis');
const hbs = require('hbs');
const gdrive = require('./gdrive');

const app = express();

var gdriveUtils = {};

app.set('view engine', 'hbs'); //app.set is used to set express server configurations. Takes key value pairs.

app.use((req, res, next) => {   //this runs before each route

    var client_id = '651431583012-j0k0oent5gsprkdimeup45c44353pb35.apps.googleusercontent.com';
    var client_secret = '9aRhiRYg7Va5e5l6Dq-x5VFL';
    var redirect_uri = 'http://localhost:3000/gdrive/saveToken';

    var oAuth2Client_google = new google.auth.OAuth2(client_id, client_secret, redirect_uri);

    gdriveUtils = { google, oAuth2Client: oAuth2Client_google, gdrive};

    next();

});

app.get('/', (req, res) => {
    res.render('welcome.hbs');
});

app.get('/gdrive/authorize', (req, res) => {
    gdrive.setAuthorizationPage(req, res, gdriveUtils.oAuth2Client);
});

app.get('/gdrive/saveToken', (req, res) => {
    gdrive.saveToken(req, res, gdriveUtils);
});

app.get('/gdrive/listFiles', (req, res) => {
    gdrive.listFiles(req, res, gdriveUtils).then((files) => {
        res.render('files.hbs', {files});
    }).catch((err) => {
        console.log(err);
    });
});

app.get('/splitUpload', (req, res) => {

    fs.readFile('tokens.json', (err, tokens) => {

        if (!err) {

            tokens = JSON.parse(tokens);

            var fileName = __dirname + '/a.zip';

            var readStream = fs.createReadStream(fileName);

            var stats = fs.statSync(fileName);
            var fileSizeInBytes = stats["size"];

            var accounts = tokens.length; //this is temporary for now, it will eventually hold information for connected account

            splitter.splitFileAndUpload(tokens, accounts, readStream, fileSizeInBytes, res, gdriveUtils);

        }

    });
    
});

app.listen('3000', () => {
    console.log('Server started');
});
const express = require('express');
const hbs = require('hbs');
const { google } = require('googleapis');

const gdriveHelper = require('./utils/gdriveHelper');

const splitter = require('./splitter');
const utils = require('./utils/utils');

const fs = require('fs');

const app = express();

var oAuth2Client_google;

app.set('view engine', 'hbs'); //app.set is used to set express server configurations. Takes key value pairs.

app.use((req, res, next) => {   //this runs before each route

    var client_id = '651431583012-j0k0oent5gsprkdimeup45c44353pb35.apps.googleusercontent.com';
    var client_secret = '9aRhiRYg7Va5e5l6Dq-x5VFL';
    var redirect_uri = 'http://localhost:3000/gdrive/saveToken';

    oAuth2Client_google = new google.auth.OAuth2(client_id, client_secret, redirect_uri);

    next();

});

app.get('/', (req, res) => {
    res.render('welcome.hbs');
});

app.get('/gdrive/authorize', (req, res) => {
    gdriveHelper.setAuthorizationPage(req, res, oAuth2Client_google);
});

app.get('/gdrive/saveToken', (req, res) => {
    gdriveHelper.saveToken(req, res, oAuth2Client_google);
});

app.get('/gdrive/listFiles', (req, res) => {
    gdriveHelper.getFilesForAllAccounts(req, res, oAuth2Client_google).then((files) => {
        res.render('files.hbs', {files});
    }, (err) => {
        res.render('error.hbs', {err})
    });
});

app.get('/splitUpload', (req, res) => {

    utils.getTokensData().then((tokensData) => {
        
        var fileName = __dirname + '/a.rar';
        var readStream = fs.createReadStream(fileName);
        var stats = fs.statSync(fileName);
        var fileSizeInBytes = stats["size"];

        splitter.splitFileAndUpload(tokensData, readStream, fileSizeInBytes, res, oAuth2Client_google);

    }, (err) => {
        res.render('error.hbs', { err });
    }).catch((err) => {
        console.log(err);
    });
    
});

app.listen('3000', () => {
    console.log('Server started');
});
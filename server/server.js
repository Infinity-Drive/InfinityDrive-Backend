const express = require('express');
const { google } = require('googleapis');
const hbs = require('hbs');

const gdrive = require('./gdrive');
const splitter = require('./splitter');
const utils = require('./utils');

const fs = require('fs');

const app = express();

var gd = {};    //this object will contain everything related to google drive, from all utility functions to oAuthClient. i.e. wrapper for google drive

app.set('view engine', 'hbs'); //app.set is used to set express server configurations. Takes key value pairs.

app.use((req, res, next) => {   //this runs before each route

    var client_id = '651431583012-j0k0oent5gsprkdimeup45c44353pb35.apps.googleusercontent.com';
    var client_secret = '9aRhiRYg7Va5e5l6Dq-x5VFL';
    var redirect_uri = 'http://localhost:3000/gdrive/saveToken';

    var oAuth2Client_google = new google.auth.OAuth2(client_id, client_secret, redirect_uri);

    gd = { google, oAuth2Client: oAuth2Client_google, gdrive};

    next();

});

app.get('/', (req, res) => {
    res.render('welcome.hbs');
});

app.get('/gdrive/authorize', (req, res) => {
    gd.gdrive.setAuthorizationPage(req, res, gd.oAuth2Client);
});

app.get('/gdrive/saveToken', (req, res) => {
    gd.gdrive.saveToken(req, res, gd.oAuth2Client);
});

app.get('/gdrive/listFiles', (req, res) => {
    gd.gdrive.listFiles(req, res, gd).then((files) => {
        res.render('files.hbs', {files});
    }, (err) => {
        res.render('error.hbs', {err})
    });
});

app.get('/listFiles', (req, res) => {
    utils.getTokens().then((tokens) => {
        
    }).catch((err) => console.log(err));
});


app.get('/splitUpload', (req, res) => {

    utils.getTokens().then((tokens) => {

        var fileName = __dirname + '/a.zip';

        var readStream = fs.createReadStream(fileName);

        var stats = fs.statSync(fileName);
        var fileSizeInBytes = stats["size"];

        var accounts = tokens.length; //this will eventually hold information for connected accounts

        splitter.splitFileAndUpload(tokens, accounts, readStream, fileSizeInBytes, res, gd);

    }, (err) => {
        res.render('error.hbs', { err });
    }).catch((err) => {
        console.log(err);
    });
    
});

app.listen('3000', () => {
    console.log('Server started');
});
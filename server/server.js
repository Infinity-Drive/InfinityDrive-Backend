const express = require('express');
const { google } = require('googleapis');
const hbs = require('hbs');
const gdrive = require('./gdrive');

const app = express();

var oAuth2Client;

app.set('view engine', 'hbs'); //app.set is used to set express server configurations. Takes key value pairs.

app.use((req, res, next) => {   //this runs before each route

    var client_id = '651431583012-j0k0oent5gsprkdimeup45c44353pb35.apps.googleusercontent.com';
    var client_secret = '9aRhiRYg7Va5e5l6Dq-x5VFL';
    var redirect_uri = 'http://localhost:3000/gdrive/saveToken';

    oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);

    next();

});

app.get('/', (req, res) => {
    res.render('welcome.hbs');
});

app.get('/gdrive/authorize', (req, res) => {
    gdrive.setAuthorizationPage(req, res, oAuth2Client);
});

app.get('/gdrive/saveToken', (req, res) => {
    gdrive.saveToken(req, res, oAuth2Client);
});

app.get('/gdrive/listFiles', (req, res) => {
    gdrive.listFiles(req, res, oAuth2Client, google).then((files) => {
        res.render('files.hbs', {files});
    }).catch((err) => {
        console.log(err);
    });
});

app.get('/gdrive/upload', (req, res) => {
    gdrive.uploadFile(req, res, oAuth2Client, google);
});

app.listen('3000', () => {
    console.log('Server started');
});
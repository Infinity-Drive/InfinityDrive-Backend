const { google } = require('googleapis');
const _ = require('lodash');
const { ObjectID } = require('mongodb');

var { authenticate } = require('../middleware/authenticate');

var oAuth2Client_google;

var express = require('express'),
    router = express.Router();

const gdriveHelper = require('../utils/gdrive-helper');

router
    .use((req, res, next) => {   //this runs before each route

        // res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');    
        // res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');    
        // res.setHeader('Access-Control-Allow-Headers', 'x-auth,content-type');      
        // res.setHeader('Access-Control-Allow-Credentials', true);  

        var client_id = '651431583012-j0k0oent5gsprkdimeup45c44353pb35.apps.googleusercontent.com';
        var client_secret = '9aRhiRYg7Va5e5l6Dq-x5VFL';
        var redirect_uri = 'http://localhost:3000/gdrive/saveToken';

        oAuth2Client_google = new google.auth.OAuth2(client_id, client_secret, redirect_uri);

        next();

    })
    // Add a binding to handle '/test'
    .get('/authorize', (req, res) => {
        gdriveHelper.getAuthorizationUrl(req, res, oAuth2Client_google);
    })

    .get('/saveToken', authenticate, (req, res) => {
        gdriveHelper.saveToken(req, res, oAuth2Client_google, req.user);
    })

    .get('/listFiles/:accountId', authenticate, async (req, res) => {

        var accountId = req.params.accountId;
        if (!ObjectID.isValid(accountId))
            return res.status(404).send('Account ID not valid!');

        try {
            var token = await req.user.getTokensForAccounts([accountId]);
            var files = await gdriveHelper.getFilesForAccount(oAuth2Client_google, token);
            res.send(files);
        } catch (error) {
            return res.status(400).send(error);
        }

    })

    .get('/downloadUrl', authenticate, (req, res) => {
        req.user.getTokensForAccounts(['5c4d842f78e6ae29eca1b290']).then((token) => {
            res.send(gdriveHelper.getDownloadUrl(token, '1iWUSc5HzO5tCPpkqEziA6FB8OIhYHXNW'));
        }, (e) => res.send(e)).catch((e) => res.send(e));
    })

module.exports = router;

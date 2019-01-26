const { google } = require('googleapis');
const _ = require('lodash');

var { authenticate } = require('../middleware/authenticate');

var oAuth2Client_google;

var express = require('express'),
    router = express.Router();

const gdriveHelper = require('../utils/gdriveHelper');

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

    .get('/listFiles', authenticate, (req, res) => {

        var body = _.pick(req.body, ['accountId']);

        req.user.getTokensForAccounts([body.accountId]).then((token) => {

            gdriveHelper.getFilesForAccount(oAuth2Client_google, token).then((files) => {
                res.send(files);
            }, (e) => res.status(400).send(e));

        }, (e) => res.status(400).send(e));

    })

    .get('/download', authenticate, (req, res) => {

        req.user.getTokensForAccounts(['5c498413df714625f43aeba3']).then((token) => {

            gdriveHelper.download(oAuth2Client_google, token, '0B1yQid_w12U5TGpseFBLZ3RZZFVSVktzLWVyY2xfNWM2a1hR', '20180905_153617', res)
                .then((file) => {
                    res.send(file);
                }, (err) => {
                    res.send(err);
                })

        }, (e) => res.send(e)).catch((e) => res.send(e));

    })

module.exports = router;

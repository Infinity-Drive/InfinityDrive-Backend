const express = require('express');
const hbs = require('hbs');
const { google } = require('googleapis');

const _ = require('lodash');
const bodyParser = require('body-parser');
const {ObjectID} = require('mongodb');

var {User} = require('./models/user');
var {authenticate} = require('./middleware/authenticate');
const gdriveHelper = require('./utils/gdriveHelper');

const splitter = require('./splitter');
const utils = require('./utils/utils');

const fs = require('fs');

var oAuth2Client_google;

const app = express();

app.use(bodyParser.json()); //body parser lets us send json to our server

app.set('view engine', 'hbs'); //app.set is used to set express server configurations. Takes key value pairs.

app.use((req, res, next) => {   //this runs before each route

    // res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');    
    // res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');    
    // res.setHeader('Access-Control-Allow-Headers', 'x-auth,content-type');      
    // res.setHeader('Access-Control-Allow-Credentials', true);  

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
    gdriveHelper.getAuthorizationUrl(req, res, oAuth2Client_google);
});

app.get('/gdrive/saveToken', authenticate, (req, res) => {
    gdriveHelper.saveToken(req, res, oAuth2Client_google, req.user);
});

app.get('/gdrive/listFiles', authenticate, (req, res) => {

    var body = _.pick(req.body, ['accountId']);
    
    req.user.getTokensForAccounts([body.accountId]).then((token) => {
        
        gdriveHelper.getFilesForAccount(oAuth2Client_google, token).then((files) => {
            res.send(files);
        }, (e) => res.status(400).send(e));

    }, (e) => res.status(400).send(e));

});

app.get('/splitUpload', authenticate, (req, res) => {

    req.user.getAccounts().then((accounts) => {
        
        mergedAccounts = _.filter(accounts, account => account.merged);
        
        if(mergedAccounts.length >= 2)
            req.user.getTokensForAccounts(mergedAccounts).then((tokens) => {
                
                var fileName = __dirname + '/a.rar';
                var readStream = fs.createReadStream(fileName);
                var stats = fs.statSync(fileName);
                var fileSizeInBytes = stats["size"];

                splitter.splitFileAndUpload(tokens, readStream, fileSizeInBytes, res, oAuth2Client_google);

            });
        else
            res.status(400).send('Two or more accounts need to merged in order to split upload!');
        
    });

});

app.get('/gdrive/download', authenticate, (req, res) => {

    req.user.getTokensForAccounts(['5c498413df714625f43aeba3']).then((token) => {
    
        gdriveHelper.download(oAuth2Client_google, token, '0B1yQid_w12U5TGpseFBLZ3RZZFVSVktzLWVyY2xfNWM2a1hR', '20180905_153617', res)
        .then((file) => {
            res.send(file);
        }, (err) => {
            res.send(err);
        })

    }, (e) => res.send(e)).catch((e) => res.send(e));

});

app.post('/users/login', (req, res) => {

    var body = _.pick(req.body, ['email', 'password']);
    
    User.findByCredentials(body.email, body.password).then((user) => {
        return user.generateAuthToken().then((token) => {
            res.header('x-auth', token).send(user);
        });
    }).catch((err) => {
        res.status(400).send();
    });
    
});

app.post('/users', (req, res) => {

    var body = _.pick(req.body, ['email', 'password']);

    var newUser = new User(body);

    newUser.save().then(() => {
        return newUser.generateAuthToken();    //catched by *** then call (right below this)
        //res.send(user);
    }).then((token) => {             // ***
        res.header('x-auth', token).send(newUser);    //when we set a 'x-' header it means we're creating a custom header 
    }).catch((err) => {
        res.status(400).send(err);
    });

});

app.get('/users/getAccounts', authenticate, (req, res) => {
    req.user.getAccounts().then((accounts) => res.send(accounts), (err) => res.send(err));
});

app.post('/users/manage/accounts/merge', authenticate, (req, res) => {
    // accountIds is an array that will hold the object ids of the accounts to be updated
    var body = _.pick(req.body, ['accountIds', 'status']);
    req.user.changeMergedStatus(body.accountIds, body.status).then((msg) => res.send(msg), (err) => res.send(err));
});

app.listen('3000', () => {
    console.log('Server started');
});
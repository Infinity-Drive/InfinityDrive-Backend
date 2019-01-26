const _ = require('lodash');

var express = require('express'),
    router = express.Router();

const dropboxHelper = require('../utils/dropbox-helper');
var { authenticate } = require('../middleware/authenticate');

router
    .get('/authorize', (req, res) => {
        res.send(dropboxHelper.getAuthorizationUrl());
    })

    .get('/saveToken', authenticate, (req, res) => {
        dropboxHelper.saveToken(req, res, req.user);
    })

    .get('/listFiles', authenticate, (req, res) => {

        var body = _.pick(req.body, ['accountId']);

        req.user.getTokensForAccounts([body.accountId]).then((token) => {

            dropboxHelper.getFilesForAccount(token).then((files) => {
                res.send(files);
            }, (e) => res.status(400).send(e));

        }, (e) => res.status(400).send(e)).catch((e) => console.log(e));

    })


module.exports = router;

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
        dropboxHelper.saveToken(req, req.user).then((accounts) => {
            res.send(accounts);
        }).catch((e) => res.send(e));
    })

    .get('/listFiles', authenticate, async (req, res) => {
        
        var body = _.pick(req.body, ['accountId']);
        try {
            const token = await req.user.getTokensForAccounts([body.accountId]);
            res.send(await dropboxHelper.getFilesForAccount(token));
        } catch (error) {
            res.send(error);
        }

    })


module.exports = router;

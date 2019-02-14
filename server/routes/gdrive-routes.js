const { ObjectID } = require('mongodb');

var { authenticate } = require('../middleware/authenticate');

var express = require('express'),
    router = express.Router();

const gdriveHelper = require('../utils/gdrive-helper');

router

    .get('/authorize', (req, res) => {
        const url = gdriveHelper.getAuthorizationUrl();
        res.send({url});
    })

    .post('/saveToken', authenticate, async (req, res) => {
        try {
            const accounts = await gdriveHelper.saveToken(req, req.user);
            res.send(accounts);
        } catch (error) {
            return res.status(400).send(error);
        }
    })

    .get('/listFiles/:accountId', authenticate, async (req, res) => {

        const accountId = req.params.accountId;
        if (!ObjectID.isValid(accountId))
            return res.status(400).send('Account ID not valid!');
        
        try {
            var token = await req.user.getTokensForAccounts([accountId]);
            const files = await gdriveHelper.getFilesForAccount(token);
            res.send(files);
        } catch (error) {
            return res.status(400).send(error);
        }
    })

    .get('/downloadUrl/:accountId/:fileId', authenticate, async (req, res) => {

        const accountId = req.params.accountId;
        if (!ObjectID.isValid(accountId))
            return res.status(400).send('Account ID not valid!');
        
        try {
            var token = await req.user.getTokensForAccounts([accountId]);
            const downloadUrl = await gdriveHelper.getDownloadUrl(token, req.params.fileId);
            res.send({downloadUrl});
        } catch (error) {
            return res.status(400).send(error);
        }
    })

    .get('/storageInfo/:accountId', authenticate, async (req, res) => {

        const accountId = req.params.accountId;
        if (!ObjectID.isValid(accountId))
            return res.status(400).send('Account ID not valid!');
        
        try {
            var token = await req.user.getTokensForAccounts([accountId]);
            const storageInfo = await gdriveHelper.getStorageInfo(token);
            res.send(storageInfo)
        } catch (error) {
            return res.status(400).send(error);
        }
    });

module.exports = router;

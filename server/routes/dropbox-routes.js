var BusBoy = require("busboy");

var express = require('express'),
    router = express.Router();

const dropboxHelper = require('../utils/dropbox-helper');
var { authenticate } = require('../middleware/authenticate');
const { ObjectID } = require('mongodb');

router
    .get('/authorize', (req, res) => {
        const url = dropboxHelper.getAuthorizationUrl();
        res.send({ url });
    })

    .post('/saveToken', authenticate, async (req, res) => {
        try {
            const accounts = await dropboxHelper.saveToken(req, req.user);
            res.send(accounts);
        } catch (error) {
            return res.status(400).send(error);
        }
    })

    .get('/listFiles/:accountId/:folderId*?', authenticate, async (req, res) => {

        var accountId = req.params.accountId;
        if (!ObjectID.isValid(accountId))
            return res.status(400).send('Account ID not valid!');

        const folderId = req.params.folderId;
        try {
            const token = await req.user.getTokensForAccounts([accountId]);
            var files = await dropboxHelper.getFilesForAccount(token, folderId);
            res.send(files);
        } catch (error) {
            return res.status(400).send(error);
        }

    })

    .get('/downloadUrl/:accountId/:fileId', authenticate, async (req, res) => {

        var accountId = req.params.accountId;
        if (!ObjectID.isValid(accountId))
            return res.status(400).send('Account ID not valid!');

        try {
            const token = await req.user.getTokensForAccounts([accountId]);
            const downloadUrl = await dropboxHelper.getDownloadUrl(token, req.params.fileId);
            res.send({ downloadUrl })
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
            const storageInfo = await dropboxHelper.getStorageInfo(token);
            res.send(storageInfo)
        } catch (error) {
            return res.status(400).send(error);
        }
    })

    .post('/upload/:accountId', authenticate, async (req, res) => {

        try {

            const accountId = req.params.accountId;
            if (!ObjectID.isValid(accountId))
                return res.status(400).send('Account ID not valid!');

            var busboy = new BusBoy({ headers: req.headers });

            if (!ObjectID.isValid(accountId))
                return res.status(400).send('Account ID not valid!');

            const token = await req.user.getTokensForAccounts([accountId]);

            busboy.on("file", async (fieldname, file, filename, encoding, mimetype) => {
                await dropboxHelper.upload(token, filename, file);
                res.send('File Uploaded');
            });

            req.pipe(busboy);

        } catch (e) {
            res.status(400).send(e);
            console.log(e);
        }

    })

    .delete('/delete/:accountId/:itemId', authenticate, async (req, res) => {

        const accountId = req.params.accountId;
        if (!ObjectID.isValid(accountId))
            return res.status(400).send('Account ID not valid!');

        try {
            var token = await req.user.getTokensForAccounts([accountId]);
            await dropboxHelper.deleteItem(token, req.params.itemId);
            res.send('Item deleted');
        } catch (error) {
            return res.status(400).send(error);
        }
    });

module.exports = router;

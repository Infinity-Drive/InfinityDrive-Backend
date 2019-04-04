const express = require('express');
const BusBoy = require('busboy');
const { ObjectID } = require('mongoose').Types.ObjectId;

const dropboxHelper = require('../utils/dropbox-helper');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();

router
  .get('/authorize', (req, res) => {
    const url = dropboxHelper.getAuthorizationUrl();
    res.send({ url });
  })

  .post('/saveToken', authenticate, async (req, res) => {
    try {
      const accounts = await dropboxHelper.saveToken(req, req.user);
      res.send(accounts);
    }
    catch (error) {
      res.status(400).send(error.message);
    }
  })

  .get('/listFiles/:accountId/:folderId*?', authenticate, async (req, res) => {
    const accountId = req.params.accountId;
    if (!ObjectID.isValid(accountId)) {
      return res.status(400).send('Account ID not valid!');
    }

    const folderId = req.params.folderId;
    try {
      const token = await req.user.getTokensForAccounts([accountId]);
      const files = await dropboxHelper.getFilesForAccount(token, folderId);
      res.send(files);
    }
    catch (error) {
      res.status(400).send(error.message);
    }
  })

  .get('/downloadUrl/:accountId/:fileId', authenticate, async (req, res) => {
    const accountId = req.params.accountId;
    if (!ObjectID.isValid(accountId)) {
      return res.status(400).send('Account ID not valid!');
    }

    try {
      const token = await req.user.getTokensForAccounts([accountId]);
      const downloadUrl = await dropboxHelper.getDownloadUrl(token, req.params.fileId);
      res.send({ downloadUrl });
    }
    catch (error) {
      res.status(400).send(error.message);
    }
  })

  .get('/storageInfo/:accountId', authenticate, async (req, res) => {
    const accountId = req.params.accountId;
    if (!ObjectID.isValid(accountId)) {
      return res.status(400).send('Account ID not valid!');
    }

    try {
      const token = await req.user.getTokensForAccounts([accountId]);
      const storageInfo = await dropboxHelper.getStorageInfo(token);
      res.send(storageInfo);
    }
    catch (error) {
      res.status(400).send(error.message);
    }
  })

  .post('/upload/:accountId', authenticate, async (req, res) => {
    try {
      const accountId = req.params.accountId;
      if (!ObjectID.isValid(accountId)) {
        return res.status(400).send('Account ID not valid!');
      }

      const busboy = new BusBoy({ headers: req.headers });
      const token = await req.user.getTokensForAccounts([accountId]);

      busboy.on('file', async (fieldname, file, filename, encoding, mimetype) => {
        await dropboxHelper.upload(token, filename, file);
        // TODO: send back file to front end
        res.send('File Uploaded');
      });

      req.pipe(busboy);
    }
    catch (error) {
      res.status(400).send(error);
    }
  })

  .delete('/delete/:accountId/:itemId', authenticate, async (req, res) => {
    const accountId = req.params.accountId;
    if (!ObjectID.isValid(accountId)) {
      return res.status(400).send('Account ID not valid!');
    }

    try {
      const token = await req.user.getTokensForAccounts([accountId]);
      await dropboxHelper.deleteItem(token, req.params.itemId);
      res.send('Item deleted');
    }
    catch (error) {
      res.status(400).send(error.message);
    }
  })

  .get('/properties/:accountId/:itemId', authenticate, async (req, res) => {
    const accountId = req.params.accountId;
    if (!ObjectID.isValid(accountId)) {
      return res.status(400).send('Account ID not valid!');
    }

    try {
      const token = await req.user.getTokensForAccounts([accountId]);
      const properties = await dropboxHelper.getProperties(token, req.params.itemId);
      res.send(properties);
    }
    catch (error) {
      res.status(400).send(error.message);
    }
  })

  .post('/createFolder/:accountId', authenticate, async (req, res) => {
    const accountId = req.params.accountId;
    if (!ObjectID.isValid(accountId)) {
      return res.status(400).send('Account ID not valid!');
    }

    if (req.body.folderName.trim() === '') {
      return res.status(400).send('Folder name can\'t be empty');
    }

    try {
      const token = await req.user.getTokensForAccounts([accountId]);
      const folder = await dropboxHelper.createFolder(token, req.body.folderName, req.body.path);
      res.send(folder);
    }
    catch (error) {
      res.status(400).send(error.message);
    }
  });

module.exports = router;

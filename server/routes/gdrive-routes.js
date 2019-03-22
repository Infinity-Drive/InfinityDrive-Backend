const express = require('express');
const BusBoy = require('busboy');
const { ObjectID } = require('mongoose').Types.ObjectId;

const { authenticate } = require('../middleware/authenticate');
const gdriveHelper = require('../utils/gdrive-helper');

const router = express.Router();

router

  .get('/authorize', (req, res) => {
    const url = gdriveHelper.getAuthorizationUrl();
    res.send({ url });
  })

  .post('/saveToken', authenticate, async (req, res) => {
    try {
      const accounts = await gdriveHelper.saveToken(req, req.user);
      res.send(accounts);
    }
    catch (error) {
      return res.status(400).send(error);
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
      const files = await gdriveHelper.getFilesForAccount(token, folderId);
      res.send(files);
    }
    catch (error) {
      return res.status(400).send(error);
    }
  })

  .get('/downloadUrl/:accountId/:fileId', authenticate, async (req, res) => {
    const accountId = req.params.accountId;
    if (!ObjectID.isValid(accountId)) {
      return res.status(400).send('Account ID not valid!');
    }

    try {
      const token = await req.user.getTokensForAccounts([accountId]);
      const downloadUrl = await gdriveHelper.getDownloadUrl(token, req.params.fileId);
      res.send({ downloadUrl });
    }
    catch (error) {
      return res.status(400).send(error);
    }
  })

  .get('/storageInfo/:accountId', authenticate, async (req, res) => {
    const accountId = req.params.accountId;
    if (!ObjectID.isValid(accountId)) {
      return res.status(400).send('Account ID not valid!');
    }

    try {
      const token = await req.user.getTokensForAccounts([accountId]);
      const storageInfo = await gdriveHelper.getStorageInfo(token);
      res.send(storageInfo);
    }
    catch (error) {
      return res.status(400).send(error);
    }
  })


  .post('/upload/:accountId', authenticate, async (req, res) => {
    try {
      const accountId = req.params.accountId;
      if (!ObjectID.isValid(accountId)) {
        return res.status(400).send('Account ID not valid!');
      }

      const busboy = new BusBoy({ headers: req.headers });

      if (!ObjectID.isValid(accountId)) {
        return res.status(400).send('Account ID not valid!');
      }

      const token = await req.user.getTokensForAccounts([accountId]);

      busboy.on('file', async (fieldname, file, filename, encoding, mimetype) => {
        const uploadedFile = await gdriveHelper.upload(token, filename, file);
        res.send('File Uploaded');
      });

      req.pipe(busboy);
    }
    catch (e) {
      res.status(400).send(e);
      console.log(e);
    }
  })

  .delete('/delete/:accountId/:itemId', authenticate, async (req, res) => {
    const accountId = req.params.accountId;
    if (!ObjectID.isValid(accountId)) {
      return res.status(400).send('Account ID not valid!');
    }

    try {
      const token = await req.user.getTokensForAccounts([accountId]);
      await gdriveHelper.deleteItem(token, req.params.itemId);
      res.send('Item deleted');
    }
    catch (error) {
      return res.status(400).send(error);
    }
  });

module.exports = router;

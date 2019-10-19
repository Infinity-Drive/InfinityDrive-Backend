const express = require('express');
const BusBoy = require('busboy');
const { ObjectID } = require('mongoose').Types.ObjectId;

const { authenticate } = require('../middleware/authenticate');
const gdriveHelper = require('../utils/gdrive-helper');

const { sharedFile: SharedFile } = require('../db/models/shared-file');
const { User } = require('../db/models/user');

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
      const files = await gdriveHelper.getFilesForAccount(token, folderId);
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
      const downloadUrl = await gdriveHelper.getDownloadUrl(token, req.params.fileId);
      res.send({ downloadUrl });
    }
    catch (error) {
      res.status(400).send(error.message);
    }
  })

  .post('/downloadUrlShared/:accountId/:fileId', async (req, res) => {
    const accountId = req.params.accountId;
    if (!ObjectID.isValid(accountId)) {
      return res.status(400).send('Account ID not valid!');
    }

    try {
      const sharedFile = await SharedFile.findById(req.body.shareId);
      const user = await User.findById(sharedFile.userId);
      const token = await user.getTokensForAccounts([accountId]);
      const downloadUrl = await gdriveHelper.getDownloadUrl(token, req.params.fileId);
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
      const storageInfo = await gdriveHelper.getStorageInfo(token);
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
      let parentId = 'root';

      busboy.on('field', (fieldname, val) => {
        if (fieldname === 'parentId') {
          parentId = val;
        }
      });

      busboy.on('file', async (fieldname, file, filename) => {
        await gdriveHelper.upload(token, filename, file, parentId);
        // TODO: send back file to front end
        res.send('File Uploaded');
      });
      req.pipe(busboy);
    }
    catch (error) {
      res.status(400).send(error.message);
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
      const properties = await gdriveHelper.getProperties(token, req.params.itemId);
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
      const folder = await gdriveHelper.createFolder(token, req.body.folderName, req.body.parentFolder);
      res.send(folder);
    }
    catch (error) {
      res.status(400).send(error.message);
    }
  });

module.exports = router;

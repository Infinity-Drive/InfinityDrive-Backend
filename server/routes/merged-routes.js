const BusBoy = require('busboy');
const express = require('express');
const { ObjectID } = require('mongoose').Types.ObjectId;

const { authenticate } = require('../middleware/authenticate');
const splitter = require('../utils/splitter');
const mergedHelper = require('../utils/merged-helper');
const merger = require('../utils/merger');
const { sharedFile: SharedFile } = require('../models/shared-file');
const { User } = require('../models/user');

const router = express.Router();

router
  .get('/listFiles', authenticate, async (req, res) => {
    try {
      let accounts = req.user.accounts.toObject();
      accounts = await mergedHelper.getFilesForAccount(accounts, req.user);
      res.send(accounts);
    }
    catch (error) {
      return res.status(400).send(error.message);
    }
  })

  .get('/download/:fileId', authenticate, async (req, res) => {
    const fileId = req.params.fileId;
    if (!ObjectID.isValid(fileId)) {
      return res.status(400).send('File ID not valid!');
    }

    try {
      const splitDirectory = await req.user.getSplitDirectory();
      const file = splitDirectory.getFile(fileId);
      merger.mergeFile(file.parts, req.user, res);
    }
    catch (error) {
      // console.log(error);
      res.status(400).send('Unable to download file');
    }
  })


  .get('/downloadShare/:fileId/:shareId', async (req, res) => {
    const fileId = req.params.fileId;
    const shareId = req.params.shareId;

    if (!ObjectID.isValid(fileId)) {
      return res.status(400).send('File id not valid');
    }

    try {
      const sharedFile = await SharedFile.findById(shareId);
      const user = await User.findById(sharedFile.userId);
      const splitDirectory = await user.getSplitDirectory();

      const file = splitDirectory.getFile(fileId);
      merger.mergeFile(file.parts, user, res);
    }
    catch (error) {
      // console.log(error);
      res.status(400).send(error);
    }
  })

  .post('/upload', authenticate, async (req, res) => {
    try {
      const busboy = new BusBoy({ headers: req.headers, highWaterMark: 16000 });
      let accounts = req.user.accounts.toObject();

      busboy.on('field', (fieldname, val) => {
        if (fieldname === 'accounts') {
          accounts = JSON.parse(val);
        }
      });

      busboy.on('file', async (fieldname, file, name, encoding, mimeType) => {
        const tokens = await req.user.getTokensForAccounts(accounts.map(a => a._id));
        let chunksPerAccount;
        const fileSize = Number(req.headers['x-filesize']);
        if (!req.user.settings.forceEqualSplit) {
          chunksPerAccount = accounts.map(a => a.chunksToUpload);
        }
        else {
          chunksPerAccount = accounts.map(a => Math.ceil((fileSize / 16000) / tokens.length));
        }

        const ids = await splitter.splitFileAndUpload(tokens, file, fileSize, name, chunksPerAccount);
        const parts = [];
        accounts.forEach((account, i) => {
          parts.push({
            accountType: tokens[i].accountType,
            // front end sends only the account ids like: [abc, abc]
            accountId: account._id ? account._id : account,
            partId: ids[i],
          });
        });

        const splitDirectory = await req.user.getSplitDirectory();
        const splitFile = await splitDirectory.addFile(name, Number(req.headers['x-filesize']), parts, mimeType);
        res.send(splitFile);
      });

      req.pipe(busboy);
    }
    catch (error) {
      res.status(400).send('Unable to split upload!');
      console.log(error);
    }
  })

  .delete('/delete/:fileId', authenticate, async (req, res) => {
    const fileId = req.params.fileId;
    if (!ObjectID.isValid(fileId)) {
      return res.status(400).send('File ID not valid!');
    }

    try {
      const splitDirectory = await req.user.getSplitDirectory();
      const file = splitDirectory.getFile(fileId);
      await mergedHelper.deleteParts(file.parts, req.user);
      await splitDirectory.removeFile(fileId);
      res.send('Item deleted');
    }
    catch (error) {
      console.log(error);
      res.status(400).send('Unable to delete file');
    }
  });

module.exports = router;

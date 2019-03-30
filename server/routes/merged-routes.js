const BusBoy = require('busboy');
const express = require('express');
const { ObjectID } = require('mongoose').Types.ObjectId;

const { authenticate } = require('../middleware/authenticate');
const splitter = require('../utils/splitter');
const mergedHelper = require('../utils/merged-helper');

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
      mergedHelper.download(file.parts, req.user, res);
    }
    catch (error) {
      // console.log(error);
      res.status(400).send('Unable to download file');
    }
  })

  .post('/upload', authenticate, async (req, res) => {
    try {
      const busboy = new BusBoy({ headers: req.headers, highWaterMark: 16000 });
      const accounts = req.user.accounts.toObject();
      const tokens = await req.user.getTokensForAccounts(accounts);

      busboy.on('file', async (fieldname, file, name, encoding, mimeType) => {
        const ids = await splitter.splitFileAndUpload(tokens, file, Number(req.headers['x-filesize']), name);
        const parts = [];
        await accounts.forEach((account, i) => {
          parts.push({
            accountType: account.accountType,
            accountId: account._id,
            partId: ids[i],
          });
        });

        const splitDirectory = await req.user.getSplitDirectory();
        const splitFileId = await splitDirectory.addFile(name, Number(req.headers['x-filesize']), parts, mimeType);

        res.send({
          id: splitFileId.toString(),
          name,
          mimeType,
          modifiedTime: new Date().toISOString(),
          size: Number(req.headers['x-filesize']),
          accountType: 'merged',
          account: 'Merged',
        });
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

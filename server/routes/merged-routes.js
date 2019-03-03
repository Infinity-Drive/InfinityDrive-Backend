const BusBoy = require('busboy');
const express = require('express');

const { authenticate } = require('../middleware/authenticate');
const splitter = require('../utils/splitter');
const mergedHelper = require('../utils/merged-helper');

const router = express.Router();

router
  .get('/listFiles', authenticate, async (req, res) => {
    try {
      const mergedAccounts = await req.user.getMergedAccounts();
      const files = await mergedHelper.getFilesForAccount(mergedAccounts);

      await mergedAccounts.forEach((account, i) => {
        account.files = files[i];
      });
      res.send(mergedAccounts);
    } catch (error) {
      console.log(error);
      return res.status(400).send(error);
    }
  })

  .post('/upload', authenticate, async (req, res) => {
    try {
      const busboy = new BusBoy({ headers: req.headers });

      const mergedAccounts = await req.user.getMergedAccounts();

      if (mergedAccounts.length >= 2) {
        const tokens = await req.user.getTokensForAccounts(mergedAccounts);

        busboy.on('file', async (fieldname, file, name, encoding, mimeType) => {
          const ids = await splitter.splitFileAndUpload(tokens, file, req.headers['content-length'], name);
          const parts = [];
          await mergedAccounts.forEach((account, i) => {
            parts.push({
              accountType: account.accountType,
              accountId: account._id,
              partId: ids[i],
            });
          });

          const splitDirectory = await req.user.getSplitDirectory();
          const splitFileId = await splitDirectory.addFile(name, req.headers['content-length'], parts, mimeType);

          res.send({
            id: splitFileId.toString(),
            name,
            mimeType,
            modifiedTime: new Date().toISOString(),
            size: req.headers['content-length'],
            accountType: 'merged',
          });
        });

        req.pipe(busboy);
      } else {
        res.status(400).send('Two or more accounts need to merged in order to split upload!');
      }
    } catch (error) {
      res.status(400).send('Unable to split upload!');
      console.log(error);
    }
  });

module.exports = router;

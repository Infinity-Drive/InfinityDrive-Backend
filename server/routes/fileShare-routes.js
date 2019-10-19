const express = require('express');

const { authenticate } = require('../middleware/authenticate');
const { sharedFile: SharedFile } = require('../db/models/shared-file');

const router = express.Router();

router

  .post('/shareFile', authenticate, (req, res) => {
    SharedFile.find({ clientFileId: req.body.clientFileId }).then((doc) => {
      if (doc.length > 0) {
        const token = doc[0].sharedToken;
        res.send(token);
      }
      else {
        const newSharedFile = new SharedFile({
          clientFileId: req.body.clientFileId,
          accountId: req.body.accountId,
          userId: req.body.userId,
          accountType: req.body.accountType,
          fileName: req.body.fileName,
          fileSize: req.body.fileSize,
          fileType: req.body.fileType,
        });

        newSharedFile.save().then(() => newSharedFile.generateShareToken()).then((token) => {
          res.send(token);
        }, (err) => {
          res.status(400).send(err);
        });
      }
    }, (err) => {
      res.status(400).send(err);
    });
  })

  .get('/getsharedFile/:shareToken', (req, res) => {
    const token = req.params.shareToken;

    SharedFile.findByToken(token).then((file) => {
      // valid token but user not found
      if (!file) {
        return Promise.reject('File not found');
      }
      res.send(file);
    }).catch((e) => {
      res.status(404).send(e);
    });
  });

module.exports = router;

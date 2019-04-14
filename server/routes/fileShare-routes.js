const express = require('express');

const { authenticate } = require('../middleware/authenticate');
const { sharedFile } = require('../models/shared-file');
const router = express.Router();

router

  .post('/shareFile', authenticate, (req, res) => {

    sharedFile.find({ clientFileId: req.body.clientFileId }).then((doc) => {

      if (doc.length > 0) {
        token = doc[0].sharedToken;
        res.send(token)
      }
      else {
        const newSharefile = new sharedFile({ clientFileId: req.body.clientFileId, accountId: req.body.accountId, accountType: req.body.accountType, fileName: req.body.fileName, fileSize: req.body.fileSize, fileType: req.body.fileType });

        newSharefile.save().then(() => newSharefile.generateShareToken()).then((token) => {
          res.send(token);
        }, (err) => {
          res.status(400).send(err)
        })
      }

    }, (err) => {
      res.status(400).send(err)
    })
  })

  .get('/getsharedFile/:shareToken', (req, res) => {

    const token = req.params.shareToken;

    sharedFile.findByToken(token).then((file) => {
      // valid token but user not found
      if (!file) {
        return Promise.reject("File not found");
      }
      res.send(file)

    }).catch((e) => {
      res.status(404).send(e);
    });
  });

module.exports = router;
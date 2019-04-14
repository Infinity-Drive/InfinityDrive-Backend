const express = require('express');

const { authenticate } = require('../middleware/authenticate');
const { sharedFile } = require('../models/shared-file');
const router = express.Router();

router

  .post('/shareFile',authenticate, (req, res) => {

    const newSharefile = new sharedFile({ clientFileId: req.body.clientFileId, accountId: req.body.accountId, accountType : req.body.accountType});

    newSharefile.save().then(() => newSharefile.generateShareToken()).then((token) => {
        res.send(token);
    },(err)=>{
        res.status(400).send(err)
    })
  })

  module.exports = router;
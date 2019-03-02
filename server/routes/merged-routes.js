var BusBoy = require("busboy");

var { authenticate } = require('../middleware/authenticate');
const splitter = require('../utils/splitter');
const mergedHelper = require('../utils/merged-helper');

var express = require('express'),
    router = express.Router();

router

    .get('/listFiles', authenticate, async (req, res) => {

        try {
            var mergedAccounts = await req.user.getMergedAccounts();
            var files = await mergedHelper.getFilesForAccount(mergedAccounts);

            await mergedAccounts.forEach((account, i) => {
                account['files'] = files[i];
            });
            res.send(mergedAccounts);
        } catch (error) {
            console.log(error);
            return res.status(400).send(error);
        }
    })

    .post('/upload', authenticate, async (req, res) => {

        try {
            var busboy = new BusBoy({ headers: req.headers });

            var mergedAccounts = await req.user.getMergedAccounts();

            if (mergedAccounts.length >= 2) {
                const tokens = await req.user.getTokensForAccounts(mergedAccounts);

                busboy.on("file", async (fieldname, file, name, encoding, mimeType) => {
                    var ids = await splitter.splitFileAndUpload(tokens, file, req.headers['content-length'], name);
                    var parts = [];
                    await mergedAccounts.forEach((account, i) => {
                        parts.push({
                            accountType: account['accountType'],
                            accountId: account['_id'],
                            partId: ids[i]
                        })
                    });

                    var splitDirectory = await req.user.getSplitDirectory();
                    var splitFileId = await splitDirectory.addFile(name, req.headers['content-length'], parts);
                    
                    res.send({
                        id: splitFileId.toString(),
                        name,
                        mimeType,
                        modifiedTime: new Date().toISOString(),
                        size: req.headers['content-length'],
                        accountType: 'merged'
                    });
                });

                req.pipe(busboy);
            }
            else
                res.status(400).send('Two or more accounts need to merged in order to split upload!');

        } catch (error) {
            res.status(400).send('Unable to split upload!');
            console.log(error);
        }

    })

module.exports = router;

const express = require('express');
const _ = require('lodash');
const bodyParser = require('body-parser');

var { authenticate } = require('./middleware/authenticate');
const splitter = require('./utils/splitter');
const fs = require('fs');

var BusBoy = require("busboy");

const app = express();

app.use(bodyParser.json()); //body parser lets us send json to our server

gdriveRoutes = require('./routes/gdrive-routes.js');
userRoutes = require('./routes/user-routes.js');
dropboxRoutes = require('./routes/dropbox-routes.js');

app.use('/gdrive', gdriveRoutes);
app.use('/users', userRoutes);
app.use('/dropbox', dropboxRoutes);

app.get('/', (req, res) => {
    res.send('Welcome to Infinity Drive');
});

app.get("/splitUpload", (req, res) => {
    res.send("<form action='http://localhost:3000/splitUpload' method='post' enctype='multipart/form-data'><input type='file'/><input type='submit' value='Submit' /></form>");
});

app.post('/splitUpload', authenticate, async (req, res) => {

    try {
        var busboy = new BusBoy({ headers: req.headers });

        const accounts = await req.user.getAccounts();
        const mergedAccounts = _.filter(accounts, account => account.merged);

        if (mergedAccounts.length >= 2) {
            const tokens = await req.user.getTokensForAccounts(mergedAccounts);

            busboy.on("file", async (fieldname, file, filename, encoding, mimetype) => {
                await splitter.splitFileAndUpload(tokens, file, req.headers['content-length'], filename);
                res.send('File split and uploaded');
            });

            req.pipe(busboy);
        }
        else
            res.status(400).send('Two or more accounts need to merged in order to split upload!');

    } catch (error) {
        res.status(400).send('Unable to split upload!');
        console.log(error);
    }

});

app.listen('3000', () => {
    console.log('Server started');
});
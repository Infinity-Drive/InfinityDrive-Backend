const express = require('express');
const _ = require('lodash');
const bodyParser = require('body-parser');

var { authenticate } = require('./middleware/authenticate');
const splitter = require('./splitter');
const fs = require('fs');

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

app.get('/splitUpload', authenticate, (req, res) => {

        req.user.getAccounts().then((accounts) => {

            mergedAccounts = _.filter(accounts, account => account.merged);

            if (mergedAccounts.length >= 2)
                req.user.getTokensForAccounts(mergedAccounts).then( async (tokens) => {

                    var fileName = __dirname + '/a.rar';
                    var readStream = fs.createReadStream(fileName);
                    var stats = fs.statSync(fileName);
                    var fileSizeInBytes = stats["size"];

                    const fileIds = await splitter.splitFileAndUpload(tokens, readStream, fileSizeInBytes);

                    res.send(fileIds);

                });
            else
                res.status(400).send('Two or more accounts need to merged in order to split upload!');

        });

});

app.listen('3000', () => {
    console.log('Server started');
});
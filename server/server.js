const express = require('express');
const bodyParser = require('body-parser');

const gdriveRoutes = require('./routes/gdrive-routes.js');
const odriveRoutes = require('./routes/odrive-routes.js');
const dropboxRoutes = require('./routes/dropbox-routes.js');
const mergedRoutes = require('./routes/merged-routes.js');
const userRoutes = require('./routes/user-routes.js');
const filesShareRoutes = require('./routes/fileShare-routes');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(bodyParser.json()); // body parser lets us send json to our server

app.use((req, res, next) => { // this runs before each route
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'x-auth,x-filesize,Content-Type');
  res.setHeader('Access-Control-Expose-Headers', 'x-auth,Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

app.use('/gdrive', gdriveRoutes);
app.use('/odrive', odriveRoutes);
app.use('/dropbox', dropboxRoutes);
app.use('/merged', mergedRoutes);
app.use('/users', userRoutes);
app.use('/share', filesShareRoutes);

app.listen(PORT, () => console.log(`Listening on ${PORT}`));

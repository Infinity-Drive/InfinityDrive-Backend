const express = require('express');
const bodyParser = require('body-parser');

const gdriveRoutes = require('./routes/gdrive-routes.js');
const odriveRoutes = require('./routes/odrive-routes.js');
const dropboxRoutes = require('./routes/dropbox-routes.js');
const mergedRoutes = require('./routes/merged-routes.js');
const userRoutes = require('./routes/user-routes.js');

const app = express();
app.use(bodyParser.json()); // body parser lets us send json to our server

app.use((req, res, next) => { // this runs before each route
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
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

app.listen('3000', () => {
  console.log('Server started');
});

var mongoose = require('mongoose');

const { dbConnectionUrl } = require('../config/config');

mongoose.connect(dbConnectionUrl, { useNewUrlParser: true });
mongoose.set('useCreateIndex', true);

module.exports = { mongoose };

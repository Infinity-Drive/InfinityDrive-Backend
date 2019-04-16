const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

mongoose.connect('mongodb://localhost:27017/InfinityDrive', { useNewUrlParser: true });
mongoose.set('useCreateIndex', true);

const SharedFileSchema = new mongoose.Schema({

  clientFileId: {
    type: String,
  },
  accountId: {
    type: String,
  },
  userId: {
    type: String,
  },
  accountType: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
  },
  fileType: {
    type: String,
  },
  fileSize: {
    type: String,
  },
  sharedToken: {
    type: String,
  },
});


SharedFileSchema.methods.generateShareToken = function () {
  // this method run for a given fileShare object.
  // that is, we run after the doc has been inserted into the db
  const share = this; // we didnt use a cb function since we want to use 'this'
  const access = 'sharing';
  const token = jwt.sign({ _id: share._id.toHexString(), access }, 'my secret').toString();
  share.sharedToken = token;
  return share.save().then(() => token);
};

SharedFileSchema.statics.findByToken = function (token) {
  const Share = this;
  let decoded;

  try {
    decoded = jwt.verify(token, 'my secret');
  }
  catch (e) {
    return Promise.reject(e);
  }

  return Share.findOne({
    _id: decoded._id,
    sharedToken: token,
  });
};


const sharedFile = mongoose.model('SharedFile', SharedFileSchema);

module.exports = { sharedFile };

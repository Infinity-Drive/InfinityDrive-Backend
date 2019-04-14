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
  accountType: {
    type: String,
    required: true
  },
  sharedToken:{
    type: String
  }
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


const sharedFile = mongoose.model('shareFile', SharedFileSchema);

module.exports = { sharedFile };

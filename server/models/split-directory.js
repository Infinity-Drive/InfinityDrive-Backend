const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/InfinityDrive', { useNewUrlParser: true });
mongoose.set('useCreateIndex', true);

const SplitDirectorySchema = new mongoose.Schema({
  accountType: {
    type: String,
    default: 'merged',
  },
  account: {
    type: String,
    default: 'Merged',
  },
  name: {
    type: String,
    default: 'root',
  },
  folder: {
    type: Boolean,
    default: true,
  },
  size: { type: Number },
  content: [this],
  mimeType: { type: String },
  modifiedTime: { type: Date },
  parts: [
    {
      accountType: {
        type: String,
      },
      accountId: { // id of account where chunk is located
        type: mongoose.Schema.Types.ObjectId,
      },
      partId: { // id of chunk in service's drive
        type: String,
      },

    },
  ],

});

SplitDirectorySchema.methods.addFile = async function (name, size, parts, mimeType) {
  const directory = this;
  const id = new mongoose.Types.ObjectId();

  const newSplitFile = new SplitDirectory({
    _id: id,
    name,
    folder: false,
    size,
    mimeType,
    modifiedTime: new Date().toISOString(),
    parts,
  });

  directory.content.push(newSplitFile);

  await directory.save().catch((e) => {
    throw new Error('Error saving file');
  });

  return newSplitFile;
};

SplitDirectorySchema.methods.getFile = function (fileId) {
  const splitDirectory = this;

  const file = splitDirectory.content.toObject().filter(file => file._id.toString() === fileId);

  if (file) {
    return file[0];
  }
  return new Error('File not found');
};

SplitDirectorySchema.methods.removeFile = function (fileId) {
  const splitDirectory = this;

  return splitDirectory.updateOne({
    $pull: {
      content: {
        _id: mongoose.Types.ObjectId(fileId),
      },
    },
  });
};

const SplitDirectory = mongoose.model('SplitDirectory', SplitDirectorySchema);

module.exports = { SplitDirectory };

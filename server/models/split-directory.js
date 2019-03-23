const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/InfinityDrive', { useNewUrlParser: true });
mongoose.set('useCreateIndex', true);

const SplitDirectorySchema = new mongoose.Schema({

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

  directory.content.push(
    new SplitDirectory({
      _id: id,
      name,
      folder: false,
      size,
      mimeType,
      modifiedTime: new Date().toISOString(),
      parts,
    }),
  );

  await directory.save();
  return id;
};

const SplitDirectory = mongoose.model('SplitDirectory', SplitDirectorySchema);

module.exports = { SplitDirectory };

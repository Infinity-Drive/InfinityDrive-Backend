const odriveHelper = require('./odrive-helper.js');
const dropboxHelper = require('./dropbox-helper.js');
const gdriveHelper = require('./gdrive-helper');

const mergeFile = async (parts, user, writeStream) => {
  // get account id for each account that holds a part
  const accountIds = parts.map(part => part.accountId);
  // get tokens for each account that holds a part
  const tokens = await user.getTokensForAccounts(accountIds);
  // index of current part
  let index = 0;

  function getStream() {
    if (parts[index].accountType === 'gdrive') {
      return gdriveHelper.getDownloadStream(tokens[index], parts[index].partId);
    }

    if (parts[index].accountType === 'odrive') {
      return odriveHelper.getDownloadStream(tokens[index], parts[index].partId);
    }

    if (parts[index].accountType === 'dropbox') {
      return dropboxHelper.getDownloadStream(tokens[index], parts[index].partId);
    }
  }

  let currentStream = await getStream();
  currentStream.on('end', endListener);

  async function endListener() {
    if (index !== parts.length - 1) {
      // unpipe and destroy ended stream
      currentStream.unpipe(writeStream);
      currentStream.destroy();
      // get next stream
      index += 1;
      const newStream = await getStream();
      newStream.on('end', endListener);
      // if we are not piping the last stream, then we want to keep the write stream open
      if (index !== parts.length - 1) {
        console.log(`piping stream ${index}`);
        newStream.pipe(writeStream, { end: false });
      }
      // if we are piping the last stream, then we want to close the write stream after piping has ended
      else {
        console.log(`piping last stream ${index}`);
        newStream.pipe(writeStream);
      }
      currentStream = newStream;
    }
  }

  // start piping from first read stream
  console.log(`piping stream ${index}`);
  currentStream.pipe(writeStream, { end: false });
};

module.exports = { mergeFile };

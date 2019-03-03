const { PassThrough } = require('stream');

const gdriveHelper = require('./gdrive-helper');
const odriveHelper = require('./odrive-helper');
const dropboxHelper = require('./dropbox-helper');

const startUpload = (token, originalFileName, stream, index) => {
  const fileName = `${originalFileName}.infinitydrive.part${index}`;
  if (token.accountType === 'gdrive') {
    return gdriveHelper.upload(token, fileName, stream);
  }
  if (token.accountType === 'dropbox') {
    return dropboxHelper.upload(token, fileName, stream);
  }
  if (token.accountType === 'odrive') {
    return odriveHelper.upload(token, fileName, stream);
  }
};

const splitFileAndUpload = (tokens, readStream, fileSize, fileName) => new Promise((resolve) => {
  // size of current duplex stream
  let duplexStreamSize = 0;
  // index of current duplex stream
  let index = 0;
  const maxDuplexStreamSize = Math.ceil(fileSize / tokens.length);
  let totalRead = 0;
  const duplexStreams = [];
  // ids for each upload chunk
  const partsId = [];

  for (let i = 0; i < tokens.length; i += 1) {
    duplexStreams.push(new PassThrough());
  }

  readStream.on('data', async (chunk) => {
    duplexStreamSize += chunk.length;
    /**
     * totalRead is used to make sure that the below if stmt runs for
     * the last stream even if contains less data than maxWriteStreamSize
     */
    totalRead += chunk.length;

    if (duplexStreamSize > maxDuplexStreamSize) {
      // unpipe and destroy finished stream
      await readStream.unpipe(duplexStreams[index]);
      duplexStreams[index].end();
      await duplexStreams[index].destroy();

      // whole read stream not read
      if (totalRead !== fileSize) {
        // reset size for new stream
        duplexStreamSize = 0;
        // get next stream index
        index += 1;
        readStream.pipe(duplexStreams[index]);
        partsId[index] = startUpload(tokens[index], fileName, duplexStreams[index], index);
      }
    }
  });

  readStream.on('end', async () => {
    /**
     * since we've read the whole stream, we now wait for
     * each chunk to finish uploading and return its id
     */
    const ids = await Promise.all(partsId);
    resolve(ids);
  });

  readStream.pipe(duplexStreams[index]);
  partsId[index] = startUpload(tokens[index], fileName, duplexStreams[index], index);
});

module.exports = { splitFileAndUpload };

const { PassThrough } = require('stream');

const gdriveHelper = require('./gdrive-helper');
const odriveHelper = require('./odrive-helper');
const dropboxHelper = require('./dropbox-helper');

const startUpload = (token, originalFileName, stream, index, size) => {
  const fileName = `${originalFileName}.infinitydrive.part${index}`;
  if (token.accountType === 'gdrive') {
    return gdriveHelper.upload(token, fileName, stream);
  }
  if (token.accountType === 'dropbox') {
    return dropboxHelper.upload(token, fileName, stream);
  }
  if (token.accountType === 'odrive') {
    return odriveHelper.upload(token, fileName, stream, size);
  }
};

const splitFileAndUpload = (tokens, readStream, fileSize, fileName) => new Promise((resolve) => {
  // index of current duplex stream
  let index = 0;
  const chunksPerAccount = Math.ceil((fileSize / 16000) / tokens.length);
  let uploadedChunks = 0;
  let totalRead = 0;
  const duplexStreams = [];
  // ids for each upload chunk
  const partsId = [];

  for (let i = 0; i < tokens.length; i += 1) {
    duplexStreams.push(new PassThrough({ highWaterMark: 16000 }));
  }

  readStream.on('readable', function () {
    let chunk;

    // eslint-disable-next-line no-cond-assign
    while (chunk = this.read(16000)) {
      uploadedChunks += 1;
      totalRead += chunk.length;

      if (uploadedChunks === chunksPerAccount) {
        // unpipe and destroy finished stream
        readStream.unpipe(duplexStreams[index]);
        duplexStreams[index].end();

        index += 1;
        readStream.pipe(duplexStreams[index]);
        const uploadSize = index !== tokens.length - 1 ? chunksPerAccount * 16000 : fileSize - totalRead;

        partsId[index] = startUpload(tokens[index], fileName, duplexStreams[index], index, uploadSize);
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
  partsId[index] = startUpload(tokens[index], fileName, duplexStreams[index], index, chunksPerAccount * 16000);
});

module.exports = { splitFileAndUpload };

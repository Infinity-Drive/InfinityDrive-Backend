const { PassThrough } = require('stream');

const gdriveHelper = require('./gdrive-helper');
const odriveHelper = require('./odrive-helper');
const dropboxHelper = require('./dropbox-helper');

const splitFileAndUpload = (tokens, readStream, fileSize, fileName, chunksPerAccount) => new Promise((resolve) => {
  // index of current duplex stream
  let index = 0;
  let totalRead = 0;
  let chunksRead = 0;

  // ids for each uploaded chunk (holds promises)
  const partsId = [];
  const duplexStreams = [];

  tokens.forEach((token) => {
    duplexStreams.push(new PassThrough());
  });

  function startUpload() {
    const newFileName = `${fileName}.infinitydrive.part${index}`;
    // if we are uploading to the last account we need to specify upload
    // size as the remaining data, this is because our chunk division is
    // never perfect
    const uploadSize = index !== tokens.length - 1 ? chunksPerAccount[index] * 16000 : fileSize - totalRead;

    if (tokens[index].accountType === 'gdrive') {
      return gdriveHelper.upload(tokens[index], newFileName, duplexStreams[index]);
    }
    if (tokens[index].accountType === 'dropbox') {
      return dropboxHelper.upload(tokens[index], newFileName, duplexStreams[index]);
    }
    if (tokens[index].accountType === 'odrive') {
      return odriveHelper.upload(tokens[index], newFileName, duplexStreams[index], uploadSize);
    }
  }

  // https://nodejs.org/api/stream.html#stream_writable_write_chunk_encoding_callback
  function writeData(data, callback) {
    // due to backpressure, we weren't able to write the chunk so we
    // defer the callback until the stream is drained and chunk is written
    if (!duplexStreams[index].write(data)) {
      duplexStreams[index].once('drain', callback);
    }
    // no backpressure, so data has been written. we now call the callback
    else {
      process.nextTick(callback);
    }
  }

  function readData() {
    const chunk = readStream.read(16000);
    if (chunk != null) {
      writeData(chunk, () => {
        // this callback runs once a chunk has been written on the current duplex stream

        chunksRead += 1;
        totalRead += chunk.length;
        // totalRead == fileSize check ensures that we end and destroy the last duplex stream
        if (chunksRead === chunksPerAccount[index] || totalRead === fileSize) {
          // unpipe and destroy finished stream
          duplexStreams[index].end();
          duplexStreams[index].destroy();

          // whole read stream not read
          if (totalRead !== fileSize) {
            // reset number of read chunks for new stream
            chunksRead = 0;
            // get next stream index
            index += 1;
            partsId[index] = startUpload();
          }
        }
        // set readData() on start of next event loop, if we don't do this, node will
        // stop after a single chunk write because the event loop gets empty
        setImmediate(readData);
      });
    }
  }

  readStream.on('readable', readData);

  readStream.on('end', async () => {
    // since we've read the whole stream, we now wait for
    // each chunk to finish uploading and return its id
    const ids = await Promise.all(partsId);
    resolve(ids);
  });

  partsId[index] = startUpload();
});

module.exports = { splitFileAndUpload };

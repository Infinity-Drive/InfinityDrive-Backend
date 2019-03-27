const mergeFile = (readStreams, writeStream) => new Promise((resolve, reject) => {
  const streamCount = readStreams.length;
  // need a separate index for current stream being read, for loop counter would always point
  // to last index since for loop runs completely at first, registering all the listeners
  let currentStreamIndex = 0;

  // iterate over all streams to register end listeners
  for (let index = 0; index < streamCount; index += 1) {
    const stream = readStreams[index];

    // set end listeners for all streams apart from the last stream
    if (index !== streamCount - 1) {
      stream.on('end', () => {
        readStreams[currentStreamIndex].unpipe(writeStream);
        currentStreamIndex += 1;
        // check if next readStream is the last stream
        if (currentStreamIndex !== streamCount - 1) {
          console.log(`piping stream ${currentStreamIndex}`);
          readStreams[currentStreamIndex].pipe(writeStream, { end: false });
        }
        else {
          console.log(`piping last stream ${currentStreamIndex}`);
          readStreams[currentStreamIndex].pipe(writeStream);
        }
      });
    }
    // last stream end listener; want to resolve once last stream is read
    else {
      stream.on('end', () => {
        resolve();
      });
    }
  }

  // start piping from first read stream
  console.log(`piping stream ${currentStreamIndex}`);
  readStreams[0].pipe(writeStream, { end: false });
});

module.exports = { mergeFile };

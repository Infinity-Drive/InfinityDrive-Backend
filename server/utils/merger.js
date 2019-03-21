const merger = (readStreams, response) => new Promise((resolve, reject) => {
  const streamCount = readStreams.length;
  // need a separate index for current stream being read, for loop counter would always point
  // to last indexsince for loop runs completely at first, registering all the listeners
  let currentStreamIndex = 0;

  // iterate over all streams to register end listeners
  for (let index = 0; index < streamCount; index += 1) {
    const stream = readStreams[index];

    // set end listeners for all streams apart from the last stream
    if (index !== streamCount - 1) {
      stream.on('end', () => {
        readStreams[currentStreamIndex].unpipe(response);
        currentStreamIndex += 1;
        // check if readStream isn't the second last stream
        if (currentStreamIndex !== streamCount - 2) {
          readStreams[currentStreamIndex].pipe(response, { end: false });
        }
        else {
          readStreams[currentStreamIndex].pipe(response);
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
  readStreams[0].pipe(response, { end: false });
});

module.exports = { merger };

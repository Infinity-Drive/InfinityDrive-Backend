const gdriveHelper = require('./utils/gdrive-helper');
var { PassThrough } = require('stream');

splitFileAndUpload = async (tokens, readStream, fileSizeInBytes) => {

    var currentWriteStreamSize = 0;
    var currentStreamIndex = 0;
    var totalRead = 0;
    var writeStreams = [];
    var maxWriteStreamSize = Math.ceil(fileSizeInBytes / tokens.length);

    for (var i = 0; i < tokens.length; i++)
        writeStreams.push(new PassThrough());

    readStream.on('data', async (chunk) => {

        currentWriteStreamSize += chunk.length;
        totalRead += chunk.length;  //totalRead is used to make sure that the below if stmt runs for the last stream even if contains less data than maxWriteStreamSize

        if (currentWriteStreamSize > maxWriteStreamSize) {

            await readStream.unpipe(writeStreams[currentStreamIndex]); //unpipe and destroy finished stream
            writeStreams[currentStreamIndex].end();
            await writeStreams[currentStreamIndex].destroy();

            if (totalRead != fileSizeInBytes) {  //whole read stream not read

                currentWriteStreamSize = 0; //reset size for new stream
                currentStreamIndex++; //get next stream index

                console.log(`piping stream ${currentStreamIndex}`);

                readStream.pipe(writeStreams[currentStreamIndex]);

                if (tokens[currentStreamIndex].accountType == 'gdrive'){
                    console.log(await gdriveHelper.upload(tokens[currentStreamIndex], `.part${currentStreamIndex}`, writeStreams[currentStreamIndex]));
                }

            }

        }

    });

    readStream.pipe(writeStreams[currentStreamIndex]);
    if (tokens[currentStreamIndex].accountType == 'gdrive'){
        console.log(await gdriveHelper.upload(tokens[currentStreamIndex], `.part${currentStreamIndex}`, writeStreams[currentStreamIndex]));
    }

}

module.exports = { splitFileAndUpload }
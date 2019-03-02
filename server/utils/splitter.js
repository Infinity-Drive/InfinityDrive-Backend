const gdriveHelper = require('./gdrive-helper');
const odriveHelper = require('./odrive-helper');
const dropboxHelper = require('./dropbox-helper');
var { PassThrough } = require('stream');

splitFileAndUpload = (tokens, readStream, fileSize, fileName, response) => {

    return new Promise((resolve, reject) => {

        var duplexStreamSize = 0; //size of current duplex stream
        var index = 0;            //index of current duplex stream
        var maxDuplexStreamSize = Math.ceil(fileSize / tokens.length);
        var totalRead = 0;
        var duplexStreams = [];
        var partsId = [];         //ids for each upload chunk

        for (var i = 0; i < tokens.length; i++)
            duplexStreams.push(new PassThrough());

        readStream.on('data', async (chunk) => {

            duplexStreamSize += chunk.length;
            totalRead += chunk.length;  //totalRead is used to make sure that the below if stmt runs for the last stream even if contains less data than maxWriteStreamSize

            if (duplexStreamSize > maxDuplexStreamSize) {

                await readStream.unpipe(duplexStreams[index]); //unpipe and destroy finished stream
                duplexStreams[index].end();
                await duplexStreams[index].destroy();

                if (totalRead != fileSize) {  //whole read stream not read
                    duplexStreamSize = 0; //reset size for new stream
                    index++; //get next stream index
                    readStream.pipe(duplexStreams[index]);
                    partsId[index] = startUpload(tokens[index], fileName, duplexStreams[index], index);
                }

            }

        });

        readStream.on('end', async () => {
            //since we've read the whole stream, we now wait for each chunk to finish uploading and return its id
            var ids = await Promise.all(partsId);
            resolve(ids);
        });

        readStream.pipe(duplexStreams[index]);
        partsId[index] = startUpload(tokens[index], fileName, duplexStreams[index], index);

    });

}

var startUpload = (token, fileName, stream, index) => {
    var fileName = `${fileName}.infinitydrive.part${index}`;
    if (token.accountType === 'gdrive') {
        return gdriveHelper.upload(token, fileName, stream);
    }
    if (token.accountType === 'dropbox') {
        return dropboxHelper.upload(token, fileName, stream);
    }
    if (token.accountType === 'odrive') {
        return odriveHelper.upload(token, fileName, stream);
    }
}

module.exports = { splitFileAndUpload }
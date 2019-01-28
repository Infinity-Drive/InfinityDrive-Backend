const fs = require('fs');
const gdriveHelper = require('./utils/gdrive-helper');

splitFileAndUpload = (tokens, readStream, fileSizeInBytes, res, oAuth2Client_google) => {
    
    var currentWriteStreamSize = 0;
    var currentStreamIndex = 0;
    var totalRead = 0;
    var lastChunk = false;
    var writeStreams = [];
    var maxWriteStreamSize = Math.ceil(fileSizeInBytes / tokens.length);

    for (var i = 0; i < tokens.length; i++)
        writeStreams.push(fs.createWriteStream(`file${i}.bin`));
    
    readStream.on('data', async (chunk) => {

        currentWriteStreamSize += chunk.length;
        totalRead += chunk.length;  //totalRead is used to make sure that the below if stmt runs for the last stream even if contains less data than maxWriteStreamSize
        
        if(totalRead == fileSizeInBytes)
            lastChunk = true;

        if (currentWriteStreamSize > maxWriteStreamSize || lastChunk) {

            if (tokens[currentStreamIndex].accountType == 'gdrive')
                gdriveHelper.upload(oAuth2Client_google, `file${currentStreamIndex}`, writeStreams[currentStreamIndex], res, lastChunk);  //upload finished stream
            
            //else if (account.get(i) == 'onedrive')
            //

            //else
            //

            console.log(`unpiping stream ${currentStreamIndex} at ${currentWriteStreamSize}`);
            await readStream.unpipe(writeStreams[currentStreamIndex]); //unpipe and destroy finished stream
            await writeStreams[currentStreamIndex].destroy();

            if (!lastChunk){  //whole read stream not read

                currentWriteStreamSize = 0; //reset size for new stream
                currentStreamIndex ++; //get next stream index
                
                if (tokens[currentStreamIndex].accountType == 'gdrive')
                    oAuth2Client_google.setCredentials(tokens[currentStreamIndex]); //update token, i.e. set for different account

                console.log(`piping stream ${currentStreamIndex}`);
                readStream.pipe(writeStreams[currentStreamIndex]);
            }

            else {   //if all read, we want to stop piping
                readStream.destroy();
            }
           
        }

    });

    readStream.pipe(writeStreams[currentStreamIndex]);  //start piping in 1st writable stream
    oAuth2Client_google.setCredentials(tokens[currentStreamIndex]);    //set token for 1st account in 1st writable stream

}


module.exports = { splitFileAndUpload }

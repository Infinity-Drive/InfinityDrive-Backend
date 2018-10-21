const fs = require('fs');

splitFileAndUpload = (tokens, accounts, readStream, fileSizeInBytes, res, gd) => {
    
    var currentWriteStreamSize = 0;
    var currentStreamIndex = 0;
    var totalRead = 0;
    var lastChunk = false;
    var writeStreams = [];
    var maxWriteStreamSize = Math.ceil(fileSizeInBytes / accounts);

    for (var i = 0; i < accounts; i++)
        writeStreams.push(fs.createWriteStream(`file${i}.bin`));
    
    readStream.on('data', async (chunk) => {

        currentWriteStreamSize += chunk.length;
        totalRead += chunk.length;  //totalRead is used to make sure that the below if stmt runs for the last stream even if contains less data than maxWriteStreamSize
        
        if(totalRead == fileSizeInBytes)
            lastChunk = true;

        if (currentWriteStreamSize > maxWriteStreamSize || lastChunk) {

            //if(accounts.get(i) == 'gdrive')
            await gd.gdrive.upload(gd.oAuth2Client, gd.google, `file${currentStreamIndex}`, writeStreams[currentStreamIndex], writeStreams.length, res, lastChunk);  //upload finished stream
            
            //else if (account.get(i) == 'onedrive')
            //

            //else
            //

            console.log(`unpiping stream ${currentStreamIndex} at ${currentWriteStreamSize}`);
            await readStream.unpipe(writeStreams[currentStreamIndex]); //unpipe and destroy finished stream
            await writeStreams[currentStreamIndex].destroy();

            currentWriteStreamSize = 0; //reset size for new stream
            currentStreamIndex += 1; //get next stream index

            gd.oAuth2Client.setCredentials(tokens[currentStreamIndex]); //update token, i.e. set for different account

            if (!lastChunk){  //whole read stream not read
                console.log(`piping stream ${currentStreamIndex}`);
                readStream.pipe(writeStreams[currentStreamIndex]);
            }

            else {   //if all read, we want to stop piping
                readStream.destroy();
            }
           
        }

    });

    readStream.pipe(writeStreams[currentStreamIndex]);  //start piping in 1st writable stream
    gd.oAuth2Client.setCredentials(tokens[currentStreamIndex]);    //set token for 1st account in 1st writable stream

}


module.exports = { splitFileAndUpload }

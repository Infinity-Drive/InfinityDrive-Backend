const fs = require('fs');

var chunksUploaded = 0;


splitFileAndUpload = (tokens, noOfAccounts, readStream, fileSizeInBytes, oAuth2Client, google, res) => {
    
    var currentWriteStreamSize = 0;
    var currentStreamIndex = 0;
    var totalRead = 0;
    var writeStreams = [];
    var maxWriteStreamSize = Math.ceil(fileSizeInBytes / noOfAccounts);

    for (var i = 0; i < noOfAccounts; i++)
        writeStreams.push(fs.createWriteStream(`file${i}.bin`));
    
    readStream.on('data', async (chunk) => {

        currentWriteStreamSize += chunk.length;
        totalRead += chunk.length;  //totalRead is used to make sure that the below if stmt runs for the last stream even if contains less data than maxWriteStreamSize
        
        if (currentWriteStreamSize > maxWriteStreamSize || totalRead == fileSizeInBytes) {

            await upload(oAuth2Client, google, `file${currentStreamIndex}`, writeStreams[currentStreamIndex], writeStreams.length, res);  //upload finished stream
            
            console.log(`unpiping stream ${currentStreamIndex} at ${currentWriteStreamSize}`);
            await readStream.unpipe(writeStreams[currentStreamIndex]); //unpipe and destroy finished stream
            await writeStreams[currentStreamIndex].destroy();

            currentWriteStreamSize = 0; //reset size for new stream
            currentStreamIndex += 1; //get next stream index

            oAuth2Client.setCredentials(tokens[currentStreamIndex]); //update token, i.e. set for different account

            if (totalRead != fileSizeInBytes){  //whole read stream not read
                console.log(`piping stream ${currentStreamIndex}`);
                readStream.pipe(writeStreams[currentStreamIndex]);
            }

            else {   //if all read, we want to stop piping
                readStream.destroy();
            }
           
        }

    });

    readStream.pipe(writeStreams[currentStreamIndex]);  //start piping in 1st writable stream
    oAuth2Client.setCredentials(tokens[currentStreamIndex]);    //set token for 1st account in 1st writable stream

}

var upload = (auth, google, fileName, readStream, totalChunks, res) => {
    console.log(`uploading ${fileName}`);
    const drive = google.drive({ version: 'v3', auth });
    var fileMetadata = {
        'name': fileName
    };
    var media = {
        body: fs.createReadStream(`${fileName}.bin`)
    };
    drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id'
    }, function (err, file) {
        if (err) {
            console.error(err);
        } else {
            chunksUploaded++;
            if (chunksUploaded == totalChunks){
                res.render('upload-success.hbs', {chunksUploaded});
            }
            console.log('File Id: ', file.id);
        }
    });
}


module.exports = { splitFileAndUpload }

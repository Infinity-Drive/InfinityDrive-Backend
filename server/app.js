const fs = require('fs');

var noOfAccounts = 3;
var size = 0;
var currentStreamIndex = 0;
var writeStreams = [];
var fileName = 'a.mkv'

var stats = fs.statSync(fileName);
var fileSizeInBytes = stats["size"];
var streamSize = Math.ceil(fileSizeInBytes / noOfAccounts);
var readStream = fs.createReadStream(fileName);

for (var i = 0; i < noOfAccounts; i++)
    writeStreams.push(fs.createWriteStream(`file${i}.bin`));

readStream.on('data', async(chunk) => {
        
        size += chunk.length;
        
        if (size > streamSize){

            console.log(`unpiping stream ${currentStreamIndex} at ${size}`);

            await readStream.unpipe(writeStreams[currentStreamIndex]);
            await writeStreams[currentStreamIndex].destroy();

            size = 0;
            currentStreamIndex++;

            console.log(`piping stream ${currentStreamIndex}`);

            await readStream.pipe(writeStreams[currentStreamIndex]);

        }
});

readStream.pipe(writeStreams[currentStreamIndex]);
const fs = require('fs');

//var stats = fs.statSync("a.rar");
//var fileSizeInBytes = stats["size"];
//var streamSize = Math.ceil(fileSizeInBytes / 3);
var readStream = fs.createReadStream('file0.bin');
var readStream1 = fs.createReadStream('file1.bin');
var readStream2 = fs.createReadStream('file2.bin');

var dest=fs.createWriteStream('b.mkv');


// var Promises = require('promise');
var promise = new Promise(function (resolve, reject) {
    // do some async stuff
    
        readStream.pipe(dest,{end:false});
        readStream.on('end', () => {
            readStream.unpipe(dest);
            resolve("ab");
          });
        console.log("1");
         
});
promise.then(function (data) {
    // function called when first promise returned
    return new Promise(function (resolve, reject) {
        // second async stuff
        
            readStream1.pipe(dest,{end:false});
            readStream1.on('end', () => {
                resolve("ab");
              });
              console.log("2");
        
    });
}, function (reason) {
    // error handler
    console.log(reason);
}).then(function (data) {
    // second success handler
    readStream2.pipe(dest);

    readStream2.on('end',()=>{
        dest.end();
    })
    console.log("3");
}, function (reason) {
    console.log(reason);
    // second error handler
});


//var counter = 0;

// readStream.on('data', (chunk) => {
//     var writeStream = fs.createWriteStream(`file${counter}`);
//     writeStream.write(chunk);
//     counter++;
//     console.log("hello");
// });
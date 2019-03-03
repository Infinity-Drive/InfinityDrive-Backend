const fs = require('fs');

// var stats = fs.statSync("a.rar");
// var fileSizeInBytes = stats["size"];
// var streamSize = Math.ceil(fileSizeInBytes / 3);
const readStream = fs.createReadStream('file0.bin');
const readStream1 = fs.createReadStream('file1.bin');
const readStream2 = fs.createReadStream('file2.bin');

const dest = fs.createWriteStream('b.mkv');


// var Promises = require('promise');
const promise = new Promise(((resolve, reject) => {
  // do some async stuff

  readStream.pipe(dest, { end: false });
  readStream.on('end', () => {
    readStream.unpipe(dest);
    resolve('ab');
  });
  console.log('1');
}));
promise.then(data => new Promise(((resolve, reject) => {
  // second async stuff

  readStream1.pipe(dest, { end: false });
  readStream1.on('end', () => {
    resolve('ab');
  });
  console.log('2');
})),
(reason) => {
  // error handler
  console.log(reason);
}).then((data) => {
  // second success handler
  readStream2.pipe(dest);

  readStream2.on('end', () => {
    dest.end();
  });
  console.log('3');
}, (reason) => {
  console.log(reason);
  // second error handler
});


// var counter = 0;

// readStream.on('data', (chunk) => {
//     var writeStream = fs.createWriteStream(`file${counter}`);
//     writeStream.write(chunk);
//     counter++;
//     console.log("hello");
// });

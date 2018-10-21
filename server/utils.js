const fs = require('fs');

var getTokens = () => {

    return new Promise((resolve, reject) => {

        fs.readFile('tokens.json', (err, tokens) => {

            if (!err) {
                try{
                    tokens = JSON.parse(tokens);
                    resolve(tokens);
                }
                catch(err){
                    reject('Cant parse token file');
                }
            }   
            else
                reject('Tokens file doesn\'t exist');

        });
    });

};

module.exports = {getTokens}
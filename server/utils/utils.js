const fs = require('fs');

var getTokensData = () => {

    return new Promise((resolve, reject) => {

        fs.readFile('tokens.json', (err, tokensData) => {

            if (!err) {
                try {
                    tokensData = JSON.parse(tokensData);
                    resolve(tokensData);
                }
                catch (err) {
                    reject('Cant parse tokens file');
                }
            }
            else
                reject('Tokens file doesn\'t exist');

        });
    });

};

var getGdriveTokens = () => {

    return new Promise((resolve, reject) => {

        fs.readFile('tokens.json', (err, tokensData) => {

            if (!err) {
                try{
                    tokensData = JSON.parse(tokensData);
                    var gdriveTokens = tokensData.filter((tokenData) => tokenData.type === 'gdrive').map(td => td.token);
                    resolve(gdriveTokens);
                }
                catch(err){
                    reject('Cant parse tokens file');
                }
            }   
            else
                reject('Tokens file doesn\'t exist');

        });
    });

};

var saveToken = (token, service) => {

    return new Promise((resolve, reject) => {

        fs.readFile('tokens.json', (err, tokens) => {

            if (!err) {
                try {
                    tokens = JSON.parse(tokens);
                    tokens.push({type:service, token})
                    fs.writeFileSync('tokens.json', JSON.stringify(tokens));
                    resolve('Successfully updated tokens file!')
                }
                catch (err) {
                    reject('Cant parse tokens file');
                }
            }
            else{
                console.log('Tokens file doesn\'t exist, creating file');
                fs.writeFileSync('tokens.json', JSON.stringify([{ type: service, token }]));
                resolve('Successfully created tokens file!')
            }
        });
    });

};


module.exports = { getTokensData, getGdriveTokens, saveToken}
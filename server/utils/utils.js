const odriveInfo = require('./odrive-helper.js').getStorageInfo;
const dropboxInfo = require('./dropbox-helper.js').getStorageInfo;
const gdriveInfo = require('./gdrive-helper').getStorageInfo;

var setAccountStorage = (accounts) => {

    storageInfo = [];

    accounts.forEach( (account, i) => {

        if (account.accountType === 'gdrive') {
            storageInfo[i] = gdriveInfo(account.token);
            account['account'] = 'Google Drive';  
        }

        if (account.accountType === 'odrive') {
            storageInfo[i] = odriveInfo(account.token);
            account['account'] = 'OneDrive';
        }

        if (account.accountType === 'dropbox') {
            storageInfo[i] = dropboxInfo(account.token);
            account['account'] = 'Dropbox';
        }

        delete account['token'];

    });

    return Promise.all(storageInfo);

}

module.exports = { setAccountStorage }
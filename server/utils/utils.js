const odriveHelper = require('./odrive-helper.js');
const dropboxHelper = require('./dropbox-helper.js');
const gdriveHelper = require('./gdrive-helper');

var getAccountsStorage = (accounts) => {

    var storageInfo = [];

    accounts.forEach((account, i) => {

        if (account.accountType === 'gdrive') {
            storageInfo[i] = gdriveHelper.getStorageInfo(account.token);
            account['account'] = 'Google Drive';
        }

        if (account.accountType === 'odrive') {
            storageInfo[i] = odriveHelper.getStorageInfo(account.token);
            account['account'] = 'OneDrive';
        }

        if (account.accountType === 'dropbox') {
            storageInfo[i] = dropboxHelper.getStorageInfo(account.token);
            account['account'] = 'Dropbox';
        }

        delete account['token'];

    });

    return Promise.all(storageInfo);

}

var getMergedAccountFiles = (accounts) => {
    
    var files = [];

    accounts.forEach((account, i) => {

        if (account.accountType === 'gdrive') {
            files[i] = gdriveHelper.getFilesForAccount(account.token);
        }

        if (account.accountType === 'odrive') {
            files[i] = odriveHelper.getFilesForAccount(account.token);
        }

        if (account.accountType === 'dropbox') {
            files[i] = dropboxHelper.getFilesForAccount(account.token);
        }

        delete account['token'];
        
    });

    return Promise.all(files);

}
module.exports = { getAccountsStorage, getMergedAccountFiles }
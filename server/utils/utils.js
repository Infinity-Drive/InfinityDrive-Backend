const odriveInfo = require('./odrive-helper.js').getStorageInfo;
const dropboxInfo = require('./dropbox-helper.js').getStorageInfo;
const gdriveInfo = require('./gdrive-helper').getStorageInfo;

var standarizeFileData = (items, accountType) => {

    var standarizedItems = [];

    if (accountType === 'gdrive') {

        items.forEach(item => {

            if (item.mimeType === 'application/vnd.google-apps.folder')
                item['mimeType'] = 'folder';

            standarizedItems.push(item);

        });

    }

    if (accountType === 'odrive') {

        items.forEach(item => {
            //item has a file property if its a file and a folder property if its a folder
            item.file != undefined ? item['mimeType'] = item.file.mimeType : item['mimeType'] = 'folder';
            //dont need to send back file object since we're sending the mime type
            delete item.file;
            standarizedItems.push(item);
        });

    }

    if (accountType === 'dropbox') {

        items.entries.forEach(item => {
            //item has a file property if its a file and a folder property if its a folder
            if (item['.tag'] === 'folder')
                item['mimeType'] = 'folder'
            else
                item['mimeType'] = item.name.split('.')[1];
            //dont need to send back file object since we're sending the mime type

            standarizedItems.push({ id: item.id, name: item.name, mimeType: item['mimeType'] });
        });

    }

    return standarizedItems;
}

var setAccountStorage = async (accounts) => {

    await asyncForEach(accounts, async (account) => {

        if (account.accountType === 'gdrive') {
            account['storage'] = await gdriveInfo(account.token);
            account['account'] = 'Google Drive';
        }

        if (account.accountType === 'odrive') {
            account['storage'] = await odriveInfo(account.token);
            account['account'] = 'OneDrive';
        }

        if (account.accountType === 'dropbox') {
            account['storage'] = await dropboxInfo(account.token);
            account['account'] = 'Dropbox';
        }

        delete account['token'];

    });

    return accounts;

}


async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}


module.exports = { standarizeFileData, setAccountStorage }
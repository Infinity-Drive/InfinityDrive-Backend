const odriveHelper = require('./odrive-helper.js');
const dropboxHelper = require('./dropbox-helper.js');
const gdriveHelper = require('./gdrive-helper');

const getFilesForAccount = (accounts) => {
  const files = [];

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

    delete account.token;
  });

  return Promise.all(files);
};
module.exports = { getFilesForAccount };

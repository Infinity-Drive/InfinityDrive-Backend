const fs = require('fs');
const odriveHelper = require('./odrive-helper.js');
const dropboxHelper = require('./dropbox-helper.js');
const gdriveHelper = require('./gdrive-helper');
const merger = require('./merger');

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

const download = async (parts, req, response) => {
  const streams = [];

  // eslint-disable-next-line no-restricted-syntax
  for (const part of parts) {
    // eslint-disable-next-line no-await-in-loop
    const token = await req.user.getTokensForAccounts([part.accountId]);

    if (part.accountType === 'gdrive') {
      // eslint-disable-next-line no-await-in-loop
      streams.push(await gdriveHelper.getDownloadStream(token, part.partId));
    }
    if (part.accountType === 'odrive') {
      streams.push(await odriveHelper.getDownloadStream(token, part.partId));
    }
    if (part.accountType === 'dropbox') {
      streams.push(dropboxHelper.getDownloadStream(token, part.partId));
    }
  }

  merger.mergeFile(streams, fs.createWriteStream('./test.jpg'));
};

module.exports = { getFilesForAccount, download };

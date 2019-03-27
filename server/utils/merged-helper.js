const fs = require('fs');
const odriveHelper = require('./odrive-helper.js');
const dropboxHelper = require('./dropbox-helper.js');
const gdriveHelper = require('./gdrive-helper');
const merger = require('./merger');

const getFilesForAccount = async (accounts, user) => {
  const filePromises = [];

  accounts.forEach((account, i) => {
    if (account.accountType === 'gdrive') {
      filePromises[i] = gdriveHelper.getFilesForAccount(account.token);
    }

    if (account.accountType === 'odrive') {
      filePromises[i] = odriveHelper.getFilesForAccount(account.token);
    }

    if (account.accountType === 'dropbox') {
      filePromises[i] = dropboxHelper.getFilesForAccount(account.token);
    }

    delete account.token;
  });

  // wait for all requests to return
  const files = await Promise.all(filePromises).catch((e) => {
    throw new Error('Unable to get files for one or more accounts');
  });
  // attach files with each respective account
  accounts.forEach((account, i) => {
    account.files = files[i];
  });

  // get split files
  const splitDirectory = await user.getSplitDirectory();
  accounts.push({ accountType: 'merged', files: splitDirectory.content.toObject() });

  return accounts;
};

const download = async (parts, user, response) => {
  const streams = [];

  try {
    // get account id for each account that holds a part
    const accountIds = parts.map(part => part.accountId);
    // get tokens for each account that holds a part
    const tokens = await user.getTokensForAccounts(accountIds);

    parts.forEach((part, i) => {
      if (part.accountType === 'gdrive') {
        streams.push(gdriveHelper.getDownloadStream(tokens[i], part.partId));
      }
      if (part.accountType === 'odrive') {
        streams.push(odriveHelper.getDownloadStream(tokens[i], part.partId));
      }
      if (part.accountType === 'dropbox') {
        streams.push(dropboxHelper.getDownloadStream(tokens[i], part.partId));
      }
    });

    merger.mergeFile(await Promise.all(streams), response);
  }
  catch (error) {
    throw error;
  }
};

module.exports = { getFilesForAccount, download };

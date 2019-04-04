const odriveHelper = require('./odrive-helper.js');
const dropboxHelper = require('./dropbox-helper.js');
const gdriveHelper = require('./gdrive-helper');

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

const deleteParts = async (parts, user) => {
  const deletionPromises = [];

  try {
    // get account id for each account that holds a part
    const accountIds = parts.map(part => part.accountId);
    // get tokens for each account that holds a part
    const tokens = await user.getTokensForAccounts(accountIds);

    parts.forEach((part, i) => {
      if (part.accountType === 'gdrive') {
        deletionPromises.push(gdriveHelper.deleteItem(tokens[i], part.partId));
      }
      if (part.accountType === 'odrive') {
        deletionPromises.push(odriveHelper.deleteItem(tokens[i], part.partId));
      }
      if (part.accountType === 'dropbox') {
        deletionPromises.push(dropboxHelper.deleteItem(tokens[i], part.partId));
      }
    });

    return Promise.all(deletionPromises);
  }
  catch (error) {
    throw error;
  }
};

module.exports = { getFilesForAccount, deleteParts };

const _ = require('lodash');
const ObjectID = require('mongoose').Types.ObjectId;
const express = require('express');

const { User } = require('../models/user');
const { SplitDirectory } = require('../models/split-directory');
const { authenticate } = require('../middleware/authenticate');
const { getAccountsStorage } = require('../utils/utils');

const router = express.Router();

router

  .post('/', async (req, res) => {
    const body = _.pick(req.body, ['email', 'password', 'name']);

    const newUser = new User(body);
    let splitDirectory = new SplitDirectory({});
    splitDirectory = await splitDirectory.save();
    newUser.splitDirectoryId = splitDirectory.id;

    newUser.save().then(() => newUser.generateAuthToken()).then((token) => {
      res.header('x-auth', token).send(newUser);
    }).catch((err) => {
      res.status(400).send(err);
    });
  })

  .post('/login', async (req, res) => {
    try {
      const body = _.pick(req.body, ['email', 'password']);
      const user = await User.findByCredentials(body.email, body.password);
      const token = await user.generateAuthToken();
      res.header('x-auth', token).send(user);
    } catch (error) {
      res.status(401).send(error);
    }
  })

  .get('/getAccounts', authenticate, async (req, res) => {
    const accounts = req.user.accounts.toObject();
    if (accounts) {
      const values = await getAccountsStorage(accounts);
      accounts.forEach((account, i) => {
        account.storage = values[i];
      });
      res.send(accounts);
    } else {
      res.status(400).send('No accounts found');
    }
  })

  .patch('/manage/accounts/merge', authenticate, (req, res) => {
    try {
      // accountIds is an array that will hold the object ids of the accounts to be updated
      const body = _.pick(req.body, ['accountIds', 'status']);
      const msg = req.user.changeMergedStatus(body.accountIds, body.status);
      res.send(msg);
    } catch (error) {
      res.status(400).send(error);
    }
  })

  .delete('/remove/:accountId', authenticate, (req, res) => { // url param defined by :anyVarName
    const accountId = req.params.accountId;
    if (!ObjectID.isValid(accountId)) {
      return res.status(404).send('Account ID not valid!');
    }
    req.user.removeAccount(accountId).then(result => res.send(result)).catch(e => res.send(e));
  });

module.exports = router;

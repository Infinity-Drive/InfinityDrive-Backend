const { pick } = require('lodash');
const ObjectID = require('mongoose').Types.ObjectId;
const express = require('express');
const sgMail = require('@sendgrid/mail');

const { User } = require('../db/models/user');
const { SplitDirectory } = require('../db/models/split-directory');
const { authenticate } = require('../middleware/authenticate');
const { getAccountsStorage } = require('../utils/utils');
const { sharedFile: SharedFile } = require('../db/models/shared-file');

const router = express.Router();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

router

  .post('/', async (req, res) => {
    const body = pick(req.body, ['email', 'password', 'name']);

    const usrs = await User.find({ email: body.email });
    if (usrs.length > 0) {
      res.status(409).send('user already exsist');
    }
    else {
      const newUser = new User(body);
      let splitDirectory = new SplitDirectory({});
      splitDirectory = await splitDirectory.save();
      newUser.splitDirectoryId = splitDirectory.id;

      newUser.save().then(() => newUser.generateVerificationToken()).then((token) => {
        const frontEndUrl = process.env.FRONTEND_URI || 'http://localhost:4200';
        const msg = {
          to: body.email,
          from: 'support@infinitydrive.com',
          subject: 'Confirm signup for Infinity Drive',
          text: 'and easy to do anywhere, even with Node.js',
          html: `Hello,<br> Please click on the link to verify your email.\
          <br><a href=${frontEndUrl}/EmailVerification/${token}>Click here to verify</a>.<br>\
          If this account was not created by you, please <a href=${frontEndUrl}/AccountReport/${token}>report</a> it.`,
        };
        sgMail.send(msg).then(() => {
          res.end();
        }).catch((err) => {
          throw new Error('Error sending email');
        });
      }).catch((err) => {
        res.status(400).send(err);
      });
    }
  })

  .post('/login', async (req, res) => {
    try {
      const body = pick(req.body, ['email', 'password']);
      const user = await User.findByCredentials(body.email, body.password);
      console.log(user);
      const token = await user.generateAuthToken();
      res.header('x-auth', token).send(user);
    }
    catch (error) {
      res.status(401).send(error);
    }
  })

  .post('/verifyEmail', async (req, res) => {
    try {
      const token = req.body.token;
      // console.log(token)
      User.findByVerificationToken(token).then((user) => {
        // valid token but user not found
        if (!user) {
          return Promise.reject();
        }
        // console.log(user)
        user.verifyEmail(token).then(() => {
          res.status(200).send('Verified');
        }, (e) => {
          res.status(400).send(e);
        });
      }).catch((e) => {
        console.log(e);
        res.status(401).send('Not authorized');
      });
    }
    catch (error) {
      res.status(401).send(error);
    }
  })

  .post('/passwordReset', (req, res) => {
    try {
      const token = req.body.token;
      // console.log(token)
      User.findByResetToken(token).then((user) => {
        // valid token but user not found
        if (!user) {
          return Promise.reject();
        }
        user.changePassword(req.body.password).then((doc) => {
          console.log(doc);
          user.removeToken(token).then(() => {
            res.status(200).send('Password Changed');
          });
        }, (e) => {
          res.status(400).send(e);
        });
      }).catch((e) => {
        console.log(e);
        res.status(401).send('Not authorized');
      });
    }
    catch (error) {
      res.status(401).send(error);
    }
  })


  .post('/reportAccount', async (req, res) => {
    try {
      const token = req.body.token;
      // console.log(token)
      User.findByVerificationToken(token).then((user) => {
        // valid token but user not found
        if (!user) {
          return Promise.reject();
        }
        // console.log(user)
        User.deleteOne({ _id: user._id }).then(() => {
          res.status(200).send('Deleted');
        }, (e) => {
          res.status(400).send(e);
        });
      }).catch((e) => {
        console.log(e);
        res.status(401).send('Not authorized');
      });
    }
    catch (error) {
      res.status(401).send(error);
    }
  })


  .get('/getAccounts', authenticate, async (req, res) => {
    const accounts = req.user.accounts.toObject();

    try {
      if (accounts) {
        const storageValues = await getAccountsStorage(accounts);
        accounts.forEach((account, i) => {
          account.storage = storageValues[i];
        });
        res.send(accounts);
      }
      else {
        res.status(400).send('No accounts found');
      }
    }
    catch (error) {
      res.status(400).send(error);
    }
  })

  .post('/requestPasswordReset', async (req, res) => {
    const email = req.body.email;
    const frontEndUrl = process.env.FRONTEND_URI || 'http://localhost:4200';
    try {
      const user = await User.find({ email });
      if (user.length > 0) {
        const token = await user[0].generateResetToken();

        const msg = {
          to: req.body.email,
          from: 'support@infinitydrive.com',
          subject: 'Password Reset',
          text: 'and easy to do anywhere, even with Node.js',
          html: `Hello,<br> Please Click on the link to reset your password.<br><a href=${frontEndUrl}/ResetPassword/${token}>Click here to reset</a>`,
        };
        sgMail.send(msg).then(() => {
          res.send('Email sent');
        }).catch((err) => {
          throw new Error('Error sending email');
        });
      }
      else {
        res.status(400).send('No account found');
      }
    }
    catch (err) {
      res.status(400).send(err);
    }
  })

  .get('/sharedFiles', authenticate, (req, res) => {
    SharedFile.find({ userId: req.user._id }).then((doc) => {
      res.send(doc);
    }, (err) => {
      res.status(400).send(err);
    });
  })

  .delete('/deleteShared/:sharedId', authenticate, (req, res) => {
    SharedFile.deleteOne({ _id: req.params.sharedId, userId: req.user._id }).then(() => {
      res.status(200).send();
    }, (err) => {
      res.status(400).send(err);
    });
  })

  .delete('/remove/:accountId', authenticate, (req, res) => { // url param defined by :anyVarName
    const accountId = req.params.accountId;
    if (!ObjectID.isValid(accountId)) {
      return res.status(404).send('Account ID not valid!');
    }
    req.user.removeAccount(accountId).then(result => res.send(result))
      .catch(e => res.send(e));
  })

  .patch('/settings', authenticate, (req, res) => {
    req.user.settings = req.body.settings;
    req.user.save().then((user) => {
      res.status(200).send();
    }).catch((err) => {
      res.status(400).send('Error updating settings');
    });
  })

  .delete('/logout', authenticate, (req, res) => {
    req.user.removeToken(req.token).then(() => {
      res.status(200).send();
    }, () => {
      res.status(400).send();
    });
  });

module.exports = router;

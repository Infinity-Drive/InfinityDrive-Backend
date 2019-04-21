const { pick } = require('lodash');
const ObjectID = require('mongoose').Types.ObjectId;
const express = require('express');
const nodemailer = require('nodemailer');

const { User } = require('../models/user');
const { SplitDirectory } = require('../models/split-directory');
const { authenticate } = require('../middleware/authenticate');
const { getAccountsStorage } = require('../utils/utils');
const { emailCredentials } = require('../config/config');
const { sharedFile: SharedFile } = require('../models/shared-file');

const router = express.Router();

/*
    Here we are configuring our SMTP Server details.
    STMP is mail server which is responsible for sending and recieving email.
*/
const smtpTransport = nodemailer.createTransport({
  service: 'Gmail',
  auth: emailCredentials,
});
/* ------------------SMTP Over-----------------------------*/

router

  .post('/', async (req, res) => {
    const body = pick(req.body, ['email', 'password', 'name']);

    const newUser = new User(body);
    let splitDirectory = new SplitDirectory({});
    splitDirectory = await splitDirectory.save();
    newUser.splitDirectoryId = splitDirectory.id;

    newUser.save().then(() => newUser.generateVerificationToken()).then((token) => {
      // rand = Math.floor((Math.random() * 100) + 54);
      // host = req.get('host');
      // link = "http://" + req.get('host') + "/verify?id=" + rand;
      const verificationUrl = process.env.EMAIL_URI || 'http://localhost:4200/EmailVerification';
      const ReportUrl = process.env.Report_URI || 'http://localhost:4200/AccountReport';
      const mailOptions = {
        to: body.email,
        subject: 'Confirm signup for Infinity Drive',
        html: `Hello,<br> Please Click on the link to verify your email.<br><a href=${verificationUrl}/${token}>Click here to verify</a><br> If this account was not created by you Please <a href=${ReportUrl}/${token}>report</a> it`,
      };
      // console.log(mailOptions);
      smtpTransport.sendMail(mailOptions, (error, response) => {
        if (error) {
          console.log(error);
          res.status(400).send(error);
        }
        else {
          // console.log('Message sent');
          res.header('x-auth', token).send(newUser);
          res.end('sent');
        }
      });
    }).catch((err) => {
      res.status(400).send(err);
    });
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
          // console.log(doc)
          // user.removeToken(token).then(() => {
          //   res.status(200).send('Password Changed');
          // })
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

  .post('/requestPasswordReset', async (req, res)=>{
    const email = req.body.email;
    const ResetUrl = process.env.Password_URI || 'http://localhost:4200/ResetPassword';
    try{
        user =  await User.find({email});
        if(user.length > 0){
            const token = await user[0].generateResetToken();

            const mailOptions = {
              to: req.body.email,
              subject: 'password reset',
              html: `Hello,<br> Please Click on the link to reset your password.<br><a href=${ResetUrl}/${token}>Click here to reset</a>`,
            };
            smtpTransport.sendMail(mailOptions, (error, response) => {
              if (error) {
                console.log(error);
                res.status(400).send(error);
              }
              else {
                res.send('Email sent');
              }
            });


        }else{
          res.status(400).send('No account found')
        }
    }
    catch(err){
        res.status(400).send(err)
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

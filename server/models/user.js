const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const bcrypt = require('bcryptjs');

const { SplitDirectory } = require('./split-directory');

mongoose.connect('mongodb://localhost:27017/InfinityDrive', { useNewUrlParser: true });
mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);

const UserSchema = new mongoose.Schema({
  verficationToken: { type: String },

  name: {
    type: String,
    minlength: 1,
    trim: true,
  },

  email: {
    type: String,
    required: true,
    minlength: 1,
    trim: true,
    // this ensures that only unqiue emails (that don't exist in the db can be added)
    unique: true,
    validate: {
    // validator expects a fuction that will either return true or false
      validator: validator.isEmail,
      message: '{VALUE} is not a valid email',
    },
  },

  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  tokens: [{
    access: {
      type: String,
      required: true,
    },

    token: {
      type: String,
      required: true,
    },
  }],

  accounts: [{
    merged: {
      type: Boolean,
      default: false,
    },

    accountType: {
      type: String,
    },

    token: {
      type: Object,
    },

    email: {
      type: String,
    },
  }],

  splitDirectoryId: { type: mongoose.Schema.Types.ObjectId },
});

// overriding built in method (we want user to only get limited info back)
UserSchema.methods.toJSON = function () {
  const user = this;
  // mongoose object to java script obj
  const userObject = user.toObject();
  // dont send security related data back to user
  return _.pick(userObject, ['_id', 'email', 'name']);
};

// can add any instance method we like. We have added this method
// to save the token in the database and return it to server.js
UserSchema.methods.generateAuthToken = function () {
  // this method run for a given user object.
  // that is, we run after the doc has been inserted into the db
  const user = this; // we didnt use a cb function since we want to use 'this'
  const access = 'auth';
  const token = jwt.sign({ _id: user._id.toHexString(), access }, 'my secret').toString();

  // user.tokens.concat([{access, token}]); //concat into the tokens array
  user.tokens.push({ access, token });

  return user.save().then(() => token);
};


UserSchema.methods.generateVerificationToken = function () {
  // this method run for a given user object.
  // that is, we run after the doc has been inserted into the db
  const user = this; // we didnt use a cb function since we want to use 'this'
  const access = 'verification';
  const token = jwt.sign({ _id: user._id.toHexString(), access }, 'my secret').toString();

  // user.tokens.concat([{access, token}]); //concat into the tokens array
  user.tokens.push({ access, token });

  return user.save().then(() => token);
};

UserSchema.methods.verifyEmail = function (token) {
  // this method run for a given user object.
  const user = this; // we didnt use a cb function since we want to use 'this'
  user.isVerified = true;
  //user.tokens.pull({token});
  return user.save().then(() => token);
};


UserSchema.methods.addAccount = function (token, accountType, email) {
  return new Promise((resolve, reject) => {
    const user = this;
    let alreadyAdded = false;

    user.accounts.forEach((account) => {
      if (account.email === email && account.accountType === accountType) {
        alreadyAdded = true;
      }
    });

    if (alreadyAdded) {
      reject('Account already exists');
    }
    else {
      user.accounts.push({ accountType, token, email });
      // we're returning this promise so that we can catch it in server.js using a chained promise
      user.save().then(() => {
        resolve(user.accounts);
      });
    }
  });
};

// get token for multiple/single account(s)
UserSchema.methods.getTokensForAccounts = function (accountIds) {
  const user = this;
  const tokens = [];

  return new Promise((resolve, reject) => {
    // if object id of an ADDED ACCOUNT is same as passed ID
    accountIds.forEach((accountId) => {
      if (user.accounts.id(accountId)) {
        // get current account token
        const token = user.accounts.id(accountId).token;

        // need to add accountType in an individual token when
        // we have multiple tokens but don't know of which account
        token.accountType = user.accounts.id(accountId).accountType;
        tokens.push(token);
      }
      else {
        return reject('One or more account ids was not found!');
      }
    });

    // if only one account id was passed, directly return the token
    // instead of returning an array containing a single object
    if (accountIds.length === 1) {
      return resolve(tokens[0]);
    }
    // multiple account ids passed so we will have multiple tokens
    resolve(tokens);
  });
};

UserSchema.methods.changeMergedStatus = function (accountIds, status) {
  const user = this;
  let error = false;

  return new Promise((resolve, reject) => {
    accountIds.forEach((accountId) => {
      if (user.accounts.id(accountId)) {
        const account = user.accounts.id(accountId);
        account.merged = status;
      }
      else {
        error = true;
      }
    });

    // we only update the accounts, if we were able to find all accounts
    if (!error) {
      user.save().then(() => resolve('Updated accounts!'), (e) => {
        reject(e);
      });
    }
    else {
      reject('One or more account ids was incorrect!');
    }
  });
};


UserSchema.methods.removeToken = function (token) {
  const user = this;
  return user.updateOne({
    // pull operator lets us pull out a wanted object
    $pull: {
      // pull from token array the token object with the same properties as the token passed
      // into the method
      tokens: {
        // whole token object is remove
        token,
      },
    },
  });
};

UserSchema.methods.removeAccount = function (accountId) {
  const user = this;

  if (!(user.accounts.id(accountId))) {
    return Promise.reject('Account not found!');
  }

  if (user.accounts.id(accountId).merged) {
    return Promise.reject('Cannot remove a merged account!');
  }

  return user.updateOne({
    $pull: {
      accounts: {
        _id: accountId,
      },
    },
  });
};

UserSchema.methods.getSplitDirectory = async function () {
  const user = this;
  const directory = await SplitDirectory.findOne({ _id: user.splitDirectoryId });

  if (directory) {
    return directory;
  }

  const newSplitDirectory = new SplitDirectory({});
  user.splitDirectoryId = newSplitDirectory._id;
  await user.save();
  return newSplitDirectory.save();
};

// define Model method (not an instance method like generateAuthToken), i.e. static method
UserSchema.statics.findByToken = function (token) {
  const User = this;
  let decoded;

  try {
    decoded = jwt.verify(token, 'my secret');
  }
  catch (e) {
    return Promise.reject();
  }

  return User.findOne({ // find user against the given token
    _id: decoded._id,
    'tokens.token': token, // quotes are required when we have a . in the value
    'tokens.access': 'auth',
  }); // since we're returning this, the promise can be caught in server.js
};

// define Model method (not an instance method like generateAuthToken), i.e. static method
UserSchema.statics.findByVerificationToken = function (token) {
  const User = this;
  let decoded;

  try {
    decoded = jwt.verify(token, 'my secret');
  }
  catch (e) {
    return Promise.reject();
  }

  return User.findOne({ // find user against the given token
    _id: decoded._id,
    'tokens.token': token, // quotes are required when we have a . in the value
    'tokens.access': 'verification',
  }); // since we're returning this, the promise can be caught in server.js
};

UserSchema.statics.findByCredentials = function (email, password) {
  const User = this;

  return User.findOne({ email:email , isVerified: true}).then((user) => {
    if (!user) {
      return Promise.reject();
    }

    // we're defining a new promise here since bcrypt doesn't support promises
    return new Promise((resolve, reject) => {
      bcrypt.compare(password, user.password, (err, res) => {
        if (res) {
          resolve(user);
        }
        else {
          reject();
        }
      });
    });
  });
};

// mongoose middleware, this is going to run before save is called
UserSchema.pre('save', function (next) {
  const user = this;

  // checking to see if password is already hashed
  if (user.isModified('password')) {
    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(user.password, salt, (err, hash) => {
        user.password = hash;
        next();
      });
    });
  }
  else {
    next();
  }
});

const User = mongoose.model('User', UserSchema);

module.exports = { User };

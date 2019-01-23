const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/InfinityDrive', {useNewUrlParser: true});
mongoose.set('useCreateIndex', true);

var UserSchema = new mongoose.Schema({
    verficationToken: {type: String},

    name: {
        type: String,
        minlength: 1,
        trim: true
    },
    
    email: {
        type: String,
        required: true,
        minlength: 1,
        trim: true,
        unique: true,                               //this ensures that only unqiue emails (that don't exist in the db can be added)
        validate: {
            validator : validator.isEmail,          //validator expects a fuction that will either return true or false
            message: "{VALUE} is not a valid email"
        }
    },

    password: {
        type: String,
        required: true,
        minlength: 6
    },

    tokens: [{
        access: {
            type: String,
            required: true
        },

        token: {
            type: String,
            required: true
        }
    }],

    accounts: [{   
        merged: { 
            type: Boolean,
            default: false
        },

        accountType: {
            type: String
        },

        token: {
            type: Object
        },

        email: {
            type: String
        }
    }],

    splitDirectoryId: {type: String}
});

UserSchema.methods.toJSON = function () {    //overriding built in method (we want user to only get limited info back)
    var user = this;
    var userObject = user.toObject(); //mongoose object to java script obj
    
    return _.pick(userObject, ['_id', 'email']);    //dont send security related data back to user
};

UserSchema.methods.generateAuthToken = function () {    //can add any instance method we like. We have added this method to save the token in the database and return it to server.js 
    //this method run for a given user object. that is, we run after the doc has been inserted into the db
    var user = this; //we didnt use a cb function since we want to use 'this'
    var access = 'auth';
    var token = jwt.sign({_id: user._id.toHexString(), access}, 'my secret').toString();

    //user.tokens.concat([{access, token}]); //concat into the tokens array
    user.tokens.push({access, token});

    return user.save().then(() => {     //we're returning this promise so that we can catch it in server.js using a chained promise
        return token;
    });
};

UserSchema.methods.addAccount = function (token, accountType, email) {

    return new Promise((resolve, reject) => {

        var user = this; 
        var alreadyAdded = false;

        // need to add accountType in an individual token when we have multiple tokens but don't know of which account
        token['accountType'] = accountType;

        user.accounts.forEach(function(account) {
            if(account.email === email && account.accountType === accountType)
                alreadyAdded = true;
        });

        if(alreadyAdded){
            reject('Account already exists');
        }

        else{
            user.accounts.push({accountType, token, email});

            user.save().then(() => {     //we're returning this promise so that we can catch it in server.js using a chained promise
                resolve(user.accounts);
            });
        }

    });
    
};

UserSchema.methods.getAccounts = function () {
    var user = this;
    
    return new Promise((resolve, reject) => {

        // omit the account token for security

        if(user.accounts.length != 0){
            accounts = _.map(user.accounts, account => {
                return _.omit(account.toObject(), ['token']);
            });
        
            return resolve(accounts);
        }
        
        reject('No account found!');
    });

};

// get token for multiple/single account(s)
UserSchema.methods.getTokensForAccounts = function (accountIds) {
    var user = this;
    var tokens = [];
    
    return new Promise((resolve, reject) => {

        // if object id of an ADDED ACCOUNT is same as passed ID
        accountIds.forEach(accountId => {
            
            if(user.accounts.id(accountId))
                tokens.push(user.accounts.id(accountId).token);
    
            else
                return reject('One or more account ids was incorrect!');

        });

        // if only one account id was passed, directly return the token instead of returning an array containing a single object
        if(accountIds.length == 1) 
            return resolve(tokens[0]);
        // multiple account ids passed so we will have multiple tokens
        else
            resolve(tokens);
        
    });

};

UserSchema.methods.changeMergedStatus = function (accountIds, status) {
    var user = this;
    var error = false;
    
    return new Promise((resolve, reject) => {
        
        accountIds.forEach(accountId => {
            
            if(user.accounts.id(accountId)){
                var account = user.accounts.id(accountId);
                account.merged = status;
            }
    
            else
                error = true;

        });

        // we only update the accounts, if we were able to find all accounts
        if(!error) 
            user.save().then(() => {
                return resolve('Updated accounts!');
            }, (e) => {
                reject(e);
            });
        
        else
            reject('One or more account ids was incorrect!');
        
    });

};


UserSchema.methods.removeToken = function (token) {
    var user = this;

    return user.update({
        $pull: {    //pull operator lets us pull out a wanted object 
            tokens: {   //pull from token array the token object with the same properties as the token passed into the method
                token : token   //whole token object is remove
            }
        }
    });
};

//define Model method (not an instance method like generateAuthToken), i.e. static method
UserSchema.statics.findByToken = function(token) {
    var User = this;
    var decoded;

    try{
       decoded = jwt.verify(token, 'my secret');
    }
    catch(e) {  //if theres a problem, we will return a promise that is caught by server.js
        // return new Promise((resolve, reject) => {
        //     reject();
        // }); 
        // same but much simpler syntax
        return Promise.reject(); //any argument in reject will be used as err message by catch
    }

    return User.findOne({   //find user against the given token
        '_id': decoded._id,
        'tokens.token': token,  //quotes are required when we have a . in the value
        'tokens.access': 'auth'
    }); //since we're returning this, the promise can be caught in server.js
};


UserSchema.statics.findByCredentials = function (email, password) {

    var User = this;

    return User.findOne({email}).then((user) => {

        if(!user)
        return Promise.reject();

        return new Promise((resolve, reject) => {   //we're defining a new promise here since bcrypt doesn't support promises

            bcrypt.compare(password, user.password, (err, res) => {
                
                if(res)
                resolve(user);

                else
                reject();
                
            });

        });

    });

};

UserSchema.pre('save', function(next) {   //mongoose middleware, this is going to run before save is called

    var user = this;
    
    if(user.isModified('password')){    //checking to see if password is already hashed

        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(user.password, salt, (err, hash) => {
                user.password = hash;
                next();
            });
        });
    }
       
    else{
        next();
    }
});    

var User = mongoose.model('User', UserSchema);

module.exports = {User};
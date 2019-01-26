const _ = require('lodash');

var {User} = require('../models/user');
var {authenticate} = require('../middleware/authenticate');

var express = require('express'),
    router = express.Router();

router

    .post('/', (req, res) => {

        var body = _.pick(req.body, ['email', 'password']);

        var newUser = new User(body);

        newUser.save().then(() => {
            return newUser.generateAuthToken();    //catched by *** then call (right below this)
            //res.send(user);
        }).then((token) => {             // ***
            res.header('x-auth', token).send(newUser);    //when we set a 'x-' header it means we're creating a custom header 
        }).catch((err) => {
            res.status(400).send(err);
        });

    })

    .post('/login', (req, res) => {

        var body = _.pick(req.body, ['email', 'password']);

        User.findByCredentials(body.email, body.password).then((user) => {
            return user.generateAuthToken().then((token) => {
                res.header('x-auth', token).send(user);
            });
        }).catch((err) => {
            res.status(400).send();
        });

    })

    .get('/getAccounts', authenticate, (req, res) => {
        req.user.getAccounts().then((accounts) => res.send(accounts), (err) => res.send(err));
    })

    .post('/manage/accounts/merge', authenticate, (req, res) => {
        // accountIds is an array that will hold the object ids of the accounts to be updated
        var body = _.pick(req.body, ['accountIds', 'status']);
        req.user.changeMergedStatus(body.accountIds, body.status).then((msg) => res.send(msg), (err) => res.send(err));
    })


module.exports = router;
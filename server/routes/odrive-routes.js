const express = require('express');
const graphHelper = require('../utils/graph-helper');
const passport = require('passport');
const OIDCStrategy = require('passport-azure-ad').OIDCStrategy;
const uuid = require('uuid');
const session = require('express-session');
const config = require('../utils/config.js');

const app = express();
app.set('view engine', 'hbs');

// authentication setup
const callback = (iss, sub, profile, accessToken, refreshToken, done) => {
    done(null, {
        profile,
        accessToken,
        refreshToken
    });
};

passport.use(new OIDCStrategy(config.creds, callback));

// session middleware configuration
// see https://github.com/expressjs/session
app.use(session({
    secret: '12345QWERTY-SECRET',
    name: 'graphNodeCookie',
    resave: false,
    saveUninitialized: false,
    //cookie: {secure: true} // For development only
}));

app.use(passport.initialize());
app.use(passport.session());

const users = {};
passport.serializeUser((user, done) => {
    const id = uuid.v4();
    users[id] = user;
    done(null, id);
});
passport.deserializeUser((id, done) => {
    const user = users[id];
    done(null, user);
});

// Get the home page.
app.get('/', (req, res) => {
    // check if user is authenticated
    if (!req.isAuthenticated()) {
        res.render('onedrive-login.hbs');
    } else {
        renderDriveTest(req, res);
    }
});

// Authentication request.
app.get('/login',    //this calls the token route below
    passport.authenticate('azuread-openidconnect', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('/');
    });

// Authentication callback.
// After we have an access token, get user data and load the sendMail page.
app.get('/token', passport.authenticate('azuread-openidconnect', { failureRedirect: '/' }), (req, res) => {
        
    
    
        graphHelper.getDriveInfo(req.user.accessToken, (err, drive) => {
            if (!err) {
                graphHelper.getFiles(req.user.accessToken, (err, files) => {
                    if (!err) {
                        res.render('onedrive-files.hbs', { driveInfo: JSON.stringify(drive.body), files: JSON.stringify(files.body) })
                    }
                    else {
                        renderError(err, res);
                    }
                });
            } else {
                renderError(err, res);
            }
        });
    });


function renderDriveTest(req, res) {
    graphHelper.getDriveInfo(req.user.accessToken, (err, drive) => {
        if (!err) {
            res.render('onedrive-files.hbs', { driveInfo: JSON.stringify(drive.body) })
            //renderDriveTest(req, res);
        } else {
            renderError(err, res);
        }
    });
}

app.get('/disconnect', (req, res) => {
    req.session.destroy(() => {
        req.logOut();
        res.clearCookie('graphNodeCookie');
        res.status(200);
        res.redirect('/');
    });
});

app.listen(3000, () => {console.log('Server started')})
var {User} = require('./../models/user');

/*
authenticate middleware makes the route private because it searches for a user in our database 
that matches the token sent in the request header. A user only receives 
a token once they've logged in, so if we find a token in our database that matches, 
we know the user is logged in and we can then proceed with sending them to the route handler.
*/

var authenticate = (req, res, next) => {    //defining a middleware
    
    token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1YzBjYjdjZTc5MTQ3OTEyZGNiYTM0OTUiLCJhY2Nlc3MiOiJhdXRoIiwiaWF0IjoxNTQ0MzM3NDgyfQ.vF64Nuys9vcxtW9a1JNOXJMxbL02vA_FBbjcONN4vDg';
    
    //CHANGE THIS FOR SECURitY
    // var token = req.header('x-auth'); //get token set by POST /users
    
    User.findByToken(token).then((user) => {

        if(!user)   //valid token but user not found
            return Promise.reject(); //catch will run

        req.user = user;
        req.token = token;
        next(); //need to call next otherwise code in GET /users/me wont ever execute

    }).catch((e) => {
        res.status(401).send();
    });
}

module.exports = {authenticate};
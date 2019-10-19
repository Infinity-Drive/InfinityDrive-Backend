const { User } = require('../db/models/user');

/**
 * authenticate middleware makes the route private because it searches for a user in our database
 * that matches the token sent in the request header. A user only receives
 * a token once they've logged in, so if we find a token in our database that matches,
 * we know the user is logged in and we can then proceed with sending them to the route handler.
 */

const authenticate = (req, res, next) => {
  // get token set by POST /users
  const token = req.header('x-auth');
  // console.log(token)
  User.findByToken(token).then((user) => {
    // valid token but user not found
    if (!user) {
      return Promise.reject();
    }

    req.user = user;
    req.token = token;
    next(); // need to call next otherwise code in GET /users/me wont ever execute
  }).catch((e) => {
    res.status(401).send('Not authorized');
  });
};

module.exports = { authenticate };

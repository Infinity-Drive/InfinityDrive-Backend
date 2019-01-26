var fetch = require('isomorphic-fetch');

const config = {
  fetch: fetch,
  clientId: 'zxj96cyp7qvu5fp',
  clientSecret: 'nennum8mk99tvoi'
};

const Dropbox = require('dropbox').Dropbox;
var dbx = new Dropbox(config);

const redirectUri = `http://localhost:3000/dropbox/saveToken`;

var getAuthorizationUrl = () => {
  return dbx.getAuthenticationUrl(redirectUri, null, 'code')
}

var saveToken = (req, res, user) => {

  let code = req.query.code;
  console.log(code);

  var options = Object.assign({
    code,
    redirectUri
  }, config);

  dbx.getAccessTokenFromCode(redirectUri, code)
    .then(function (token) {

      user.addAccount({ 'access_token': token }, 'dropbox', 'email').then((accounts) => {
        res.send(user.accounts);
      }, (err) => res.send(err));

    })
    .catch(function (error) {
      res.send(error);
    });
}

var getFilesForAccount = (token) => {

  var dbx = new Dropbox({ accessToken: token.access_token, fetch: fetch });

  return new Promise((resolve, reject) => {

    dbx.filesListFolder({ path: '' })

      .then(function (response) {
        return resolve(response);
      })

      .catch(function (error) {
        reject(error);
      });

  })

}

module.exports = { getAuthorizationUrl, saveToken, getFilesForAccount }
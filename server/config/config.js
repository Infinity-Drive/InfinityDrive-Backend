module.exports = {
  odriveCreds: {
    redirectUrl: 'http://localhost:3000/token',
    clientID: '399390b3-77f1-4245-ad94-9dfb90272f24',
    clientSecret: 'ghhTASU77-%jxzrQLN005~_',
    identityMetadata: 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
    allowHttpForRedirectUrl: true, // For development only
    responseType: 'code',
    validateIssuer: false, // For development only
    responseMode: 'query',
    scope: ['User.Read', 'Mail.Send', 'Files.ReadWrite']
  },

  gdriveCreds: {
    client_id: '651431583012-j0k0oent5gsprkdimeup45c44353pb35.apps.googleusercontent.com',
    client_secret: '9aRhiRYg7Va5e5l6Dq-x5VFL',
    redirect_uri: 'http://localhost:4200/Dashboard'
  }

};

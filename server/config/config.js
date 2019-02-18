module.exports = {
  odriveCreds: {
    redirectUrl: 'http://localhost:4200/Dashboard',
    clientID: '399390b3-77f1-4245-ad94-9dfb90272f24',
    clientSecret: 'ghhTASU77-%jxzrQLN005~_',
    responseType: 'code',
    responseMode: 'query',
    scope: ['User.Read', 'Files.ReadWrite.All', 'offline_access']
  },

  gdriveCreds: {
    client_id: '651431583012-j0k0oent5gsprkdimeup45c44353pb35.apps.googleusercontent.com',
    client_secret: '9aRhiRYg7Va5e5l6Dq-x5VFL',
    redirect_uri: 'http://localhost:4200/Dashboard'
  },

  dropboxCreds: {
    clientId: 'zxj96cyp7qvu5fp',
    clientSecret: 'nennum8mk99tvoi',
    redirectUri: 'http://localhost:4200/Dashboard'
  }

};

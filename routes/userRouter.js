const path = require('path')
const userCtr = require(path.resolve('./controllers/userCtr'))
const passport = require('passport')

const requireAuth = passport.authenticate('jwt', { session: false });
const requireLogin = passport.authenticate('local', { session: false });

module.exports = (app) => {
    app.post('/api/login', userCtr.login)
    app.post('/api/register', userCtr.register)
    app.post('/api/adduser', userCtr.adduser)
    app.get('/api/login', requireAuth, userCtr.loginWithToken)
    app.put('/api/profile', requireAuth, userCtr.update)
    
    app.get('/api/loginWithGoogle', userCtr.loginWithGoogle)
    app.get('/oauth2callback', userCtr.authGoogle);

    app.get('/api/users', userCtr.users);
    app.get('/api/userinfo', userCtr.userInfo);

}
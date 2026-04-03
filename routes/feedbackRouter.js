const path = require('path')
const userFeedCtr = require(path.resolve('./controllers/userFeedCtr'))
const passport = require('passport')

const requireAuth = passport.authenticate('jwt', { session: false });
const requireLogin = passport.authenticate('local', { session: false });

module.exports = (app) => {

    app.post('/api/addfeed', userFeedCtr.add)
    app.get('/api/allfeeds', userFeedCtr.AllFeeds)

}
const md5 = require('md5');

module.exports = {
    secret: 'super secret key',

    db_url: 'mongodb://127.0.0.1:27017/cad',
    
    default_admin: {
        email: 'danielcoder1022@gmail.com',
        name: 'Administrator',
        pwd: 'daniel!@#',
        isAdmin: true,
        birthdate:  new Date('2024-08-29'), 
    },
};

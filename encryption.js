/**
 * Created by Kevin on 23/10/2016.
 */

var bcrypt = require('bcrypt');

var config = require('./config');

module.exports = function (password) {
         return bcrypt.hashSync(password, config.saltRounds);
};

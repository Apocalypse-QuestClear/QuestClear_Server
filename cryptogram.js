/**
 * Created by Kevin on 23/10/2016.
 */

var bcrypt = require('bcryptjs');

var config = require('./config');

var crypto = {};

crypto.compare = function (password, hash) {
    return bcrypt.compareSync(password, hash);
};

crypto.encrypt = function (password) {
    return bcrypt.hashSync(password, config.saltRounds);
};

module.exports = crypto;

/**
 * Created by Kevin on 23/10/2016.
 */

var bcrypt = require('bcrypt');

module.exports = function (password, hash) {
    return bcrypt.compareSync(password, hash);
};

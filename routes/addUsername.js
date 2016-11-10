/**
 * Created by Kevin on 10/11/2016.
 */

var conn = require(__base + 'connection');
var squel = require('squel');

module.exports = function(res) {
    if (!res.uid)
        return Promise.resolve(res);
    else
        return conn.query(squel.select()
                                .field('username')
                                .from('users')
                                .where('uid = ?', res.uid).toString())
            .then(function (rows) {
                res.username = rows[0].username;
                return res;
            });
};
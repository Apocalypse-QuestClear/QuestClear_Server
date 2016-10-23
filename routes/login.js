/**
 * Created by Kevin on 23/10/2016.
 */

var router = require('express').Router();

var jwt = require('jsonwebtoken');
var config = require(__base + 'config');
var compare = require(__base + 'passwordCompare');
var conn = require(__base + 'connection');

router.post('/', function (req, res, next) {
    conn.then(function (connection) {
        connection.query("SELECT * FROM users WHERE username = '" + req.body.username + "'")
            .then(function(rows) {
                if(!rows[0]) {
                    return res.status(401).json({error: 'Authentication failed. User not found.' });
                }

                if(!compare(req.body.password, rows[0].password)) {
                        return res.status(401).json({ error: 'Authentication failed. Wrong password.' });
                }

                var token = jwt.sign({uid : rows[0].uid}, config.secretToken, {expiresIn: '24h'});

                return res.json({ uid: rows[0].uid, username: req.body.username, token: token, expiresIn: '24h' });

            }).catch(function (err) {
            next(err);
        });
    });

});

module.exports = router;
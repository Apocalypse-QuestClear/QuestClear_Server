/**
 * Created by Kevin on 24/10/2016.
 */
var router = require('express').Router();

var jwt = require('jsonwebtoken');
var config = require(__base + 'config');
var conn = require(__base + 'connection');

router.post('/', function (req, res, next) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    if (!token) {
        res.status(401);
        return res.json({error: 'No token provided.'});
    }

    jwt.verify(token, config.secretToken, function (err, decoded) {
        if (err) {
            res.status(401);
            return res.json({error: 'Failed to authenticate token.'});
        } else {
            conn.then(function (connection) {
                connection.query("SELECT username FROM users WHERE uid = '" + decoded.uid + "'")
                    .then(function (rows) {
                        return res.status(200).json({uid: decoded.uid, username: rows[0].username});
                    }).catch(function (err) {
                    next(err);
                });
            })
        }
    });
});

module.exports = router;
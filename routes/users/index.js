/**
 * Created by Kevin on 23/10/2016.
 */

var router = require('express').Router();

var encrypt = require(__base + 'encryption');
var conn = require(__base + 'connection');

router.post('/', function (req, res, next) {

    if (!req.body.username) {
        return res.status(400).json({ error: 'Username is empty.' });
    }
    else if (!req.body.password) {
        return res.status(400).json({ error: 'Password is empty.' });
    }
    conn.then(function(connection) {
        connection.query("SELECT * FROM users WHERE username = '" + req.body.username +"'")
            .then(function(rows) {
                if(rows[0]) {
                    return res.status(409).json({ error: 'Username already exists.' });
                }
                else {
                    var password = encrypt(req.body.password);
                    return connection.query("INSERT INTO users SET username = '" + req.body.username + "', password = '" + encrypt(req.body.password) + "', email = '" + (req.body.email||'') + "'");
                }
            }).then(function() {
            return connection.query("SELECT MAX(uid) as uid FROM users");
        }).then(function(rows) {
                return res.status(201).json({uid: rows[0].uid});
        }).catch(function(err){
            //next(err);  -------------?
        });
    });
});

module.exports = router;
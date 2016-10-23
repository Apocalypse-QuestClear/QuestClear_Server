/**
 * Created by Kevin on 24/10/2016.
 */
var router = require('express').Router();

var conn = require(__base + 'connection');

router.post('/', function(req, res, next){
    if (!req.body.title) {
        return res.status(400).json({ error: 'Title is empty.' });
    }
    else if (!req.body.category) {
        return res.status(400).json({ error: 'Category is empty.' });
    }
    else if (!req.body.hideUser) {
        return res.status(400).json({ error: 'hideUser is empty,' });
    }
    conn.then(function(connection) {
        connection.query("INSERT INTO questions SET title = '" + req.body.title + "', category = '" + req.body.category
            + "', hideUser = " + req.body.hideUser  + ", uid = '" + req.user.uid + "', time = now()").then(function() {
            return connection.query("SELECT MAX(qid) as qid FROM questions")
        }).then(function(rows) {
            return res.status(201).json({qid: rows[0].qid});
        }).catch(function(err){
            next(err);
        });
    });

});

module.exports = router;
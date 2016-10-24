/**
 * Created by Kevin on 24/10/2016.
 */
var router = require('express').Router();

var conn = require(__base + 'connection');
var squel = require('squel');

router.post('/', function(req, res, next){
    if (!req.body.title) {
        return res.status(400).json({ error: 'Title is empty.' });
    }
    else if (!req.body.category) {
        return res.status(400).json({ error: 'Category is empty.' });
    }
    else if (req.body.hideUser == null) {
        return res.status(400).json({ error: 'hideUser is empty,' });
    }

    conn.query(squel.insert()
                    .into('questions')
                    .set('title', req.body.title)
                    .set('category', req.body.category)
                    .set('hideUser', squel.str(req.body.hideUser))
                    .set('uid', res.locals.user.uid)
                    .set('time', squel.str('NOW()')).toString())
        .then(function(rows) {
            return res.status(201).json({qid: rows.insertId});
        }).catch(function(err){
            next(err);
        });
});

module.exports = router;
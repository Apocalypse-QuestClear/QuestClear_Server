/**
 * Created by Kevin on 24/10/2016.
 */
var router = require('express').Router();

var conn = require(__base + 'connection');
var squel = require('squel');

router.post('/', function (req, res, next) {

    conn.query(squel.select()
                    .field('username')
                    .from('users')
                    .where("uid = ?", res.locals.user.uid).toString())
        .then(function (rows) {
            return res.status(200).json({uid: res.locals.user.uid, username: rows[0].username});
        }).catch(function (err) {
            next(err);
        });
});


module.exports = router;
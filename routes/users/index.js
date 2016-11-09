/**
 * Created by Kevin on 23/10/2016.
 */

var router = require('express').Router();

var crypto = require(__base + 'cryptogram');
var conn = require(__base + 'connection');
var squel = require('squel');

router.post('/', function (req, res, next) {

    if (!req.body.username) {
        return res.status(400).json({error: 'Username is empty.'});
    }
    else if (!req.body.password) {
        return res.status(400).json({error: 'Password is empty.'});
    }

    conn.query(squel.select()
                    .from('users')
                    .where("username = ?", req.body.username).toString())
        .then(function (rows) {
            if (rows[0]) {
                res.status(409).json({error: 'Username already exists.'});
                return;
            }
            else {
                var password = crypto.encrypt(req.body.password);
                return conn.query(squel.insert()
                                        .into('users')
                                        .set('username', req.body.username)
                                        .set('password', password)
                                        .set('email', (req.body.email || '')).toString());
               }
        }).then(function (rows) {
            if(rows) {
                return res.status(201).json({uid: rows.insertId});
            }
        }).catch(function (err) {
            next(err);
        });
});

router.use(require('../verifyToken'));

router.put('/:uid',function(req,res,next){

    if (!req.body.username) {
        return res.status(400).json({error: 'Username is empty.'});
    }

    Promise.all([
        conn.query(squel.select()
                        .from('users')
                        .where("uid = ?", res.locals.user.uid).toString()),
        conn.query(squel.select()
                        .from('users')
                        .where("username = ?",req.body.username).toString())])
        .then(function(rows){
            if (rows[1][0]) {
                res.status(409).json({error: 'Username already exists.'});
                return;
            }
            else {
                if(!req.body.password) {
                    return conn.query(squel.update()
                        .table('users')
                        .set('username', req.body.username)
                        .set('email', req.body.email)
                        .where('uid = ?', res.locals.user.uid)
                        .toString());

                }
                else {
                    if(!crypto.compare(req.body.oldPassword, rows[0][0].password)) {
                        res.status(403).json({ error: 'Authentication failed. Wrong password.' });
                        return;
                    }
                   else{
                        return conn.query(squel.update()
                            .table('users')
                            .set('username', req.body.username)
                            .set('password', req.body.password)
                            .set('email', req.body.email)
                            .where('uid = ?', res.locals.user.uid)
                            .toString());
                    }
                }
            }
        }).then(function (rows) {
            if(rows) {
                return res.status(201).json({uid: rows.insertId});
            }
        }).catch(function (err) {
            next(err);
        });
});

router.get('/:uid', function(req, res, next) {
     conn.query(squel.select()
                     .from('users')
                     .where('uid = ?', req.params.uid).toString())
         .then(function (rows) {
             if(rows[0]) {
                 return res.json({username: rows[0].username, email: rows[0].email});
             }
             else {
                 return res.status(400).json({ error: 'Uid not exist.'});
             }
         }).catch(function (err) {
             next(err);
         });
});


module.exports = router;
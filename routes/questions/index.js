/**
 * Created by Kevin on 24/10/2016.
 */
var router = require('express').Router();

var conn = require(__base + 'connection');
var addusername = require('../addUsername');
var squel = require('squel');

function hideUser(row) {
    if(row.hideUser) {
        delete row.uid;
    }
    delete row.hideUser;
    return row;
}

//提问
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
                    .set('category', JSON.stringify(req.body.category))
                    .set('hideUser', req.body.hideUser)
                    .set('uid', res.locals.user.uid)
                    .set('time', squel.str('NOW()')).toString())
        .then(function(rows) {
            return res.status(201).json({qid: rows.insertId});
        }).catch(function(err){
            next(err);
        });
});

//搜索问题
router.get('/', function(req, res, next){
    var keyword = req.query.keyword||'';
    var category = req.query.category||'';
    var uid = req.query.uid;
    var limit = parseInt(req.query.limit||'10') > 30? 30: parseInt(req.query.limit||'10');
    var after = parseInt(req.query.after||'0');

    var _hideUser = "hideUser = '0'";
    if(res.locals.user.uid == req.query.uid) {
        _hideUser = "1";
    }
    conn.query(squel.select()
                    .from('questions')
                    .where(
                        squel.expr().and("title LIKE '%" + keyword + "%'")
                                    .and("category LIKE '%" + category + "%'")
                                    .and(uid ? "uid = '" + uid + "'": '1')
                                    .and(_hideUser))
                    .limit(limit)
                    .offset(after).toString())
        .then(function(rows) {
            rows.forEach(function(row) {
                hideUser(row);
            });
            return Promise.all(rows.map(function(row) {
                row.category = JSON.parse(row.category);
                return addusername(row);
            }));
        }).then(function(data){
            return res.json(data);
        }).catch(function(err){
            next(err);
        });
});

//查看问题
router.get('/:qid', function(req, res, next) {
    conn.query(squel.select()
        .from('questions')
        .where("qid = ?", req.params.qid).toString())
        .then(function (rows) {
            if (rows[0]) {
                delete rows[0].qid;
                hideUser(rows[0]);
                return addusername(rows[0]);
            }
            else {
                res.status(400).json({error: 'No such qid.'});
                return;
            }
        }).then(function (data) {
            if(data) {
                data.category = JSON.parse(data.category);
                return res.json(data);
            }
        }).catch(function (err) {
            next(err);
        });
});

module.exports = router;
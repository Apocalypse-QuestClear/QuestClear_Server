/**
 * Created by Kevin on 24/10/2016.
 */
var router = require('express').Router();

var conn = require(__base + 'connection');
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
                    .set('category', req.body.category)
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
    var limit = parseInt(req.query.limit||'5') > 30? 30: parseInt(req.query.limit||'5');
    var after = 0;//parseInt(req.query.after||'0');TODO: implement after<qid>
    conn.query(squel.select()
                    .from('questions')
                    .where(
                        squel.expr().and("title LIKE '%" + keyword + "%'")
                                    .and("category LIKE '%" + category + "%'")
                                    .and(uid ? "uid = '" + uid + "'": '1'))
                    .limit(limit)
                    .offset(after).toString())
        .then(function(rows) {
            rows.forEach(function(row) {
                hideUser(row);
            });
            return res.json(rows);
        })
        .catch(function(err){
            next(err);
        });
});

//查看问题
router.get('/:qid', function(req, res, next){
    conn.query(squel.select()
                    .from('questions')
                    .where("qid = ?", req.params.qid).toString())
        .then(function(rows) {
            if(rows[0]) {
                delete rows[0].qid;
                hideUser(rows[0]);
                return res.json(rows[0]);
            }
            else {
                return res.status(400).json({ error: 'No such qid.'});
            }
        }).catch(function(err) {
            next(err);
        });
});

module.exports = router;
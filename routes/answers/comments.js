/**
 * Created by fy on 2016/12/8.
 */
var router = require('express').Router();

var conn = require(__base + 'connection');
var squel = require('squel');

router.post('/', function(req, res, next) {

    conn.query(squel.select()
        .from('comments')
        .where(squel.expr().and("uid = ?", res.locals.user.uid)
            .and("aid = ?", res.locals.user.aid)).toString())
        .then(function (rows) {
            if (rows[0]) {
                conn.query(squel.update()
                                 .table('comments')
                                 .set('content', req.body.content)
                                 .set('time', squel.str('NOW()'))
                                 .where(squel.expr().and("uid = ?", res.locals.user.uid)
                                                .and("aid = ?", res.locals.user.aid)).toString())
                return res.status(200).json({cid: rows[0].cid})
            }
            else {
                        conn.query(squel.insert()
                            .into('comments')
                            .set('uid', res.locals.user.uid)
                            .set('aid', res.locals.user.aid)
                            .set('rate','5')
                            .set('content', req.body.content)
                            .set('time', squel.str('NOW()')).toString())
                        return res.status(201).json({cid: rows.insertId})
            }
        })
        .catch(function (err) {
            next(err);
        })
});

router.get('/',function(req, res, next){
    var limit = parseInt(req.query.limit||'10') > 30? 30: parseInt(req.query.limit||'10');
    var after = parseInt(req.query.after||'0');
    conn.query(squel.select()
                     .from('comments')
                     .where('aid = ?',res.locals.user.aid)
                     .limit(limit)
                     .offset(after).toString())
        .then(function(rows) {
            console.log(rows)
            rows.forEach(function(row) {

            });
            return rows
            })
        .then(function(data){
        return res.json(data);})
    .catch(function (err) {
        next(err);
    })
})


module.exports = router;
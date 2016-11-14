/**
 * Created by fy on 2016/11/9.
 */
var router = require('express').Router();
var conn = require(__base + 'connection');
var squel = require('squel');

router.post('/questions/:qid', function(req,res,next){

    conn.query(squel.select()
                      .from('watches')
                      .where(squel.expr().and("uid = ?",res.locals.user.uid)
                                          .and("qid = ?",req.params.qid)).toString())
    .then(function(rows){
        if(rows[0]){
            res.status(409).json({error: 'You have already given attention to this question.'});
            return;
        }
        else{
            return conn.query(squel.insert()
                                     .into('watches')
                                     .set('uid',res.locals.user.uid)
                                     .set('qid',req.params.qid).toString());
        }
    }).then(function (rows) {
        if(rows) {
            return res.status(200).json({});
        }
    }).catch(function (err) {
        next(err);
    });

});

router.delete('/questions/:qid', function(req,res,next){

    conn.query(squel.delete()
                     .from('watches')
                     .where(squel.expr().and("uid = ?",res.locals.user.uid)
                                         .and("qid = ?", req.params.qid)).toString())
        .then(function (rows) {
                return res.status(200).json({});
        }).catch(function (err) {
            next(err);
        });
})

router.post('/answers/:aid', function(req,res,next){

    conn.query(squel.select()
        .from('watches')
        .where(squel.expr().and("uid = ?",res.locals.user.uid)
                            .and("aid = ?",req.params.aid)).toString())
    .then(function(rows){
        if(rows[0]){
            res.status(409).json({error: 'You have already given attention to this answer.'});
            return;
        }
        else{
            conn.query(squel.insert()
                             .into('watches')
                             .set('uid',res.locals.user.uid)
                             .set('aid',req.params.aid).toString());
        }
    })
        .then(function (rows) {
            if(rows){
                return res.status(200).json({});
            }
        }).catch(function (err) {
            next(err);
    });
});

router.delete('/answers/:aid', function(req,res,next){


    conn.query(squel.delete()
                     .from('watches')
                     .where(squel.expr().and("uid = ?",res.locals.user.uid)
                                         .and("aid = ?", req.params.aid)).toString())
        .then(function (rows) {
            if(rows) {
                return res.status(200).json({});
            }
        }).catch(function (err) {
        next(err);
    });
})

module.exports = router;
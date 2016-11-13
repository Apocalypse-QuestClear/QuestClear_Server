/**
 * Created by Kevin on 09/11/2016.
 */
var router = require('express').Router();
var conn = require(__base + 'connection');
var squel = require('squel');

//add to quests
router.post('/:aid', function(req, res, next) {
    conn.query(squel.select()
                    .from('steps')
                    .where('aid = ?', req.params.aid).toString())
        .then(function(rows) {
            if(rows[0]) {
                return Promise.all(rows.map(function (row) {
                    return conn.query(squel.insert()
                                            .into('quests')
                                            .set('uid', res.locals.user.uid)
                                            .set('aid', req.params.aid)
                                            .set('sid', row.sid).toString());
                }));
            }
            else {
                res.status(400).json({error: "Invalid aid."});
                return;
            }
        }).then(function(data) {
            if(data) {
                return res.status(200).json({});
            }
        }).catch(function(err) {
            next(err);
        });
});

//get quests
router.get('/', function(req, res, next) {
    conn.query(squel.select()
                    .field('aid').field('MAX(status)', 'status')
                    .from('quests')
                    .where('uid = ?', res.locals.user.uid)
                    .group('aid').toString())
        .then(function (rows) {
            rows.map(function (row) {
               row.status = (row.status != 0);
            });
            return res.json(rows);
        }).catch(function(err) {
            next(err);
        });
});

//get certain quest
router.get('/:aid', function(req, res, next) {
    conn.query(squel.select()
                    .field('q.status', 'status').field('q.progress', 'progress').field('s.isItem', 'isItem')
                    .field('s.count', 'count').field('s.sid', 'step_id')
                    .from('quests', 'q')
                    .from('steps', 's')
                    .where(squel.expr().and('q.aid = ?', req.params.aid)
                                .and('q.uid = ?', res.locals.user.uid)
                                .and('q.sid = s.sid')).toString())
        .then(function (rows) {
            if(rows[0]) {
                var _ans = {};
                _ans.status = (rows[0].status != 0);
                rows.map(function(row) {
                    delete row.status;
                    row.isItem = (row.isItem != 0);
                    if(!row.isItem)
                        delete row.count;
                    return row;
                });
                _ans.steps = rows;
                return res.json(_ans);
            }
            else {
                res.status(400).json({error: "Invalid aid."});
                return;
            }
        }).catch(function(err) {
            next(err);
        });
});

//delete quest
router.delete('/:aid', function(req, res, next) {
    conn.query(squel.delete()
                    .from('quests')
                    .where(squel.expr().and('uid = ?', res.locals.user.uid)
                                .and('aid = ?', req.params.aid)).toString())
        .then(function (row) {
            if(row.affectedRows == 0) {
                return res.status(400).json({error: "Invalid aid or the quest has already been deleted."});
            }
            return res.status(200).json({});
        }).catch(function(err) {
            next(err);
        });
});

//modify progress
router.patch('/:aid/steps/:step_id', function(req, res, next) {
    conn.query(squel.select()
                    .from('steps')
                    .where(squel.expr().and('sid = ?', req.params.step_id)
                                .and('aid = ?', req.params.aid)).toString())
        .then(function(rows) {
            if(!rows[0]) {
                res.status(400).json({error: 'Invalid field "step_id"'});
                return;
            }
            if(!rows[0].isItem || (rows[0].isItem && req.body.progress >= 0 && req.body.progress <= rows[0].count)) {
                return conn.query(squel.update()
                                        .table('quests')
                                        .set('progress', req.body.progress)
                                        .where(squel.expr().and('uid = ?', res.locals.user.uid)
                                                    .and('aid = ?', req.params.aid)
                                                    .and('sid = ?', req.params.step_id)).toString());
            }
            else {
                res.status(400).json({error: 'Invalid field "progress"'});
                return;
            }
        }).then(function(data) {
            if (data) {
                return conn.query(squel.select()
                                        .field('q.status', 'status').field('q.progress', 'progress').field('s.isItem', 'isItem')
                                        .field('s.count', 'count')
                                        .from('quests', 'q')
                                        .from('steps', 's')
                                        .where(squel.expr().and('q.aid = ?', req.params.aid)
                                                    .and('q.uid = ?', res.locals.user.uid)
                                                    .and('q.sid = s.sid')).toString());
            }
        }).then(function (data2) {
            if(data2) {
                var _isFinished = 1 ;
                data2.forEach(function(row) {
                    //Unfinish
                   if(!((!row.isItem && row.progress == 1) || (row.isItem && row.progress == row.count))) {
                       _isFinished = 0;
                   }
                });
                return conn.query(squel.update()
                                        .table('quests')
                                        .set('status', _isFinished)
                                        .where(squel.expr().and('aid = ?', req.params.aid)
                                                    .and('uid = ?', res.locals.user.uid)).toString());
            }
        }).then(function (data3) {
            if(data3) {
                return res.status(200).json({});
            }
        }).catch(function (err) {
            next(err);
        });
});

module.exports = router;
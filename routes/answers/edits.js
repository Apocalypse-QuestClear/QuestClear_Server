/**
 * Created by Kevin on 14/12/2016.
 */
var router = require('express').Router();
var conn = require(__base + 'connection');
var squel = require('squel');
var addusername = require('../addUsername');
var spawn = require(__base + 'child-process-promise-encoding')('gbk').spawn;

//编辑请求
router.post('/', function(req, res, next) {
    if (!req.body.title) {
        return res.status(400).json({error: 'Title is empty.'});
    }
    else if (!req.body.content) {
        return res.status(400).json({error: 'Content is empty.'});
    }
    else if (!req.body.version) {
        return res.status(400).json({error: 'Version is empty.'});
    }

    if ((req.body.steps).some(step => !step.title)) {
        return res.status(400).json({error: 'Title of a step is empty.'});
    }
    else if((req.body.steps).some(step => step.index == null)) {
        return res.status(400).json({error: 'Index of a step is empty.'});
    }
    else if ((req.body.steps).some(step => (step.isItem == null))) {
        return res.status(400).json({error: 'isItem of a step is empty.'});
    }
    else if ((req.body.steps).some(step => (step.isItem === 'true' && !step.count))) {  //不允许count为0
        return res.status(400).json({error: "isItem of a step is True but it's Count is empty/0."});
    }

    var _eid;
    conn.query('start transaction').then(function () {
        return conn.query(squel.insert()
                                .into('edits')
                                .set('aid', res.locals.user.aid)
                                .set('title', req.body.title)
                                .set('content', req.body.content)
                                .set('uid', res.locals.user.uid)
                                .set('time', squel.str('NOW()'))
                                .set('version', req.body.version)
                                .set('status', 'open').toString())
                                .then(function (rows) {
                _eid = rows.insertId;
                return Promise.all(req.body.steps.map(function (step) {
                    return conn.query(squel.insert()
                                            .into('edit_steps')
                                            .set('e_index', step.index)
                                            .set('title', step.title)
                                            .set('isItem', step.isItem == true? 1 : 0)
                                            .set('count', (step.count || '0'))
                                            .set('detail', (step.detail || ''))
                                            .set('eid', _eid).toString());
                }));
            }).then(function () {
                return conn.query('commit');
            }).then(function () {
                return res.status(201).json({eid: _eid});
            }).catch(function (err) {
                conn.query('rollback');
                next(err);
            });
    })
});

//查看编辑请求
router.get('/', function(req, res, next) {
    if(!req.query.status in ['open', 'accept', 'reject']) {
        return res.status(400).json({error: 'Invalid status'});
    }
    var limit = parseInt(req.query.limit||'10') > 30? 30: parseInt(req.query.limit||'10');
    var after = parseInt(req.query.after||'0');

    conn.query(squel.select()
                    .from('edits')
                    .where(squel.expr().and('aid = ?', res.locals.user.aid)
                                        .and(req.query.status ? "status = '" + req.query.status + "'": '1'))
                    .limit(limit)
                    .offset(after).toString()
        ).then(function(rows) {
            return res.json(rows);
        }).catch(function(err) {
            next(err);
        });
});

//查看具体改动
router.get('/:eid', function(req, res, next) {

    var _ans = {};
    var chunks = [];
    var str = '';

    _ans.type = 'modify';
    Promise.all([conn.query(squel.select()
                    .from('edit_steps')
                    .where('eid = ?', req.params.eid).toString()),
                conn.query(squel.select()
                    .from('edits')
                    .where('eid = ?', req.params.eid).toString())]
    ).then(function(rows) {
        rows[0].map(function(row) {
            row.isItem = (row.isItem == 1);
            row.index = row.e_index;
            delete row.e_index;
            delete row.esid;
            delete row.eid;
        });
        _ans.PullRequest = rows[0];
        return conn.query(squel.select()
                                .from('steps')
            .where(squel.expr().and('aid = ?', res.locals.user.aid)
                .and('version = ?', rows[1][0].version)).toString());
    }).then(function(datas) {
        if(!datas[0]) {
            res.status(400).json({error: 'No such aid and version.'});
            return;
        }
        else {
            datas.map(function(data) {
                data.isItem = (data.isItem == 1);
                delete data.sid;
                delete data.aid;
                delete data.version;
            });
            _ans.CorrespondAnswer = datas;

            var p = spawn('./Modify', [], { capture: ["stdout", "stderr"] });
            p.childProcess.stdin.writeEncoded(JSON.stringify(_ans));
            p.childProcess.stdin.end();
            return p;
        }
    }).then(function(result) {
        if(result.stdout) {
            return res.json(JSON.parse(result.stdout));
        }
    }).catch(function(err) {
        next(err);
    });
});

module.exports = router;
/**
 * Created by Kevin on 14/12/2016.
 */
var router = require('express').Router();
var conn = require(__base + 'connection');
var squel = require('squel');
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
    var edit;

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
        edit = rows[1][0];
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
            edit.steps = JSON.parse(result.stdout);
            return res.json(edit);
        }
    }).catch(function(err) {
        next(err);
    });
});

//接受拒绝编辑请求
router.patch('/:eid', function(req, res, next) {
    if(!req.body.status in ["reject", "accept"]) {
        return res.status(400).json({error: "Invalid status."});
    }
    var _ans = {};
    _ans.type = "merge";
    if(req.body.status == 'accept') {
        var _answer, latest_version, new_steps;
        Promise.all([conn.query(squel.select()
                                    .from('edit_steps')
                                    .where('eid = ?', req.params.eid).toString()),
                    conn.query(squel.select()
                                    .from('edits')
                                    .where('eid = ?', req.params.eid).toString())]
        ).then(function(rows) {
            if(!rows[0][0]) {
                res.status(400).json({error: "Invalid eid."});
                return;
            }
            if(!(rows[1][0].status == 'open')) {
                res.status(400).json({error: "This Edits is being processed."});
                return;
            }
            rows[0].map(function(row) {
                row.isItem = (row.isItem == 1);
                row.index = row.e_index;
                delete row.e_index;
                delete row.esid;
                delete row.eid;
            });
            _ans.PullRequest = rows[0];
            return Promise.all([conn.query(squel.select()
                                                .from('steps')
                                                .where(squel.expr().and('aid = ?', res.locals.user.aid)
                                                              .and('version = ?', rows[1][0].version)).toString()),
                                conn.query(squel.select()
                                                .from('steps')
                                                .where(squel.expr().and('aid = ?', res.locals.user.aid)
                                                            .and('version = ?', squel.select()
                                                                                    .field('MAX(version)')
                                                                                    .from('steps')
                                                                                    .where('aid = ?', res.locals.user.aid))).toString())]);
        }).then(function(datas) {
            if(datas) {
                _ans.CorrespondAnswer = datas[0];
                latest_version = datas[1][0].version;
                var index = 0;
                datas[1].map(function (data) {
                    data.index = index++;
                });
                _ans.CurrentAnswer = datas[1];
                var p = spawn('./Modify', [], { capture: ["stdout", "stderr"] });
                p.childProcess.stdin.writeEncoded(JSON.stringify(_ans));
                p.childProcess.stdin.end();
                return p;
            }
        }).then(function(result) {
            if(result) {
                if(result.stdout) {
                    new_steps = JSON.parse(result.stdout);
                    if(!new_steps.error) {
                        latest_version++;
                        return conn.query(squel.select()
                                                .from('answers')
                                                .where('aid = ?', res.locals.user.aid).toString());
                    }
                    else {
                        res.status(409).json({error: "Conflict! Cannot Merge!"});
                        return;
                    }
                }
            }
        }).then(function (answer) {
            if(answer) {
                _answer = answer[0];
                return conn.query('start transaction');
            }
        }).then(function(data1) {
            if(data1) {
                return conn.query(squel.insert()
                                        .into('answers')
                                        .set('aid', _answer.aid)
                                        .set('qid', _answer.qid)
                                        .set('title', _answer.title)
                                        .set('hideUser', _answer.hideUser)
                                        .set('uid', _answer.uid)
                                        .set('time', _answer.time)
                                        .set('version', latest_version.toString()).toString());
            }
        }).then(function (data2) {
            if(data2) {
                return Promise.all(new_steps.map(function (step) {
                    return conn.query(squel.insert()
                                            .into('steps')
                                            .set('title', step.title)
                                            .set('isItem', step.isItem)
                                            .set('count', (step.count || '0'))
                                            .set('detail', (step.detail || ''))
                                            .set('aid', _answer.aid)
                                            .set('version', latest_version.toString()).toString());
                }));
            }
        }).then(function (data3) {
            if(data3) {
                return conn.query('commit');
            }
        }).then(function (data4) {
            if(data4) {
                return conn.query(squel.update()
                                        .table('edits')
                                        .set('status', 'accept')
                                        .where('eid = ?', req.params.eid).toString());
            }
        }).then(function (data5) {
            if(data5) {
                return res.status(200).json({});
            }
        }).catch(function (err) {
            conn.query('rollback');
            next(err);
        });
    }
    else {
        conn.query(squel.select()
                        .from('edits')
                        .where('eid = ?', req.params.eid).toString()
        ).then(function(rows) {
           if(!(rows[0].status == 'open')) {
               res.status(400).json({error: "This Edits is being processed."});
               return;
           }
           return conn.query(squel.update()
                                   .table('edits')
                                   .set('status', 'reject')
                                   .where('eid = ?', req.params.eid).toString());
        }).then(function(datas) {
            if(datas) {
                return res.json({});
            }
        }).catch(function(err) {
            next(err);
        });
    }

});

module.exports = router;
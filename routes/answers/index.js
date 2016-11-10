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

//回答
router.post('/', function(req, res, next) {
    if (!req.body.qid) {
        return res.status(400).json({error: 'qid is empty.'});
    }
    else if (!req.body.title) {
        return res.status(400).json({error: 'Title is empty.'});
    }
    else if (!req.body.steps) {
        return res.status(400).json({error: 'Steps is empty.'});
    }
    else if (req.body.hideUser == null) {
        return res.status(400).json({error: 'hideUser is empty.'});
    }


    if ((req.body.steps).some(step => !step.title)) {
        return res.status(400).json({error: 'Title of a step is empty.'});
    }
    else if ((req.body.steps).some(step => (step.isItem == null))) {
        return res.status(400).json({error: 'isItem of a step is empty.'});
    }
    else if ((req.body.steps).some(step => (step.isItem ==='true' && !step.count))) {  //不允许count为0
        return res.status(400).json({error: "isItem of a step is True but it's Count is empty/0."});
    }

    var _aid;
    conn.query(squel.insert()
                    .into('answers')
                    .set('qid', req.body.qid)
                    .set('title', req.body.title)
                    .set('hideUser', req.body.hideUser)
                    .set('uid', res.locals.user.uid)
                    .set('time', squel.str('NOW()')).toString())
        .then(function (rows) {
            _aid = rows.insertId;
            return Promise.all(req.body.steps.map(function (step) {
                return conn.query(squel.insert()
                                        .into('steps')
                                        .set('title', step.title)
                                        .set('isItem', step.isItem)
                                        .set('count', (step.count||'0'))
                                        .set('detail', (step.detail||''))
                                        .set('aid', _aid).toString());
            }));
        }).then(function() {
            return res.status(201).json({aid: _aid});
        }).catch(function (err) {
            next(err);
        });
});

//查看回答
router.get('/:aid', function(req, res, next) {
    var _ans;
    conn.query(squel.select()
        .from('answers')
        .where("aid = ?", req.params.aid).toString())
        .then(function(rows) {
            if(rows[0]) {
                delete rows[0].aid;
                hideUser(rows[0]);
                _ans = rows[0];
                return Promise.all([conn.query(squel.select()
                                        .from('steps')
                                        .where("aid = ?", req.params.aid).toString()),
                                    conn.query(squel.select()
                                        .from('questions')
                                        .where("qid = ?", rows[0].qid).toString())]);
            }
            else {
                res.status(400).json({ error: 'No such aid.'});
                return;
            }
        }).then(function(rows) {
            if(rows) {
                rows[0].forEach((row) => {delete row.sid;delete row.aid;});
                _ans.steps = rows[0];
                delete _ans.qid;
                hideUser(rows[1][0]);
                _ans.question = rows[1][0];
                return res.json(_ans);
            }
        }).catch(function(err) {
            next(err);
        });
});

//搜索回答
router.get('/', function(req, res, next){
    var keyword = req.query.keyword||'';
    var category = req.query.category||'';
    var uid = req.query.uid;
    var qid = req.query.qid;
    var limit = parseInt(req.query.limit||'5') > 30? 30: parseInt(req.query.limit||'5');
    var after = parseInt(req.query.after||'0');
    var _ans;
    conn.query(squel.select()
                    .from(squel.select()
                               .field('a.title', 'title').field('q.title', 'qtitle').field('category')
                               .field('a.qid', 'qid').field('a.hideUser', 'hideUser').field('q.hideUser', 'qhideUser')
                               .field('a.uid', 'uid').field('q.uid', 'quid').field('version').field('a.time', 'time')
                               .field('aid').field('q.time', 'qtime')
                               .from('answers', 'a')
                               .from('questions', 'q')
                               .where('a.qid = q.qid'), 'T')
                    .where(
                        squel.expr().and("T.title LIKE '%" + keyword + "%'")
                            .and("T.category LIKE '%" + category + "%'")
                            .and(uid ? "uid = '" + uid + "'": '1')
                            .and(qid ? "qid = '" + qid + "'": '1'))
                    .limit(limit)
                    .offset(after).toString())
        .then(function(data) {
            var aids = [];
            data.forEach(function(rows) {
                var question = {
                    qid: rows.qid,
                    uid: rows.qhideUser ? undefined : rows.quid,
                    title: rows.qtitle,
                    category: rows.category,
                    time: rows.qtime
                };
                delete rows.qid;
                delete rows.qhideUser;
                delete rows.quid;
                delete rows.qtitle;
                delete rows.category;
                delete rows.qtime;
                rows.question = question;
                hideUser(rows);
                aids.push(rows.aid);
            });
            _ans = data;
            return Promise.all(aids.map(function(aid) {
                return conn.query(squel.select()
                                        .from('steps')
                                        .where("aid = ?", aid).toString());
            }));
        }).then(function(steps) {
            for(var i in _ans) {
                steps[i].forEach(function (step) {
                    delete step.sid;
                    delete step.aid;
                });
                _ans[i].steps = steps[i];
            }
            return
            return res.json(_ans);
        })
        .catch(function(err){
            next(err);
        });
});

module.exports = router;
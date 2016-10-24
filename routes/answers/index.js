/**
 * Created by Kevin on 24/10/2016.
 */
var router = require('express').Router();

var conn = require(__base + 'connection');
var squel = require('squel');

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
                    .set('hideUser', squel.str(req.body.hideUser))
                    .set('uid', res.locals.user.uid)
                    .set('time', squel.str('NOW()')).toString())
        .then(function (rows) {
            _aid = rows.insertId;
            return Promise.all(req.body.steps.map(function (step) {
                return conn.query(squel.insert()
                                        .into('steps')
                                        .set('title', step.title)
                                        .set('isItem', squel.str(step.isItem))
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

module.exports = router;
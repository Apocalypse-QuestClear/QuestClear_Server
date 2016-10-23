/**
 * Created by Kevin on 24/10/2016.
 */
var router = require('express').Router();

var conn = require(__base + 'connection');

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
    else if (!req.body.hideUser) {
        return res.status(400).json({error: 'hideUser is empty.'});
    }

    req.body.steps.forEach(function (step) {
        if (!step.title) {
            return res.status(400).json({error: 'Title of some steps is empty.'});
        }
        else if (!step.isItem) {
            return res.status(400).json({error: 'isItem of some steps is empty.'});
        }
        else if (step.isItem === 'true' && !step.count) {
            return res.status(400).json({error: "isItem of a step is True but it's Count is empty."});
        }
    });
    var _aid;
    conn.then(function (connection) {
        connection.query("INSERT INTO answers SET qid = '" + req.body.qid + "', title = '" + req.body.title + "', hideUser = " + req.body.hideUser
            + ", uid = '" + req.user.uid + "', time = now()").then(function () {
            return connection.query("SELECT MAX(aid) as aid FROM answers");
        }).then(function (rows) {
            _aid = rows[0].aid;
            req.body.steps.forEach(function (step) {
                connection.query("INSERT INTO steps SET title = '" + step.title + "', isItem = " + step.isItem + ", count = '" + (step.count||'0') + "', detail = '" + (step.detail||'')
                    + "', aid = '" + _aid + "'");
            });
        }).then(function() {
            return res.status(201).json({aid: _aid});
        }).catch(function (err) {
            //next(err); --------?
        });
    });
});

module.exports = router;
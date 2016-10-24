/**
 * Created by Kevin on 24/10/2016.
 */
var jwt = require('jsonwebtoken');

var config = require(__base + 'config');

module.exports = function(req, res, next) {

    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    if (!token) {
        res.status(401);
        return res.json({error: 'No token provided.'});
    }

    jwt.verify(token, config.secretToken, function (err, decoded) {
        if (err) {
            res.status(401);
            return res.json({error: 'Failed to authenticate token.'});
        } else {
            res.locals.user = decoded;
            next();
        }
    });
}
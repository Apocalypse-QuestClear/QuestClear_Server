/**
 * Created by Kevin on 23/10/2016.
 */
var mysql = require('promise-mysql');

var conn = mysql.createConnection(require('./config'));

conn.query = function (sql) {
    return conn.then(function (connection) {
        return connection.query(sql);
    });
};

module.exports = conn;
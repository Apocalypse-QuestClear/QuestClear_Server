/**
 * Created by Kevin on 23/10/2016.
 */
var mysql = require('promise-mysql');

module.exports = mysql.createConnection(require('./config'));
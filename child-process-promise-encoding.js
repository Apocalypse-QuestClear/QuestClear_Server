var spawn = require('child-process-promise').spawn;
var cp = require('child-process-promise');
var iconv = require('iconv-lite');

var encoding = 'utf-8';

cp.spawn = function () {
    var chunks = [];
    var p = spawn.apply(this, arguments);
    p.childProcess.stdout.on('data', function (chunk) {
        chunks.push(chunk);
    });
    p.childProcess.stdin.writeEncoded = function (str) {
        return p.childProcess.stdin.write(iconv.encode(str, encoding))
    };
    return p.then(function (result) {
        result.stdout = iconv.decode(Buffer.concat(chunks), encoding);
        return result;
    });
};

module.exports = function (_encoding) {
    if (_encoding) {
        encoding = _encoding;
    }
    return cp;
};
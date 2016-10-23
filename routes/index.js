var router = require('express').Router();

/* GET home page. */

router.use('/users', require('./users'));
router.use('/login', require('./login'));
router.use('/auth', require('./auth'));

router.use(require('./verifyToken'));

router.use('/questions', require('./questions'));
router.use('/answers', require('./answers'));


module.exports = router;

const express = require('express');
const router = express.Router();

router.use(require('./join'));
router.use(require('./members'));

module.exports = router;

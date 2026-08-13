const express = require('express');
const router = express.Router();

router.use(require('./catalog'));
router.use(require('./item'));
router.use(require('./members'));

module.exports = router;

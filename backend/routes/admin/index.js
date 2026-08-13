const express = require('express');
const router = express.Router();

router.use(require('./reports'));
router.use(require('./stats'));
router.use(require('./moderators'));
router.use(require('./consistency'));

module.exports = router;

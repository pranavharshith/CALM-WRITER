const express = require('express');
const router = express.Router();

router.use(require('./writer'));
router.use(require('./catalog'));
router.use(require('./item'));

module.exports = router;

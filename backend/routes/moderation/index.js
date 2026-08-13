const express = require('express');
const router = express.Router();

router.use(require('./reports'));
router.use(require('./pins'));
router.use(require('./timeouts'));
router.use(require('./chat'));
router.use(require('./appeals'));

module.exports = router;

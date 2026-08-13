const express = require('express');
const router = express.Router();

router.use(require('./csrf'));
router.use(require('./signup'));
router.use(require('./signin'));
router.use(require('./password'));
router.use(require('./tokens'));
router.use(require('./username'));
router.use(require('./email'));

module.exports = router;

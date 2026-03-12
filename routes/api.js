const express = require('express');
const router = express.Router();

// simple test endpoint
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'API is working' });
});

// placeholder for additional API routes
// e.g. router.get('/donors/emergency', ...);

module.exports = router;

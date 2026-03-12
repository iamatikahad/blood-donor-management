const express = require('express');
const router = express.Router();

// Public emergency page
router.get('/', (req, res) => {
    res.render('emergency', { 
        user: req.session.user || null,
        error: null 
    });
});

// Emergency request (requires login)
router.post('/request', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Please login first',
            redirect: '/auth/donor-login'
        });
    }
    
    // Process emergency request
    const { bloodGroup, hospital, message, quantity, urgency, location } = req.body;
    
    // এখানে আপনার লজিক যোগ করুন
    
    res.json({ 
        success: true, 
        message: 'Emergency request received',
        requestId: 'REQ-' + Date.now()
    });
});

module.exports = router;
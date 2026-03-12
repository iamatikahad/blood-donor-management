const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'public', 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 500 * 1024 }, // 500KB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only .jpg, .jpeg, and .png files are allowed'));
        }
    }
});

// Donor Login Page
router.get('/donor-login', (req, res) => {
    res.render('auth/donor-login', { error: null, success: null });
});

// Donor Login Handler
router.post('/donor-login', (req, res) => {
    const { username, password, mobile } = req.body;

    const donors = db.getDonors();
    const donor = donors.find(d => d.username === username && d.mobile === mobile);

    if (donor && bcrypt.compareSync(password, donor.password)) {
        req.session.user = {
            id: donor.id,
            username: donor.username,
            name: donor.name,
            role: 'donor'
        };
        res.redirect('/donor/dashboard');
    } else {
        res.render('auth/donor-login', { error: 'Invalid credentials', success: null });
    }
});

// Admin Login Page
router.get('/admin-login', (req, res) => {
    res.render('auth/admin-login', { error: null });
});

// Admin Login Handler
router.post('/admin-login', (req, res) => {
    const { username, password } = req.body;

    const admins = db.getAdmins();
    const admin = admins.find(a => a.username === username);

    if (admin && bcrypt.compareSync(password, admin.password)) {
        req.session.user = {
            id: admin.id,
            username: admin.username,
            name: admin.name,
            role: 'admin'
        };
        res.redirect('/admin/dashboard');
    } else {
        res.render('auth/admin-login', { error: 'Invalid credentials' });
    }
});

// Admin Donor Registration (Admin only)
router.post('/register-donor', upload.single('profileImage'), (req, res) => {
    try {
        const { name, age, bloodGroup, contact, address, username, password, mobile } = req.body;
        
        // Generate unique donor ID using counter
        const donorId = db.getNextDonorId();
        
        const newDonor = {
            id: donorId,
            name,
            age,
            bloodGroup,
            contact,
            address,
            username,
            mobile,
            password: bcrypt.hashSync(password, 10),
            profileImage: req.file ? `/uploads/${req.file.filename}` : null,
            status: 'active',
            registrationDate: new Date().toISOString(),
            lastDonationDate: null,
            isEligible: true,
            totalDonations: 0
        };

        if (db.addDonor(newDonor)) {
            res.redirect('/admin/donors?success=Donor added successfully');
        } else {
            res.status(400).send('Error adding donor');
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Donor Self Registration (Public)
router.post('/donor-register', (req, res) => {
    const upload = multer({
        storage: multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, path.join(__dirname, '..', 'public', 'uploads'));
            },
            filename: (req, file, cb) => {
                const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
                cb(null, uniqueName);
            }
        }),
        limits: { fileSize: 500 * 1024 },
        fileFilter: (req, file, cb) => {
            const allowedTypes = /jpeg|jpg|png/;
            const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
            const mimetype = allowedTypes.test(file.mimetype);
            if (mimetype && extname) {
                return cb(null, true);
            } else {
                cb(new Error('Only .jpg, .jpeg, and .png files are allowed'));
            }
        }
    }).single('profileImage');

    upload(req, res, async function(err) {
        try {
            if (err) {
                return res.render('auth/donor-login', { 
                    error: err.message,
                    success: null 
                });
            }

            const { name, age, bloodGroup, contact, address, username, mobile, password, confirm_password } = req.body;

            // Validation
            if (!name || !age || !bloodGroup || !contact || !address || !username || !mobile || !password) {
                return res.render('auth/donor-login', { 
                    error: 'All fields are required',
                    success: null 
                });
            }

            if (password !== confirm_password) {
                return res.render('auth/donor-login', { 
                    error: 'Passwords do not match',
                    success: null 
                });
            }

            const donors = db.getDonors();
            if (donors.some(d => d.username === username)) {
                return res.render('auth/donor-login', { 
                    error: 'Username already exists',
                    success: null 
                });
            }

            if (donors.some(d => d.mobile === mobile)) {
                return res.render('auth/donor-login', { 
                    error: 'Mobile number already registered',
                    success: null 
                });
            }

            // Generate unique donor ID using counter
            const donorId = db.getNextDonorId();
            
            const hashedPassword = await bcrypt.hash(password, 10);
            
            const newDonor = {
                id: donorId,
                name,
                age: parseInt(age),
                bloodGroup,
                contact,
                address,
                username,
                mobile,
                password: hashedPassword,
                profileImage: req.file ? `/uploads/${req.file.filename}` : null,
                status: 'active',
                registrationDate: new Date().toISOString(),
                lastDonationDate: null,
                isEligible: true,
                totalDonations: 0
            };

            donors.push(newDonor);
            if (db.saveDonors(donors)) {
                res.render('auth/donor-login', { 
                    error: null,
                    success: `Registration successful! Your Donor ID is: ${donorId}. Please login with your credentials.`
                });
            } else {
                res.render('auth/donor-login', { 
                    error: 'Registration failed. Please try again.',
                    success: null 
                });
            }
        } catch (error) {
            console.error('Registration error:', error);
            res.render('auth/donor-login', { 
                error: 'Server error during registration',
                success: null 
            });
        }
    });
});

module.exports = router;
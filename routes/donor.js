const express = require('express');
const router = express.Router();
const { checkDonorAuth } = require('../middleware/auth');
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const moment = require('moment');

// configure multer for profile images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'public', 'uploads'));
    },
    filename: (req, file, cb) => {
        const id = (req.session && req.session.user && req.session.user.id) || Date.now();
        const uniqueName = `${id}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 500 * 1024 }, // 500KB maximum
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

// ==================== হাসপাতাল ডাটাবেস ====================
const hospitalDatabase = [
    // ঢাকা বিভাগ
    {
        id: 1,
        name: "Dhaka Medical College Hospital",
        city: "Dhaka",
        area: "Shahbag",
        lat: 23.725,
        lng: 90.395,
        address: "Dhaka Medical College, Shahbag, Dhaka",
        phone: "01769000911",
        type: "Government"
    },
    {
        id: 2,
        name: "Square Hospital",
        city: "Dhaka",
        area: "Panthapath",
        lat: 23.735,
        lng: 90.392,
        address: "18/F, West Panthapath, Dhaka",
        phone: "01714000001",
        type: "Private"
    },
    {
        id: 3,
        name: "Apollo Hospital Dhaka",
        city: "Dhaka",
        area: "Bashundhara",
        lat: 23.745,
        lng: 90.385,
        address: "Plot 81, Block E, Bashundhara, Dhaka",
        phone: "01769000001",
        type: "Private"
    },
    {
        id: 4,
        name: "United Hospital",
        city: "Dhaka",
        area: "Gulshan",
        lat: 23.755,
        lng: 90.375,
        address: "Plot 15, Road 71, Gulshan, Dhaka",
        phone: "01769000002",
        type: "Private"
    },
    {
        id: 5,
        name: "Ibn Sina Hospital",
        city: "Dhaka",
        area: "Dhanmondi",
        lat: 23.725,
        lng: 90.405,
        address: "House 47, Road 9/A, Dhanmondi, Dhaka",
        phone: "01769000003",
        type: "Private"
    },
    
    // রাজশাহী বিভাগ
    {
        id: 6,
        name: "Rajshahi Medical College Hospital",
        city: "Rajshahi",
        area: "Medical College Road",
        lat: 24.375,
        lng: 88.605,
        address: "Rajshahi Medical College, Rajshahi",
        phone: "01769000004",
        type: "Government"
    },
    {
        id: 7,
        name: "Ibn Sina Rajshahi",
        city: "Rajshahi",
        area: "Shaheb Bazar",
        lat: 24.365,
        lng: 88.595,
        address: "Shaheb Bazar, Rajshahi",
        phone: "01769000005",
        type: "Private"
    },
    {
        id: 8,
        name: "Islami Bank Hospital Rajshahi",
        city: "Rajshahi",
        area: "Laksmipur",
        lat: 24.385,
        lng: 88.615,
        address: "Laksmipur, Rajshahi",
        phone: "01769000006",
        type: "Private"
    },
    
    // চট্টগ্রাম বিভাগ
    {
        id: 9,
        name: "Chittagong Medical College Hospital",
        city: "Chittagong",
        area: "Anderkilla",
        lat: 22.345,
        lng: 91.825,
        address: "Chittagong Medical College, Chittagong",
        phone: "01769000007",
        type: "Government"
    },
    
    // খুলনা বিভাগ
    {
        id: 10,
        name: "Khulna Medical College Hospital",
        city: "Khulna",
        area: "Boyra",
        lat: 22.815,
        lng: 89.565,
        address: "Khulna Medical College, Khulna",
        phone: "01769000008",
        type: "Government"
    },
    
    // সিলেট বিভাগ
    {
        id: 11,
        name: "Sylhet MAG Osmani Medical College",
        city: "Sylhet",
        area: "Medical College Road",
        lat: 24.895,
        lng: 91.875,
        address: "Sylhet Medical College, Sylhet",
        phone: "01769000009",
        type: "Government"
    }
];

// ==================== নোটিফিকেশন স্টোরেজ ====================
let notifications = [];

// ==================== API Routes ====================

// API: হাসপাতাল সার্চ (গুগল স্টাইল)
router.get('/api/search-hospitals', checkDonorAuth, (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query || query.length < 2) {
            return res.json({ success: true, hospitals: [] });
        }
        
        const searchTerm = query.toLowerCase();
        
        const results = hospitalDatabase.filter(hospital => {
            return (
                hospital.name.toLowerCase().includes(searchTerm) ||
                hospital.city.toLowerCase().includes(searchTerm) ||
                hospital.area.toLowerCase().includes(searchTerm) ||
                hospital.address.toLowerCase().includes(searchTerm)
            );
        }).map(h => ({
            id: h.id,
            name: h.name,
            city: h.city,
            area: h.area,
            address: h.address,
            lat: h.lat,
            lng: h.lng,
            phone: h.phone,
            type: h.type
        }));
        
        res.json({ 
            success: true, 
            count: results.length,
            hospitals: results.slice(0, 10)
        });
        
    } catch (error) {
        console.error('Hospital search error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// API: হাসপাতালের বিস্তারিত তথ্য
router.get('/api/hospital-details', checkDonorAuth, (req, res) => {
    try {
        const { id } = req.query;
        const hospital = hospitalDatabase.find(h => h.id == id);
        
        if (hospital) {
            res.json({ success: true, hospital });
        } else {
            res.json({ success: false, message: 'Hospital not found' });
        }
    } catch (error) {
        console.error('Error getting hospital details:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// API: এলিজিবল ডোনার খুঁজুন
router.get('/api/emergency-donors', checkDonorAuth, (req, res) => {
    try {
        const { bloodGroup } = req.query;
        
        if (!bloodGroup) {
            return res.status(400).json({ success: false, error: 'Blood group is required' });
        }
        
        const donors = db.getDonors();
        const today = moment();
        
        // এলিজিবল ডোনার ফিল্টার
        const eligibleDonors = donors.filter(d => {
            if (d.bloodGroup !== bloodGroup) return false;
            if (d.status !== 'active') return false;
            
            // ৯০ দিনের নিয়ম চেক
            if (!d.lastDonationDate) return true;
            
            const lastDonation = moment(d.lastDonationDate);
            const daysSinceDonation = today.diff(lastDonation, 'days');
            return daysSinceDonation >= 90;
        }).map(d => ({
            id: d.id,
            name: d.name,
            bloodGroup: d.bloodGroup,
            contact: d.contact,
            mobile: d.mobile,
            address: d.address,
            age: d.age,
            lastDonationDate: d.lastDonationDate,
            totalDonations: d.totalDonations || 0
        }));
        
        res.json({ 
            success: true, 
            count: eligibleDonors.length,
            donors: eligibleDonors 
        });
        
    } catch (error) {
        console.error('Error finding emergency donors:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// API: ইমার্জেন্সি রিকোয়েস্ট পাঠান
router.post('/api/send-emergency-request', checkDonorAuth, (req, res) => {
    try {
        const { 
            donorIds, 
            bloodGroup, 
            hospital, 
            message, 
            quantity,
            urgency,
            location,
            requesterId 
        } = req.body;
        
        const requester = db.getDonorById(requesterId);
        const hospitalInfo = hospitalDatabase.find(h => h.name === hospital) || { name: hospital };
        
        const requestId = 'REQ-' + Date.now();
        const requests = [];
        
        donorIds.forEach(donorId => {
            const donor = db.getDonorById(donorId);
            if (donor) {
                // নোটিফিকেশন তৈরি
                const notification = {
                    id: 'NOT-' + Date.now() + '-' + donorId,
                    donorId: donorId,
                    requestId: requestId,
                    title: '🚨 Emergency Blood Request',
                    message: `${requester.name} needs ${quantity} bag(s) of ${bloodGroup} blood at ${hospitalInfo.name}`,
                    details: {
                        requesterName: requester.name,
                        requesterContact: requester.contact,
                        bloodGroup: bloodGroup,
                        hospital: hospitalInfo.name,
                        hospitalAddress: hospitalInfo.address,
                        quantity: quantity,
                        urgency: urgency,
                        message: message,
                        location: location,
                        requestedAt: new Date().toISOString()
                    },
                    status: 'pending',
                    read: false
                };
                
                notifications.push(notification);
                requests.push({
                    donorId: donorId,
                    donorName: donor.name,
                    status: 'sent'
                });
                
                // SMS পাঠান (যদি API থাকে)
                sendEmergencySMS(donor.mobile, notification);
            }
        });
        
        res.json({ 
            success: true, 
            requestId: requestId,
            message: `Request sent to ${requests.length} donors`,
            requests: requests
        });
        
    } catch (error) {
        console.error('Error sending emergency request:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// API: ডোনারের নোটিফিকেশন দেখুন
router.get('/api/my-notifications', checkDonorAuth, (req, res) => {
    try {
        const donorId = req.session.user.id;
        const donorNotifications = notifications
            .filter(n => n.donorId === donorId)
            .sort((a, b) => new Date(b.details.requestedAt) - new Date(a.details.requestedAt));
        
        res.json({ 
            success: true, 
            count: donorNotifications.length,
            notifications: donorNotifications 
        });
        
    } catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// API: নোটিফিকেশন read হিসেবে মার্ক করুন
router.post('/api/mark-notification-read', checkDonorAuth, (req, res) => {
    try {
        const { notificationId } = req.body;
        const notification = notifications.find(n => n.id === notificationId);
        
        if (notification) {
            notification.read = true;
        }
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error marking notification:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ==================== নিকটস্থ হাসপাতাল API (নতুন যোগ করা) ====================

// API: নিকটস্থ হাসপাতাল খুঁজুন (Nearby Hospitals)
router.get('/api/nearby-hospitals', checkDonorAuth, (req, res) => {
    try {
        const { lat, lng } = req.query;
        
        // ভ্যালিডেশন
        if (!lat || !lng) {
            return res.status(400).json({ 
                success: false, 
                error: 'Location (lat/lng) is required' 
            });
        }

        const userLat = parseFloat(lat);
        const userLng = parseFloat(lng);
        
        // হাসপাতাল ডাটাবেস থেকে দূরত্ব গণনা করে নিকটস্থ হাসপাতাল বের করুন
        const nearbyHospitals = hospitalDatabase.map(hospital => {
            // দূরত্ব গণনা (km-এ)
            const distance = calculateDistance(
                userLat, 
                userLng, 
                hospital.lat, 
                hospital.lng
            );
            
            return {
                id: hospital.id,
                name: hospital.name,
                city: hospital.city,
                area: hospital.area,
                address: hospital.address,
                phone: hospital.phone,
                type: hospital.type,
                lat: hospital.lat,
                lng: hospital.lng,
                distance: distance, // কিমি
                distanceText: distance < 1 
                    ? `${Math.round(distance * 1000)} m away` 
                    : `${distance.toFixed(1)} km away`
            };
        })
        .filter(h => h.distance < 100) // ১০০ কিমির মধ্যে
        .sort((a, b) => a.distance - b.distance) // কাছেরটা আগে
        .slice(0, 15); // সর্বোচ্চ ১৫টি
        
        res.json({ 
            success: true, 
            count: nearbyHospitals.length,
            hospitals: nearbyHospitals,
            userLocation: { lat: userLat, lng: userLng }
        });
        
    } catch (error) {
        console.error('Error finding nearby hospitals:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
});

// ==================== ইউটিলিটি ফাংশন ====================

// দূরত্ব গণনার ফাংশন (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    return Math.round(distance * 10) / 10; // 1 decimal place
}

function deg2rad(deg) {
    return deg * (Math.PI/180);
}

// SMS পাঠানোর ফাংশন (ডেমো)
function sendEmergencySMS(phoneNumber, notification) {
    console.log('\n📱 ====== EMERGENCY SMS SENT ======');
    console.log(`To: ${phoneNumber}`);
    console.log(`Title: ${notification.title}`);
    console.log(`Message: ${notification.message}`);
    console.log(`Hospital: ${notification.details.hospital}`);
    console.log(`Location: ${notification.details.location}`);
    console.log('====================================\n');
}

// ==================== ডোনার রুটস ====================

// Donor Dashboard
router.get('/dashboard', checkDonorAuth, (req, res) => {
    const donor = db.getDonorById(req.session.user.id);
    const donations = db.getDonationsByDonorId(donor.id);
    
    // এলিজিবিলিটি ক্যালকুলেশন
    let eligibilityStatus = {
        isEligible: true,
        nextEligibleDate: null,
        daysRemaining: 0
    };

    if (donor.lastDonationDate) {
        const lastDonation = moment(donor.lastDonationDate);
        const today = moment();
        const daysSinceDonation = today.diff(lastDonation, 'days');
        
        if (daysSinceDonation < 90) {
            eligibilityStatus.isEligible = false;
            eligibilityStatus.nextEligibleDate = lastDonation.add(90, 'days').format('YYYY-MM-DD');
            eligibilityStatus.daysRemaining = 90 - daysSinceDonation;
        }
    }
    
    // আনরিড নোটিফিকেশন কাউন্ট
    const unreadCount = notifications.filter(n => n.donorId === donor.id && !n.read).length;

    res.render('donor/dashboard', { 
        user: req.session.user, 
        donor, 
        donations: donations.slice(0, 5),
        eligibilityStatus,
        unreadCount
    });
});

// Notifications Page
router.get('/notifications', checkDonorAuth, (req, res) => {
    const donor = db.getDonorById(req.session.user.id);
    res.render('donor/notifications', { 
        user: req.session.user, 
        donor 
    });
});

// Profile
router.get('/profile', checkDonorAuth, (req, res) => {
    const donor = db.getDonorById(req.session.user.id);
    res.render('donor/profile', { 
        user: req.session.user, 
        donor, 
        success: null, 
        error: null 
    });
});

// Update Profile
router.post('/profile/update', checkDonorAuth, upload.single('profileImage'), (req, res) => {
    try {
        const donor = db.getDonorById(req.session.user.id);
        const { name, age, contact, address } = req.body;
        
        const updatedDonor = { ...donor, name, age, contact, address };

        if (req.file) {
            updatedDonor.profileImage = `/uploads/${req.file.filename}`;
        }

        if (db.updateDonor(donor.id, updatedDonor)) {
            res.render('donor/profile', { 
                user: req.session.user, 
                donor: updatedDonor, 
                success: 'Profile updated successfully', 
                error: null 
            });
        } else {
            throw new Error('Failed to update profile');
        }
    } catch (error) {
        const donor = db.getDonorById(req.session.user.id);
        res.render('donor/profile', { 
            user: req.session.user, 
            donor, 
            success: null, 
            error: error.message 
        });
    }
});

// History
router.get('/history', checkDonorAuth, (req, res) => {
    const donor = db.getDonorById(req.session.user.id);
    const donations = db.getDonationsByDonorId(donor.id);
    donations.sort((a, b) => new Date(b.donationDate) - new Date(a.donationDate));
    res.render('donor/history', { user: req.session.user, donor, donations });
});

// Eligibility
router.get('/eligibility', checkDonorAuth, (req, res) => {
    const donor = db.getDonorById(req.session.user.id);
    
    let eligibilityInfo = {
        isEligible: true,
        lastDonationDate: donor.lastDonationDate || null,
        nextEligibleDate: null,
        daysRemaining: 0,
        totalDonations: db.getDonationsByDonorId(donor.id).length
    };

    if (donor.lastDonationDate) {
        const lastDonation = moment(donor.lastDonationDate);
        const today = moment();
        const daysSinceDonation = today.diff(lastDonation, 'days');
        
        if (daysSinceDonation < 90) {
            eligibilityInfo.isEligible = false;
            eligibilityInfo.nextEligibleDate = lastDonation.add(90, 'days').format('YYYY-MM-DD');
            eligibilityInfo.daysRemaining = 90 - daysSinceDonation;
        }
    }

    res.render('donor/eligibility', { 
        user: req.session.user, 
        donor, 
        eligibility: eligibilityInfo 
    });
});

// Emergency Page
router.get('/emergency', checkDonorAuth, (req, res) => {
    const donor = db.getDonorById(req.session.user.id);
    res.render('donor/emergency', { 
        user: req.session.user, 
        donor 
    });
});

// Public Donors
router.get('/public-donors', (req, res) => {
    const donors = db.getDonors();
    const publicDonors = donors.map(d => ({
        name: d.name,
        bloodGroup: d.bloodGroup,
        age: d.age,
        address: d.address,
        status: d.status,
        isEligible: d.isEligible
    }));
    res.render('donor/public-donors', { user: req.session.user, donors: publicDonors });
});

// Search
router.get('/search', checkDonorAuth, (req, res) => {
    const { bloodGroup } = req.query;
    const donors = db.getDonors();
    
    const filtered = donors.filter(d => 
        d.bloodGroup === bloodGroup && d.status === 'active'
    ).map(d => ({
        name: d.name,
        bloodGroup: d.bloodGroup,
        age: d.age,
        address: d.address,
        contact: d.contact
    }));

    res.render('donor/search-results', { user: req.session.user, donors: filtered, bloodGroup });
});

module.exports = router;
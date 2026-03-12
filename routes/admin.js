const express = require('express');
const router = express.Router();
const { checkAdminAuth } = require('../middleware/auth');
const db = require('../config/database');
const moment = require('moment');

// Apply admin auth to all routes
router.use(checkAdminAuth);

// Admin Dashboard
router.get('/dashboard', (req, res) => {
    const donors = db.getDonors();
    const donations = db.getDonations();
    
    const stats = {
        totalDonors: donors.length,
        totalDonations: donations.length,
        activeDonors: donors.filter(d => d.status === 'active').length,
        eligibleDonors: donors.filter(d => d.isEligible).length
    };

    res.render('admin/dashboard', { user: req.session.user, stats });
});

// Manage Donors
router.get('/donors', (req, res) => {
    const donors = db.getDonors();
    res.render('admin/donors', { user: req.session.user, donors });
});

// Add Donor Form
router.get('/donors/add', (req, res) => {
    res.render('admin/add-donor', { user: req.session.user });
});

// Edit Donor Form
router.get('/donors/edit/:id', (req, res) => {
    const donor = db.getDonorById(req.params.id);
    if (donor) {
        res.render('admin/edit-donor', { user: req.session.user, donor });
    } else {
        res.redirect('/admin/donors');
    }
});

// Update Donor
router.post('/donors/update/:id', (req, res) => {
    const { name, age, bloodGroup, contact, address, status } = req.body;
    const updatedDonor = {
        name,
        age,
        bloodGroup,
        contact,
        address,
        status
    };

    if (db.updateDonor(req.params.id, updatedDonor)) {
        res.redirect('/admin/donors');
    } else {
        res.status(400).send('Error updating donor');
    }
});

// Delete Donor
router.post('/donors/delete/:id', (req, res) => {
    if (db.deleteDonor(req.params.id)) {
        res.redirect('/admin/donors');
    } else {
        res.status(400).send('Error deleting donor');
    }
});

// Search Donors by Blood Group
router.get('/donors/search', (req, res) => {
    const { bloodGroup } = req.query;
    const donors = db.getDonors();
    const filtered = donors.filter(d => d.bloodGroup === bloodGroup);
    res.render('admin/donors', { user: req.session.user, donors: filtered, searchQuery: bloodGroup });
});

// View Donations
router.get('/donations', (req, res) => {
    const donations = db.getDonations();
    const donors = db.getDonors();
    
    const donationsWithDonor = donations.map(d => ({
        ...d,
        donorName: donors.find(donor => donor.id === d.donorId)?.name || 'Unknown'
    }));

    res.render('admin/donations', { user: req.session.user, donations: donationsWithDonor });
});

// Record New Donation
router.post('/donations/add', (req, res) => {
    const { donorId, donationDate } = req.body;
    
    const newDonation = {
        id: `DON-${Date.now()}`,
        donorId,
        donationDate,
        recordedAt: new Date().toISOString()
    };

    db.addDonation(newDonation);
    
    // Update donor's last donation date
    const donor = db.getDonorById(donorId);
    if (donor) {
        donor.lastDonationDate = donationDate;
        donor.isEligible = false;
        db.updateDonor(donorId, donor);
    }

    res.redirect('/admin/donations');
});

// Emergency Donor Search
router.get('/emergency', (req, res) => {
    const { bloodGroup } = req.query;
    const donors = db.getDonors();
    
    const eligibleDonors = donors.filter(d => 
        d.bloodGroup === bloodGroup && 
        d.isEligible && 
        d.status === 'active'
    );

    res.render('admin/emergency', { user: req.session.user, donors: eligibleDonors, bloodGroup });
});

// Area-wise Donor Listing// Area-wise Donor Listing with Filters
router.get('/donors/by-area', checkAdminAuth, (req, res) => {
    const donors = db.getDonors();
    
    // ফিল্টার অপশন
    const filterBloodGroup = req.query.bloodGroup || '';
    const filterStatus = req.query.status || '';
    const filterArea = req.query.area || '';
    const filterEligible = req.query.eligible || '';
    
    // ফিল্টার প্রয়োগ
    let filteredDonors = donors.filter(donor => {
        let match = true;
        
        if (filterBloodGroup && donor.bloodGroup !== filterBloodGroup) match = false;
        if (filterStatus && donor.status !== filterStatus) match = false;
        if (filterEligible && donor.isEligible.toString() !== filterEligible) match = false;
        if (filterArea && !donor.address.toLowerCase().includes(filterArea.toLowerCase())) match = false;
        
        return match;
    });
    
    // এলাকা অনুযায়ী গ্রুপিং
    const areas = {};
    
    filteredDonors.forEach(donor => {
        // এলাকা এক্সট্রাক্ট করুন (address থেকে প্রথম অংশ)
        let area = donor.address.split(',')[0].trim();
        if (!area) area = 'Unknown Area';
        
        if (!areas[area]) {
            areas[area] = {
                name: area,
                donors: [],
                count: 0,
                bloodGroups: {}
            };
        }
        
        areas[area].donors.push(donor);
        areas[area].count++;
        
        // ব্লাড গ্রুপ কাউন্ট
        const bg = donor.bloodGroup;
        areas[area].bloodGroups[bg] = (areas[area].bloodGroups[bg] || 0) + 1;
    });
    
    // এলাকা অনুযায়ী সাজানো
    const sortedAreas = Object.values(areas).sort((a, b) => b.count - a.count);
    
    // পরিসংখ্যান
    const stats = {
        totalDonors: filteredDonors.length,
        totalAreas: sortedAreas.length,
        activeDonors: filteredDonors.filter(d => d.status === 'active').length,
        eligibleDonors: filteredDonors.filter(d => d.isEligible).length
    };
    
    res.render('admin/area-listing', { 
        user: req.session.user, 
        areas: sortedAreas,
        stats: stats,
        filters: {
            bloodGroup: filterBloodGroup,
            status: filterStatus,
            area: filterArea,
            eligible: filterEligible
        }
    });
});
// Monthly Donation Report
router.get('/reports/monthly', (req, res) => {
    const { month, year } = req.query;
    const currentMonth = month || moment().format('MM');
    const currentYear = year || moment().format('YYYY');
    
    const donations = db.getDonations();
    const donors = db.getDonors();
    
    const monthlyDonations = donations.filter(d => {
        const donationDate = moment(d.donationDate);
        return donationDate.format('MM') === currentMonth && 
               donationDate.format('YYYY') === currentYear;
    });

    const report = {
        month: currentMonth,
        year: currentYear,
        totalDonations: monthlyDonations.length,
        donations: monthlyDonations.map(d => ({
            ...d,
            donorName: donors.find(donor => donor.id === d.donorId)?.name || 'Unknown'
        }))
    };

    res.render('admin/monthly-report', { user: req.session.user, report });
});

// Upcoming Eligibility Reminder
router.get('/eligibility/upcoming', (req, res) => {
    const donors = db.getDonors();
    const today = moment();
    
    const upcomingEligible = donors.filter(d => {
        if (d.lastDonationDate) {
            const lastDonation = moment(d.lastDonationDate);
            const daysSinceDonation = today.diff(lastDonation, 'days');
            // Will be eligible in next 30 days
            return daysSinceDonation >= 60 && daysSinceDonation < 90;
        }
        return false;
    });

    res.render('admin/upcoming-eligible', { user: req.session.user, donors: upcomingEligible });
});

module.exports = router;
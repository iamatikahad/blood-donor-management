const db = require('../config/database');
const bcrypt = require('bcryptjs');

class Donor {
    constructor(donorData) {
        this.id = donorData.id || `DON-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        this.name = donorData.name;
        this.age = donorData.age;
        this.bloodGroup = donorData.bloodGroup;
        this.contact = donorData.contact;
        this.address = donorData.address;
        this.username = donorData.username;
        this.mobile = donorData.mobile;
        this.password = donorData.password;
        this.profileImage = donorData.profileImage || null;
        this.status = donorData.status || 'active';
        this.registrationDate = donorData.registrationDate || new Date().toISOString();
        this.lastDonationDate = donorData.lastDonationDate || null;
        this.isEligible = donorData.isEligible !== undefined ? donorData.isEligible : true;
        this.totalDonations = donorData.totalDonations || 0;
    }

    // Save donor to database
    async save() {
        try {
            const donors = db.getDonors();
            
            // Hash password if it's plain text
            if (this.password && !this.password.startsWith('$2a$')) {
                this.password = await bcrypt.hash(this.password, 10);
            }
            
            donors.push(this);
            return db.saveDonors(donors);
        } catch (error) {
            console.error('Error saving donor:', error);
            return false;
        }
    }

    // Update donor
    async update(updateData) {
        try {
            const donors = db.getDonors();
            const index = donors.findIndex(d => d.id === this.id);
            
            if (index !== -1) {
                // Update fields
                Object.keys(updateData).forEach(key => {
                    if (updateData[key] !== undefined) {
                        this[key] = updateData[key];
                    }
                });
                
                donors[index] = this;
                return db.saveDonors(donors);
            }
            return false;
        } catch (error) {
            console.error('Error updating donor:', error);
            return false;
        }
    }

    // Delete donor
    async delete() {
        try {
            return db.deleteDonor(this.id);
        } catch (error) {
            console.error('Error deleting donor:', error);
            return false;
        }
    }

    // Check eligibility (90-day rule)
    checkEligibility() {
        if (!this.lastDonationDate) {
            return {
                eligible: true,
                message: 'You are eligible to donate blood.',
                nextEligibleDate: null,
                daysRemaining: 0
            };
        }

        const lastDonation = new Date(this.lastDonationDate);
        const today = new Date();
        const daysSinceDonation = Math.floor((today - lastDonation) / (1000 * 60 * 60 * 24));

        if (daysSinceDonation >= 90) {
            return {
                eligible: true,
                message: 'You are eligible to donate blood.',
                nextEligibleDate: null,
                daysRemaining: 0
            };
        } else {
            const nextEligible = new Date(lastDonation);
            nextEligible.setDate(nextEligible.getDate() + 90);
            const daysRemaining = 90 - daysSinceDonation;

            return {
                eligible: false,
                message: `You are not eligible yet. ${daysRemaining} days remaining.`,
                nextEligibleDate: nextEligible.toISOString().split('T')[0],
                daysRemaining: daysRemaining
            };
        }
    }

    // Get donation history
    getDonationHistory() {
        try {
            const donations = db.getDonations();
            return donations.filter(d => d.donorId === this.id)
                .sort((a, b) => new Date(b.donationDate) - new Date(a.donationDate));
        } catch (error) {
            console.error('Error getting donation history:', error);
            return [];
        }
    }

    // Static methods
    static async findById(id) {
        try {
            const donors = db.getDonors();
            const donorData = donors.find(d => d.id === id);
            return donorData ? new Donor(donorData) : null;
        } catch (error) {
            console.error('Error finding donor by ID:', error);
            return null;
        }
    }

    static async findByUsername(username) {
        try {
            const donors = db.getDonors();
            const donorData = donors.find(d => d.username === username);
            return donorData ? new Donor(donorData) : null;
        } catch (error) {
            console.error('Error finding donor by username:', error);
            return null;
        }
    }

    static async findByMobile(mobile) {
        try {
            const donors = db.getDonors();
            const donorData = donors.find(d => d.mobile === mobile);
            return donorData ? new Donor(donorData) : null;
        } catch (error) {
            console.error('Error finding donor by mobile:', error);
            return null;
        }
    }

    static async findAll(filter = {}) {
        try {
            let donors = db.getDonors();
            
            // Apply filters
            if (filter.bloodGroup) {
                donors = donors.filter(d => d.bloodGroup === filter.bloodGroup);
            }
            if (filter.status) {
                donors = donors.filter(d => d.status === filter.status);
            }
            if (filter.isEligible !== undefined) {
                donors = donors.filter(d => d.isEligible === filter.isEligible);
            }
            if (filter.address) {
                donors = donors.filter(d => d.address.toLowerCase().includes(filter.address.toLowerCase()));
            }

            return donors.map(d => new Donor(d));
        } catch (error) {
            console.error('Error finding donors:', error);
            return [];
        }
    }

    static async findEligibleByBloodGroup(bloodGroup) {
        try {
            const donors = db.getDonors();
            const eligibleDonors = donors.filter(d => 
                d.bloodGroup === bloodGroup && 
                d.isEligible === true && 
                d.status === 'active'
            );
            
            // Check 90-day rule for each donor
            const today = new Date();
            return eligibleDonors.filter(donor => {
                if (!donor.lastDonationDate) return true;
                const lastDonation = new Date(donor.lastDonationDate);
                const daysSinceDonation = Math.floor((today - lastDonation) / (1000 * 60 * 60 * 24));
                return daysSinceDonation >= 90;
            }).map(d => new Donor(d));
        } catch (error) {
            console.error('Error finding eligible donors:', error);
            return [];
        }
    }

    static async getUpcomingEligible(days = 30) {
        try {
            const donors = db.getDonors();
            const today = new Date();
            const upcomingEligible = [];

            donors.forEach(donor => {
                if (donor.lastDonationDate && donor.status === 'active') {
                    const lastDonation = new Date(donor.lastDonationDate);
                    const eligibleDate = new Date(lastDonation);
                    eligibleDate.setDate(eligibleDate.getDate() + 90);
                    
                    const daysUntilEligible = Math.floor((eligibleDate - today) / (1000 * 60 * 60 * 24));
                    
                    if (daysUntilEligible > 0 && daysUntilEligible <= days) {
                        upcomingEligible.push({
                            donor: new Donor(donor),
                            eligibleDate: eligibleDate.toISOString().split('T')[0],
                            daysRemaining: daysUntilEligible
                        });
                    }
                }
            });

            return upcomingEligible.sort((a, b) => a.daysRemaining - b.daysRemaining);
        } catch (error) {
            console.error('Error getting upcoming eligible donors:', error);
            return [];
        }
    }

    static async authenticate(username, password, mobile) {
        try {
            const donor = await Donor.findByUsername(username);
            
            if (donor && donor.mobile === mobile) {
                const isValid = await bcrypt.compare(password, donor.password);
                if (isValid) {
                    return donor;
                }
            }
            return null;
        } catch (error) {
            console.error('Error authenticating donor:', error);
            return null;
        }
    }
}

module.exports = Donor;
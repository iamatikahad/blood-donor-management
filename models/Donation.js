const db = require('../config/database');

class Donation {
    constructor(donationData) {
        this.id = donationData.id || `DONATION-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        this.donorId = donationData.donorId;
        this.donationDate = donationData.donationDate || new Date().toISOString().split('T')[0];
        this.recordedAt = donationData.recordedAt || new Date().toISOString();
        this.location = donationData.location || 'Blood Bank';
        this.bloodGroup = donationData.bloodGroup || null;
        this.notes = donationData.notes || '';
        this.status = donationData.status || 'completed';
    }

    // Save donation to database
    async save() {
        try {
            const donations = db.getDonations();
            donations.push(this);
            
            // Update donor's last donation date
            const donors = db.getDonors();
            const donorIndex = donors.findIndex(d => d.id === this.donorId);
            
            if (donorIndex !== -1) {
                donors[donorIndex].lastDonationDate = this.donationDate;
                donors[donorIndex].isEligible = false;
                
                // Update total donations count
                donors[donorIndex].totalDonations = (donors[donorIndex].totalDonations || 0) + 1;
                
                db.saveDonors(donors);
            }
            
            return db.saveDonations(donations);
        } catch (error) {
            console.error('Error saving donation:', error);
            return false;
        }
    }

    // Update donation
    async update(updateData) {
        try {
            const donations = db.getDonations();
            const index = donations.findIndex(d => d.id === this.id);
            
            if (index !== -1) {
                Object.keys(updateData).forEach(key => {
                    if (updateData[key] !== undefined) {
                        this[key] = updateData[key];
                    }
                });
                
                donations[index] = this;
                return db.saveDonations(donations);
            }
            return false;
        } catch (error) {
            console.error('Error updating donation:', error);
            return false;
        }
    }

    // Delete donation
    async delete() {
        try {
            const donations = db.getDonations();
            const filtered = donations.filter(d => d.id !== this.id);
            return db.saveDonations(filtered);
        } catch (error) {
            console.error('Error deleting donation:', error);
            return false;
        }
    }

    // Static methods
    static async findById(id) {
        try {
            const donations = db.getDonations();
            const donationData = donations.find(d => d.id === id);
            return donationData ? new Donation(donationData) : null;
        } catch (error) {
            console.error('Error finding donation by ID:', error);
            return null;
        }
    }

    static async findByDonorId(donorId) {
        try {
            const donations = db.getDonations();
            return donations
                .filter(d => d.donorId === donorId)
                .map(d => new Donation(d))
                .sort((a, b) => new Date(b.donationDate) - new Date(a.donationDate));
        } catch (error) {
            console.error('Error finding donations by donor ID:', error);
            return [];
        }
    }

    static async findAll(filter = {}) {
        try {
            let donations = db.getDonations();
            
            // Apply filters
            if (filter.donorId) {
                donations = donations.filter(d => d.donorId === filter.donorId);
            }
            if (filter.startDate) {
                donations = donations.filter(d => new Date(d.donationDate) >= new Date(filter.startDate));
            }
            if (filter.endDate) {
                donations = donations.filter(d => new Date(d.donationDate) <= new Date(filter.endDate));
            }
            if (filter.bloodGroup) {
                donations = donations.filter(d => d.bloodGroup === filter.bloodGroup);
            }
            if (filter.status) {
                donations = donations.filter(d => d.status === filter.status);
            }

            return donations
                .map(d => new Donation(d))
                .sort((a, b) => new Date(b.donationDate) - new Date(a.donationDate));
        } catch (error) {
            console.error('Error finding donations:', error);
            return [];
        }
    }

    static async getMonthlyReport(month, year) {
        try {
            const donations = db.getDonations();
            const donors = db.getDonors();
            
            const monthStr = month.toString().padStart(2, '0');
            const yearStr = year.toString();
            
            const monthlyDonations = donations.filter(d => {
                const donationDate = new Date(d.donationDate);
                return donationDate.getMonth() + 1 === parseInt(month) && 
                       donationDate.getFullYear() === parseInt(year);
            });

            // Group by blood group
            const bloodGroupStats = {};
            const donorStats = [];

            monthlyDonations.forEach(donation => {
                // Blood group stats
                const donor = donors.find(d => d.id === donation.donorId);
                if (donor) {
                    const bg = donor.bloodGroup;
                    bloodGroupStats[bg] = (bloodGroupStats[bg] || 0) + 1;
                    
                    // Donor stats
                    donorStats.push({
                        donationId: donation.id,
                        donorName: donor.name,
                        bloodGroup: donor.bloodGroup,
                        donationDate: donation.donationDate,
                        location: donation.location
                    });
                }
            });

            return {
                month: month,
                year: year,
                totalDonations: monthlyDonations.length,
                bloodGroupStats: bloodGroupStats,
                donations: donorStats.sort((a, b) => new Date(b.donationDate) - new Date(a.donationDate))
            };
        } catch (error) {
            console.error('Error generating monthly report:', error);
            return null;
        }
    }

    static async getDonorStats(donorId) {
        try {
            const donations = await Donation.findByDonorId(donorId);
            const donor = await require('./Donor').findById(donorId);
            
            if (!donor) return null;

            const totalDonations = donations.length;
            const firstDonation = donations.length > 0 ? donations[donations.length - 1] : null;
            const lastDonation = donations.length > 0 ? donations[0] : null;

            // Calculate average gap between donations
            let totalGap = 0;
            for (let i = 0; i < donations.length - 1; i++) {
                const current = new Date(donations[i].donationDate);
                const next = new Date(donations[i + 1].donationDate);
                totalGap += Math.floor((current - next) / (1000 * 60 * 60 * 24));
            }
            const avgGap = donations.length > 1 ? Math.round(totalGap / (donations.length - 1)) : 0;

            return {
                donorId: donorId,
                donorName: donor.name,
                bloodGroup: donor.bloodGroup,
                totalDonations: totalDonations,
                firstDonation: firstDonation ? firstDonation.donationDate : null,
                lastDonation: lastDonation ? lastDonation.donationDate : null,
                averageGap: avgGap,
                isEligible: donor.isEligible,
                nextEligibleDate: donor.lastDonationDate ? 
                    new Date(new Date(donor.lastDonationDate).setDate(new Date(donor.lastDonationDate).getDate() + 90)) 
                        .toISOString().split('T')[0] : null
            };
        } catch (error) {
            console.error('Error getting donor stats:', error);
            return null;
        }
    }

    static async getOverallStats() {
        try {
            const donations = db.getDonations();
            const donors = db.getDonors();

            const totalDonations = donations.length;
            const uniqueDonors = new Set(donations.map(d => d.donorId)).size;
            
            // Donations by blood group
            const bloodGroupCounts = {};
            donors.forEach(donor => {
                const donorDonations = donations.filter(d => d.donorId === donor.id).length;
                bloodGroupCounts[donor.bloodGroup] = (bloodGroupCounts[donor.bloodGroup] || 0) + donorDonations;
            });

            // Monthly trend (last 6 months)
            const today = new Date();
            const monthlyTrend = [];
            for (let i = 5; i >= 0; i--) {
                const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const monthDonations = donations.filter(d => {
                    const dDate = new Date(d.donationDate);
                    return dDate.getMonth() === date.getMonth() && 
                           dDate.getFullYear() === date.getFullYear();
                }).length;
                
                monthlyTrend.push({
                    month: date.toLocaleString('default', { month: 'short' }),
                    year: date.getFullYear(),
                    count: monthDonations
                });
            }

            return {
                totalDonations: totalDonations,
                uniqueDonors: uniqueDonors,
                bloodGroupStats: bloodGroupCounts,
                monthlyTrend: monthlyTrend,
                averagePerMonth: Math.round(totalDonations / 12) || 0
            };
        } catch (error) {
            console.error('Error getting overall stats:', error);
            return null;
        }
    }
}

module.exports = Donation;
const fs = require('fs');
const path = require('path');

class Database {
    constructor() {
        this.dataPath = path.join(__dirname, '..', 'data');
        this.counterPath = path.join(this.dataPath, 'counter.json');
        this.initDataFiles();
        this.initCounter();
    }

    initDataFiles() {
        try {
            if (!fs.existsSync(this.dataPath)) {
                fs.mkdirSync(this.dataPath, { recursive: true });
            }

            const files = {
                'donors.json': [],
                'donations.json': [],
                'admins.json': []
            };

            Object.entries(files).forEach(([filename, defaultData]) => {
                const filepath = path.join(this.dataPath, filename);
                if (!fs.existsSync(filepath)) {
                    fs.writeFileSync(filepath, JSON.stringify(defaultData, null, 2));
                    console.log(`✅ Created ${filename}`);
                }
            });
        } catch (error) {
            console.error('Error initializing data files:', error);
        }
    }

    // Initialize counter for donor IDs
    initCounter() {
        try {
            if (!fs.existsSync(this.counterPath)) {
                const counter = { lastDonorId: 100 }; // 100 থেকে শুরু হবে, তাই প্রথমটি হবে 101
                fs.writeFileSync(this.counterPath, JSON.stringify(counter, null, 2));
                console.log('✅ Counter initialized with value: 100');
            }
        } catch (error) {
            console.error('Error initializing counter:', error);
        }
    }

    // Get next donor ID
    getNextDonorId() {
        try {
            const counter = JSON.parse(fs.readFileSync(this.counterPath, 'utf8'));
            counter.lastDonorId++;
            fs.writeFileSync(this.counterPath, JSON.stringify(counter, null, 2));
            
            // Format: BDH-{number} (e.g., BDH-101, BDH-102)
            return `BDH-${counter.lastDonorId}`;
        } catch (error) {
            console.error('Error getting next donor ID:', error);
            // Fallback to timestamp-based ID
            return `DON-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        }
    }

    // Read data
    readData(filename) {
        try {
            const filepath = path.join(this.dataPath, filename);
            if (!fs.existsSync(filepath)) {
                return [];
            }
            const data = fs.readFileSync(filepath, 'utf8');
            return JSON.parse(data) || [];
        } catch (error) {
            console.error(`Error reading ${filename}:`, error);
            return [];
        }
    }

    // Write data
    writeData(filename, data) {
        try {
            const filepath = path.join(this.dataPath, filename);
            fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error(`Error writing ${filename}:`, error);
            return false;
        }
    }

    // Donor methods
    getDonors() {
        try {
            return this.readData('donors.json');
        } catch (error) {
            console.error('Error getting donors:', error);
            return [];
        }
    }

    saveDonors(donors) {
        try {
            return this.writeData('donors.json', donors);
        } catch (error) {
            console.error('Error saving donors:', error);
            return false;
        }
    }

    getDonorById(id) {
        try {
            const donors = this.getDonors();
            return donors.find(d => d.id === id) || null;
        } catch (error) {
            console.error('Error getting donor by ID:', error);
            return null;
        }
    }

    getDonorByUsername(username) {
        try {
            const donors = this.getDonors();
            return donors.find(d => d.username === username);
        } catch (error) {
            console.error('Error getting donor by username:', error);
            return null;
        }
    }

    addDonor(donor) {
        try {
            const donors = this.getDonors();
            donors.push(donor);
            return this.saveDonors(donors);
        } catch (error) {
            console.error('Error adding donor:', error);
            return false;
        }
    }

    updateDonor(id, updatedDonor) {
        try {
            const donors = this.getDonors();
            const index = donors.findIndex(d => d.id === id);
            if (index !== -1) {
                donors[index] = { ...donors[index], ...updatedDonor };
                return this.saveDonors(donors);
            }
            return false;
        } catch (error) {
            console.error('Error updating donor:', error);
            return false;
        }
    }

    deleteDonor(id) {
        try {
            const donors = this.getDonors();
            const filtered = donors.filter(d => d.id !== id);
            return this.saveDonors(filtered);
        } catch (error) {
            console.error('Error deleting donor:', error);
            return false;
        }
    }

    // Donation methods
    getDonations() {
        try {
            return this.readData('donations.json');
        } catch (error) {
            console.error('Error getting donations:', error);
            return [];
        }
    }

    saveDonations(donations) {
        try {
            return this.writeData('donations.json', donations);
        } catch (error) {
            console.error('Error saving donations:', error);
            return false;
        }
    }

    getDonationsByDonorId(donorId) {
        try {
            const donations = this.getDonations();
            return donations.filter(d => d.donorId === donorId);
        } catch (error) {
            console.error('Error getting donations by donor ID:', error);
            return [];
        }
    }

    addDonation(donation) {
        try {
            const donations = this.getDonations();
            donations.push(donation);
            return this.saveDonations(donations);
        } catch (error) {
            console.error('Error adding donation:', error);
            return false;
        }
    }

    // Admin methods
    getAdmins() {
        try {
            return this.readData('admins.json');
        } catch (error) {
            console.error('Error getting admins:', error);
            return [];
        }
    }

    getAdminByUsername(username) {
        try {
            const admins = this.getAdmins();
            return admins.find(a => a.username === username);
        } catch (error) {
            console.error('Error getting admin by username:', error);
            return null;
        }
    }
}

module.exports = new Database();
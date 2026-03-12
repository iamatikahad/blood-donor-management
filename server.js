const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const expressLayouts = require('express-ejs-layouts');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============ SAFETY FEATURES START ============

// Global error handlers (সার্ভার ক্র্যাশ প্রতিরোধ)
process.on('uncaughtException', (err) => {
    console.error('❗ Uncaught Exception:', err);
    console.error('সার্ভার চলতে থাকবে...');
});

process.on('unhandledRejection', (err) => {
    console.error('❗ Unhandled Rejection:', err);
    console.error('সার্ভার চলতে থাকবে...');
});

// ============ SAFETY FEATURES END ============

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('✅ Data directory created');
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Uploads directory created');
}

// Initialize data files if they don't exist
const initDataFiles = async () => {
    try {
        // Check if admins.json exists and has admin
        const adminPath = path.join(dataDir, 'admins.json');
        let admins = [];
        
        if (fs.existsSync(adminPath)) {
            try {
                admins = JSON.parse(fs.readFileSync(adminPath, 'utf8'));
            } catch (e) {
                console.log('⚠️ admins.json corrupted, creating new one');
                admins = [];
            }
        }
        
        // Create default admin if no admin exists
        if (admins.length === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            admins = [{
                id: 'ADMIN001',
                username: 'admin',
                password: hashedPassword,
                name: 'System Administrator',
                email: 'admin@blooddonor.com',
                role: 'admin',
                createdAt: new Date().toISOString()
            }];
            fs.writeFileSync(adminPath, JSON.stringify(admins, null, 2));
            console.log('✅ Default admin created - Username: admin, Password: admin123');
        }

        // Check if donors.json exists and has test donor
        const donorsPath = path.join(dataDir, 'donors.json');
        let donors = [];
        
        if (fs.existsSync(donorsPath)) {
            try {
                donors = JSON.parse(fs.readFileSync(donorsPath, 'utf8'));
            } catch (e) {
                donors = [];
            }
        }
        
        // Create test donor if no donors exist
        if (donors.length === 0) {
            const hashedPassword = await bcrypt.hash('donor123', 10);
            donors.push({
                id: 'BDH-101',
                name: 'Test Donor',
                age: 28,
                bloodGroup: 'O+',
                contact: '01711111111',
                address: 'Dhaka, Bangladesh',
                username: 'test',
                mobile: '01711111111',
                password: hashedPassword,
                profileImage: null,
                status: 'active',
                registrationDate: new Date().toISOString(),
                lastDonationDate: null,
                isEligible: true,
                totalDonations: 0
            });
            fs.writeFileSync(donorsPath, JSON.stringify(donors, null, 2));
            console.log('✅ Test donor created - Username: test, Password: donor123');
        }

        // Check if donations.json exists
        const donationsPath = path.join(dataDir, 'donations.json');
        if (!fs.existsSync(donationsPath)) {
            fs.writeFileSync(donationsPath, JSON.stringify([], null, 2));
            console.log('✅ donations.json created');
        }

    } catch (error) {
        console.error('❌ Error initializing data files:', error);
    }
};

// Call init function
initDataFiles();

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// express-ejs-layouts configuration
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set("layout extractScripts", true);
app.set("layout extractStyles", true);

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session configuration with better security
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// ============ HEALTH CHECK ROUTES ============

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        time: new Date().toISOString(),
        message: 'Server is running smoothly',
        uptime: process.uptime()
    });
});

// Test route
app.get('/test', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Server Test</title>
                <style>
                    body { font-family: Arial; text-align: center; padding: 50px; background: #f0f8ff; }
                    .success { color: #28a745; font-size: 24px; }
                    .info { color: #17a2b8; margin: 20px; }
                </style>
            </head>
            <body>
                <h1 class="success">✅ Server is working perfectly!</h1>
                <p class="info">Time: ${new Date().toLocaleString()}</p>
                <p class="info">Port: ${PORT}</p>
                <p class="info">Environment: ${process.env.NODE_ENV || 'development'}</p>
                <a href="/">🏠 Go to Home</a>
            </body>
        </html>
    `);
});

// ============ ROUTES ============

// API Routes
try {
    const apiRoutes = require('./routes/api');
    app.use('/api', apiRoutes);
    console.log('✅ API routes loaded');
} catch (err) {
    console.error('❌ Error loading API routes:', err);
}

// Auth Routes
try {
    const authRoutes = require('./routes/auth');
    app.use('/auth', authRoutes);
    console.log('✅ Auth routes loaded');
} catch (err) {
    console.error('❌ Error loading auth routes:', err);
}

// Admin Routes
try {
    const adminRoutes = require('./routes/admin');
    app.use('/admin', adminRoutes);
    console.log('✅ Admin routes loaded');
} catch (err) {
    console.error('❌ Error loading admin routes:', err);
}

// Donor Routes
try {
    const donorRoutes = require('./routes/donor');
    app.use('/donor', donorRoutes);
    console.log('✅ Donor routes loaded');
} catch (err) {
    console.error('❌ Error loading donor routes:', err);
}

// Emergency Routes
try {
    const emergencyRoutes = require('./routes/emergency');
    app.use('/emergency', emergencyRoutes);
    console.log('✅ Emergency routes loaded');
} catch (err) {
    console.error('❌ Error loading emergency routes:', err);
}

// Home route
app.get('/', (req, res) => {
    try {
        res.render('index', { user: req.session.user || null });
    } catch (err) {
        console.error('Error rendering home page:', err);
        res.send(`
            <html>
                <head><title>Welcome</title></head>
                <body>
                    <h1>Blood Donor Management System</h1>
                    <p>Welcome to our system. Please <a href="/auth/donor-login">login</a> to continue.</p>
                </body>
            </html>
        `);
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/');
    });
});

// ============ ERROR HANDLING MIDDLEWARE ============

// 404 handler
app.use((req, res) => {
    res.status(404).send(`
        <html>
            <head>
                <title>Page Not Found</title>
                <style>
                    body { font-family: Arial; text-align: center; padding: 50px; background: #fff3f3; }
                    h1 { color: #dc3545; }
                    .box { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                </style>
            </head>
            <body>
                <div class="box">
                    <h1>404 - Page Not Found</h1>
                    <p>The page you are looking for does not exist.</p>
                    <a href="/">🏠 Go to Home</a>
                </div>
            </body>
        </html>
    `);
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    
    const message = process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : err.message;

    res.status(500).send(`
        <html>
            <head>
                <title>Server Error</title>
                <style>
                    body { font-family: Arial; text-align: center; padding: 50px; background: #fff3f3; }
                    h1 { color: #dc3545; }
                    .error-box { background: #f8d7da; padding: 20px; border-radius: 10px; margin: 20px; }
                    .home-link { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
                </style>
            </head>
            <body>
                <h1>500 - Server Error</h1>
                <div class="error-box">
                    <p>Sorry, something went wrong. Please try again later.</p>
                    ${process.env.NODE_ENV !== 'production' ? `<p>Error: ${message}</p>` : ''}
                </div>
                <a href="/" class="home-link">🏠 Go to Home</a>
            </body>
        </html>
    `);
});

// ============ START SERVER ============

// For local development
if (require.main === module) {
    app.listen(PORT, () => {
        console.log('\n🚀 ==================================');
        console.log(`✅ Server is running on http://localhost:${PORT}`);
        console.log(`🔍 Health check: http://localhost:${PORT}/health`);
        console.log(`🧪 Test page: http://localhost:${PORT}/test`);
        console.log(`👤 Donor login: http://localhost:${PORT}/auth/donor-login`);
        console.log(`🔐 Admin login (hidden): http://localhost:${PORT}/auth/admin-login`);
        console.log(`🚨 Emergency: http://localhost:${PORT}/emergency`);
        console.log('=================================\n');
    });
}

// Export for Render/Vercel
module.exports = app;

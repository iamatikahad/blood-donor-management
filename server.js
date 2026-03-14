// app.js (MongoDB সংস্করণ)
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const expressLayouts = require('express-ejs-layouts');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb'); // MongoDB যোগ করা হয়েছে

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============ SAFETY FEATURES START ============
process.on('uncaughtException', (err) => {
    console.error('❗ Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('❗ Unhandled Rejection:', err);
});
// ============ SAFETY FEATURES END ============

// MongoDB সংযোগ ও গ্লোবাল ভেরিয়েবল
let db;
let donorsCollection;
let adminsCollection;

async function connectToMongoDB() {
    try {
        const client = new MongoClient(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        await client.connect();
        console.log('✅ MongoDB connected successfully');

        db = client.db('bdh'); // আপনার ডাটাবেসের নাম
        donorsCollection = db.collection('donors');
        adminsCollection = db.collection('admins');

        // ইউনিক ইনডেক্স তৈরি
        await donorsCollection.createIndex({ username: 1 }, { unique: true });
        await donorsCollection.createIndex({ mobile: 1 }, { unique: true });
        await adminsCollection.createIndex({ username: 1 }, { unique: true });

        // ডিফল্ট ডাটা ইনিশিয়ালাইজ করুন
        await initializeDefaultData();
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

// ডিফল্ট অ্যাডমিন ও টেস্ট ডোনার তৈরি
async function initializeDefaultData() {
    try {
        // অ্যাডমিন চেক
        const adminCount = await adminsCollection.countDocuments();
        if (adminCount === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await adminsCollection.insertOne({
                id: 'ADMIN001',
                username: 'admin',
                password: hashedPassword,
                name: 'System Administrator',
                email: 'admin@blooddonor.com',
                role: 'admin',
                createdAt: new Date()
            });
            console.log('✅ Default admin created - Username: admin, Password: admin123');
        }

        // টেস্ট ডোনার চেক
        const donorCount = await donorsCollection.countDocuments();
        if (donorCount === 0) {
            const hashedPassword = await bcrypt.hash('donor123', 10);
            await donorsCollection.insertOne({
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
                registrationDate: new Date(),
                lastDonationDate: null,
                isEligible: true,
                totalDonations: 0
            });
            console.log('✅ Test donor created - Username: test, Password: donor123');
        }
    } catch (error) {
        console.error('❌ Error initializing default data:', error);
    }
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!require('fs').existsSync(uploadsDir)) {
    require('fs').mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Uploads directory created');
}

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

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// ============ HEALTH CHECK ROUTES ============
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        time: new Date().toISOString(),
        message: 'Server is running smoothly',
        uptime: process.uptime()
    });
});

app.get('/test', (req, res) => {
    res.send(`
        <html>
            <head><title>Server Test</title>
            <style>body{font-family:Arial;text-align:center;padding:50px;background:#f0f8ff;}.success{color:#28a745;font-size:24px;}.info{color:#17a2b8;margin:20px;}</style>
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

// Auth Routes (ইতিমধ্যে MongoDB-তে আপডেট করা হয়েছে)
try {
    const authRoutes = require('./routes/auth');
    app.use('/auth', authRoutes);
    console.log('✅ Auth routes loaded');
} catch (err) {
    console.error('❌ Error loading auth routes:', err);
}

// Admin Routes (JSON-নির্ভর হলে আপডেট করতে হবে, তবে সাধারণত auth.js-এ সব আছে)
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
        res.send('<h1>Blood Donor Management System</h1><p>Welcome. Please <a href="/auth/donor-login">login</a>.</p>');
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

// ============ ERROR HANDLING ============
app.use((req, res) => {
    res.status(404).send('<h1>404 - Page Not Found</h1><a href="/">Go Home</a>');
});

app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(500).send('<h1>500 - Server Error</h1><p>Please try again later.</p>');
});

// ============ START SERVER ============
// MongoDB সংযোগ শুরু করুন, তারপর সার্ভার চালু করুন
connectToMongoDB().then(() => {
    if (require.main === module) {
        app.listen(PORT, () => {
            console.log('\n🚀 ==================================');
            console.log(`✅ Server is running on http://localhost:${PORT}`);
            console.log(`🔍 Health check: http://localhost:${PORT}/health`);
            console.log(`🧪 Test page: http://localhost:${PORT}/test`);
            console.log(`👤 Donor login: http://localhost:${PORT}/auth/donor-login`);
            console.log(`🔐 Admin login: http://localhost:${PORT}/auth/admin-login`);
            console.log(`🚨 Emergency: http://localhost:${PORT}/emergency`);
            console.log('=================================\n');
        });
    }
});

module.exports = app;

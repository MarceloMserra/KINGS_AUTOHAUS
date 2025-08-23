require('dotenv').config();

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');

const app = express();

// ======================
// 🧪 MongoDB URI Verification
// ======================
console.log('✅ URI loaded from .env:', process.env.MONGO_URI);
if (!process.env.MONGO_URI.startsWith('mongodb+srv://')) {
    console.error('❌ Invalid URI detected! Please use mongodb+srv:// in .env');
    process.exit(1);
}

// ======================
// 🔗 MongoDB Atlas Connection
// ======================
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('🟢 Connected to MongoDB Atlas!'))
.catch(err => console.error('❌ Error connecting to MongoDB Atlas:\n', err));

// ======================
// 🔧 Handlebars Configuration with Enhanced Helpers
// ======================
app.engine('hbs', exphbs.engine({
    extname: 'hbs',
    defaultLayout: 'layout',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    helpers: {
        gt: (a, b) => a > b,
        lt: (a, b) => a < b,
        gte: (a, b) => a >= b,
        lte: (a, b) => a <= b,
        subtract: (a, b) => a - b,
        eq: (a, b) => a === b,
        ne: (a, b) => a !== b,
        divide: (a, b) => a / b,
        multiply: (a, b) => a * b,
        range: (start, end) => {
            const arr = [];
            for (let i = start; i >= end; i--) arr.push(i);
            return arr;
        },
        lookup: (obj, field) => obj[field],
        add: (a, b) => a + b,
        // Helper to format numbers with commas
        numberWithCommas: (num) => {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },
        // Helper to convert to uppercase
        uppercase: (str) => str ? str.toUpperCase() : '',
        // Helper to convert to lowercase
        lowercase: (str) => str ? str.toLowerCase() : '',
        // Helper to capitalize first letter
        capitalize: (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '',
        // Helper to check if array contains value
        includes: (array, value) => array && array.includes(value),
        // Helper to format date
        formatDate: (date) => {
            if (!date) return '';
            return new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        },
        // Helper to calculate estimated monthly payment
        calculateMonthlyPayment: (price, downPayment = 0, rate = 4.9, term = 60) => {
            const principal = price - downPayment;
            const monthlyRate = (rate / 100) / 12;
            const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
            return Math.round(monthlyPayment).toLocaleString();
        },
        // Helper to check if it's the first or last item
        isFirst: (index) => index === 0,
        isLast: (index, array) => index === array.length - 1,
        // Helper to get name initials
        getInitials: (firstName, lastName) => {
            return (firstName ? firstName.charAt(0) : '') + (lastName ? lastName.charAt(0) : '');
        }
    },
    // NOVO: Configuração para permitir acesso a propriedades não-próprias (prototype access)
    // Isso resolve o erro "Access has been denied to resolve the property because it is not an "own property" of its parent."
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true
    }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// ======================
// 🔧 Main Middlewares
// ======================
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' })); // Necessary to parse JSON from the frontend
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// ======================
// 🧠 Session and Flash Messages
// ======================
app.use(session({
    secret: process.env.SESSION_SECRET || 'kingsautohaus2024',
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
app.use(flash());

// ======================
// 🔐 Passport Configuration
// ======================
require('./config/auth')(passport);
app.use(passport.initialize());
app.use(passport.session());

// ======================
// 🌍 Global Variables and Message Middleware
// ======================
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    res.locals.user = req.user || null;
    
    // Add current year for templates
    res.locals.currentYear = new Date().getFullYear();
    
    // Add request info for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
        res.locals.requestPath = req.path;
        res.locals.requestMethod = req.method;
    }
    
    next();
});

// ======================
// 📊 Request Logging (Development)
// ======================
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`📡 ${req.method} ${req.path} - ${new Date().toLocaleTimeString()}`);
        next();
    });
}

// ======================
// 🌐 Route Configuration - CORRECTED ORDER
// ======================
const admin = require('./routes/admin');
const gas = require('./routes/gas_index');
const electric = require('./routes/electric_index');
const usuarios = require('./routes/usuarios'); // Move usuarios import here

// CORRECTED: Only include financing if the file exists
let financing;
try {
    financing = require('./routes/financing');
    console.log('✅ Financing routes loaded successfully');
} catch (error) {
    console.log('⚠️ Financing routes not found - skipping');
    financing = null;
}

// CORRECTED: Only include contact if the file exists
let contact;
try {
    contact = require('./routes/contact');
    console.log('✅ Contact routes loaded successfully');
} catch (error) {
    console.log('⚠️ Contact routes not found - skipping');
    contact = null;
}

// Route middlewares - IMPORTANT ORDER
// Routes with specific prefixes should come first
app.use('/admin', admin);
app.use('/gas', gas);
app.use('/electric', electric);

// Routes that might handle root paths or more generic paths should come after specific ones
if (financing) {
    app.use('/', financing);
}

// IMPORTANT: The 'contact' route should come BEFORE 'usuarios' if it has specific POST routes
// that might be caught by a more generic GET '/' in 'usuarios'.
if (contact) {
    app.use('/', contact); // This will mount the routes from contact.js, including /send-message
}

// IMPORTANT: 'usuarios' should be the last of the root-level routes to avoid conflicts
// as it often contains a catch-all '/' route for the homepage.
app.use('/', usuarios); 

// ======================
// 📝 API Routes for AJAX requests
// ======================
app.get('/api/models/:brand', async (req, res) => {
    try {
        const brand = req.params.brand;
        const GasModel = require('./models/GasModel');
        
        const models = await GasModel.distinct('t2', { 
            brand: new RegExp(brand, 'i'),
            status: 'available'
        });
        
        res.json(models.sort());
    } catch (error) {
        console.error('API models error:', error);
        res.status(500).json({ error: 'Unable to fetch models' });
    }
});

// ======================
// 📊 Health Check Endpoint
// ======================
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// ======================
// 🎯 Security Headers (Basic)
// ======================
app.use((req, res, next) => {
    // Basic security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Remove powered by header
    res.removeHeader('X-Powered-By');
    
    next();
});

// ======================
// 🚫 Error Handling Middleware
// ======================

// 404 Handler
app.use((req, res, next) => {
    res.status(404).render('404', {
        title: 'Page Not Found - KINGS AUTOHAUS',
        message: 'The page you are looking for does not exist.',
        layout: 'layout'
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('🚨 Application Error:', err);
    
    // Set default error values
    const status = err.status || 500;
    const message = status === 500 ? 'Internal Server Error' : err.message;
    
    // Log error details in development
    if (process.env.NODE_ENV === 'development') {
        console.error('Error Stack:', err.stack);
    }
    
    res.status(status).render('error', {
        title: `Error ${status} - KINGS AUTOHAUS`,
        message: message,
        error: process.env.NODE_ENV === 'development' ? err : {},
        layout: 'layout'
    });
});

// ======================
// 🚀 Server Configuration
// ======================
const PORT = process.env.PORT || 3000;

// Only start server if this file is run directly (not required as module)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`
🚗 KINGS AUTOHAUS Server Started Successfully!
📡 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🕒 Time: ${new Date().toLocaleString()}
🔗 URL: http://localhost:${PORT}
        `);
    });
}

// ======================
// 🚀 Exportation
// ======================
module.exports = app;

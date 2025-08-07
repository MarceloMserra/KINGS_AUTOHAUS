const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GasSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    brand: { // Vehicle Make
        type: String,
        required: true
    },
    t2: { // Vehicle Model Name (e.g., GT350 Coupe)
        type: String,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    priceStr: { // Formatted price for display (e.g., "58,100")
        type: String,
        required: true
    },
    topspeed: {
        type: Number,
        required: true
    },
    time60: {
        type: Number,
        required: true
    },
    mileage: {
        type: Number,
        required: true
    },
    engine: { // Engine size in Liters
        type: Number,
        required: true
    },
    cyl: { // Number of cylinders
        type: Number,
        required: true
    },
    gearbox: {
        type: String,
        required: true
    },
    transmission: {
        type: String,
        required: true
    },
    colour: { // Exterior Color
        type: String,
        required: true
    },
    interior: { // Interior Color/Material
        type: String,
        required: true
    },
    body: { // Body Type (e.g., 2 Door Coupe, SUV)
        type: String,
        required: true
    },
    drivetrain: { // (e.g., RWD, AWD)
        type: String,
        required: true
    },
    wheel: { // Wheel details (e.g., 18'' Aluminium)
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    safety: {
        type: String,
        required: true
    },
    technology: {
        type: String,
        required: true
    },
    image: {
        type: [String],
        required: false
    },
    date: {
        type: Date,
        default: Date.now
    },
    // NEW FIELDS FOR INVENTORY AND DETAILS PAGES
    stockNumber: { // Stock number for internal tracking
        type: String,
        required: false // Can be optional if not always available
    },
    vin: { // Vehicle Identification Number
        type: String,
        required: false // Can be optional
    },
    trim: { // Vehicle Trim Level (e.g., Denali AWD, Premium Plus)
        type: String,
        required: false
    },
    status: { // Vehicle status (available, sold, reserved, etc.)
        type: String,
        default: 'available'
    },
    views: { // Number of times the vehicle details page has been viewed
        type: Number,
        default: 0
    },
    featured: { // Whether the vehicle is featured on the homepage carousel
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('gas', GasSchema);

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GasSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    brand: { // NOVO CAMPO: Marca do carro
        type: String,
        required: true
    },
    t2: {
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
    priceStr: {
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
    engine: {
        type: Number,
        required: true
    },
    cyl: {
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
    colour: {
        type: String,
        required: true
    },
    interior: {
        type: String,
        required: true
    },
    body: {
        type: String,
        required: true
    },
    drivetrain: {
        type: String,
        required: true
    },
    wheel: {
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
    }
});

module.exports = mongoose.model('gas', GasSchema);

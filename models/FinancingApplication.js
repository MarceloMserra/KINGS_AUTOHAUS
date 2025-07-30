// models/FinancingApplication.js
const mongoose = require('mongoose');

const FinancingApplicationSchema = new mongoose.Schema({
    // 1. Applicant Information
    applicantFirstName: { type: String, required: true },
    applicantMiddleInitial: { type: String, maxlength: 1 },
    applicantLastName: { type: String, required: true },
    applicantAddress1: { type: String, required: true },
    applicantAddress2: { type: String },
    applicantCity: { type: String, required: true },
    applicantState: { type: String, required: true },
    applicantZip: { type: String, required: true },
    applicantSSN: { type: String, required: true },
    applicantDOB: { type: Date, required: true },
    applicantDriverLicenseNumber: { type: String, required: true },
    applicantDriverLicenseState: { type: String, required: true },
    applicantDriverLicenseExp: { type: String, required: true }, // Mês/Ano
    applicantMobilePhone: { type: String, required: true },
    applicantHomePhone: { type: String },
    applicantEmail: { type: String, required: true },
    timeAtResidenceYears: { type: Number, required: true },
    timeAtResidenceMonths: { type: Number, required: true },
    residenceType: { type: String, required: true },
    rentMortgage: { type: Number, required: true },

    // 2. Applicant Employment Information
    employerName: { type: String, required: true },
    employerType: { type: String, required: true },
    monthlyIncome: { type: Number, required: true },
    occupation: { type: String, required: true },
    employerAddress1: { type: String, required: true },
    employerAddress2: { type: String },
    employerCity: { type: String, required: true },
    employerState: { type: String, required: true },
    employerZip: { type: String, required: true },
    workPhone: { type: String },
    timeOnJobYears: { type: Number, required: true },
    timeOnJobMonths: { type: Number, required: true },

    // 3. Co-Buyer (Optional) - Todos os campos podem ser opcionais se hasCoBuyer for false
    hasCoBuyer: { type: Boolean, default: false },
    coBuyerFirstName: { type: String },
    coBuyerMiddleInitial: { type: String, maxlength: 1 },
    coBuyerLastName: { type: String },
    coBuyerAddress1: { type: String },
    coBuyerAddress2: { type: String },
    coBuyerCity: { type: String },
    coBuyerState: { type: String },
    coBuyerZip: { type: String },
    coBuyerSSN: { type: String },
    coBuyerDOB: { type: Date },
    coBuyerDriverLicenseNumber: { type: String },
    coBuyerDriverLicenseState: { type: String },
    coBuyerDriverLicenseExp: { type: String },
    coBuyerMobilePhone: { type: String },
    coBuyerHomePhone: { type: String },
    coBuyerEmail: { type: String },
    coBuyerTimeAtResidenceYears: { type: Number },
    coBuyerTimeAtResidenceMonths: { type: Number },
    coBuyerResidenceType: { type: String },
    coBuyerRentMortgage: { type: Number },
    coBuyerEmployerName: { type: String },
    coBuyerEmployerType: { type: String },
    coBuyerMonthlyIncome: { type: Number },
    coBuyerOccupation: { type: String },
    coBuyerEmployerAddress1: { type: String },
    coBuyerEmployerAddress2: { type: String },
    coBuyerEmployerCity: { type: String },
    coBuyerEmployerState: { type: String },
    coBuyerEmployerZip: { type: String },
    coBuyerWorkPhone: { type: String },
    coBuyerTimeOnJobYears: { type: Number },
    coBuyerTimeOnJobMonths: { type: Number },

    // 4. Vehicle Information
    vehicleToFinance: { type: String }, // Pode ser um ID ou apenas o nome/modelo
    stockNumber: { type: String },
    vehicleYear: { type: Number, required: true },
    vehicleMake: { type: String, required: true },
    vehicleModel: { type: String, required: true },
    vehicleTrim: { type: String },
    vehicleVin: { type: String, required: true },
    vehicleMileage: { type: Number, required: true },

    // 5. Additional Comments
    additionalComments: { type: String },

    // 6. Acknowledgment and Consent
    acknowledgmentConsent: { type: Boolean, required: true },

    // 7. Text Message Consent
    textMessageConsent: { type: Boolean, default: false },

    // Timestamp
    submissionDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FinancingApplication', FinancingApplicationSchema);
// models/FinancingApplication.js
const mongoose = require('mongoose');

const FinancingApplicationSchema = new mongoose.Schema({
    // 1. Applicant Information - Campos essenciais para identificação e histórico de moradia
    applicantFirstName: { type: String, required: true },
    applicantMiddleInitial: { type: String, maxlength: 1 }, // Opcional
    applicantLastName: { type: String, required: true },
    applicantAddress1: { type: String, required: true },
    applicantAddress2: { type: String }, // Opcional (apto, complemento)
    applicantCity: { type: String, required: true },
    applicantState: { type: String, required: true },
    applicantZip: { type: String, required: true },
    applicantSSN: { type: String, required: true },
    applicantDOB: { type: Date, required: true },
    applicantDriverLicenseNumber: { type: String, required: true }, // Essencial
    applicantDriverLicenseState: { type: String, required: true },  // Essencial
    applicantDriverLicenseExp: { type: String, required: true },    // Essencial (MM/YY)
    applicantMobilePhone: { type: String, required: true },
    applicantHomePhone: { type: String }, // Opcional
    applicantEmail: { type: String, required: true },
    timeAtResidenceYears: { type: Number, required: true }, // Essencial para estabilidade
    timeAtResidenceMonths: { type: Number, required: true }, // Essencial para estabilidade
    residenceType: { type: String, required: true }, // Essencial (Own, Rent, Other)
    rentMortgage: { type: Number, required: true }, // Essencial

    // 2. Applicant Employment Information - Campos essenciais para comprovação de renda e estabilidade
    employerName: { type: String, required: true },
    employerType: { type: String, required: true }, // Essencial (e.g., Full-time, Part-time, Self-employed)
    monthlyIncome: { type: Number, required: true },
    occupation: { type: String, required: true },
    employerAddress1: { type: String, required: true }, // Essencial
    employerAddress2: { type: String }, // Opcional
    employerCity: { type: String, required: true }, // Essencial
    employerState: { type: String, required: true }, // Essencial
    employerZip: { type: String, required: true }, // Essencial
    workPhone: { type: String }, // Opcional
    timeOnJobYears: { type: Number, required: true }, // Essencial
    timeOnJobMonths: { type: Number, required: true }, // Essencial

    // 3. Co-Buyer (Optional) - Campos opcionais por padrão, mas se 'hasCoBuyer' for true,
    // a validação no frontend/backend os tornará obrigatórios condicionalmente.
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

    // 4. Vehicle Information - Campos essenciais para identificar o veículo a ser financiado
    vehicleToFinance: { type: String }, // Opcional (pode ser gerado no backend)
    stockNumber: { type: String }, // Opcional
    vehicleYear: { type: Number, required: true },
    vehicleMake: { type: String, required: true },
    vehicleModel: { type: String, required: true },
    vehicleTrim: { type: String }, // Opcional
    vehicleVin: { type: String, required: true }, // Essencial
    vehicleMileage: { type: Number, required: true }, // Essencial

    // 5. Additional Comments - Opcional
    additionalComments: { type: String },

    // 6. Acknowledgment and Consent - Essencial
    acknowledgmentConsent: { type: Boolean, required: true },

    // 7. Text Message Consent - Opcional
    textMessageConsent: { type: Boolean, default: false },

    // Timestamp
    submissionDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FinancingApplication', FinancingApplicationSchema);

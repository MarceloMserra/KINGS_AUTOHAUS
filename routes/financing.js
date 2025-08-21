// routes/financing.js - VERSÃO CORRIGIDA COM ENVIO DE EMAIL
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const FinancingApplication = require('../models/FinancingApplication');
const nodemailer = require('nodemailer'); // Importa o Nodemailer

// Configurações do Nodemailer para Gmail (garante que está disponível aqui também)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Rota para exibir o formulário de financiamento
router.get('/financing', (req, res) => {
    try {
        res.render('financing', {
            title: 'Vehicle Financing - KINGS AUTOHAUS',
            layout: 'layout',
            meta: {
                description: 'Get pre-approved for your dream car at KINGS AUTOHAUS. Fast, competitive financing with flexible terms.',
                keywords: 'car financing, auto loans, vehicle financing, KINGS AUTOHAUS',
                canonical: req.protocol + '://' + req.get('host') + req.originalUrl
            }
        });
    } catch (error) {
        console.error('Financing page error:', error);
        res.status(500).render('error', {
            message: 'Unable to load financing page',
            layout: 'layout'
        });
    }
});

// Validações para o formulário - ATUALIZADAS
const financingValidation = [
    // 1. Applicant Information - Campos essenciais
    body('applicantFirstName')
        .trim().isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),
    body('applicantLastName')
        .trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),
    body('applicantEmail')
        .isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
    body('applicantMobilePhone')
        .matches(/^\(\d{3}\)\s\d{3}-\d{4}$/).withMessage('Phone must be in format (XXX) XXX-XXXX'),
    body('applicantSSN')
        .matches(/^\d{3}-\d{2}-\d{4}$/).withMessage('SSN must be in format XXX-XX-XXXX'),
    body('applicantDOB')
        .isISO8601().withMessage('Please provide a valid date of birth (YYYY-MM-DD)')
        .custom((value) => {
            const birthDate = new Date(value);
            const age = new Date().getFullYear() - birthDate.getFullYear();
            if (age < 18) {
                throw new Error('Applicant must be at least 18 years old');
            }
            return true;
        }),
    body('applicantAddress1')
        .trim().isLength({ min: 5, max: 100 }).withMessage('Address must be between 5 and 100 characters'),
    body('applicantCity')
        .trim().isLength({ min: 2, max: 50 }).withMessage('City must be between 2 and 50 characters'),
    body('applicantState')
        .isLength({ min: 2, max: 2 }).withMessage('Please select a valid state'),
    body('applicantZip')
        .matches(/^\d{5}(-\d{4})?$/).withMessage('ZIP code must be in format XXXXX or XXXXX-XXXX'),
    body('timeAtResidenceYears')
        .isInt({ min: 0, max: 50 }).withMessage('Years at residence must be between 0 and 50'),
    body('timeAtResidenceMonths')
        .isInt({ min: 0, max: 11 }).withMessage('Months at residence must be between 0 and 11'),
    body('residenceType')
        .isIn(['Own', 'Rent', 'Other']).withMessage('Please select a valid residence type'),
    body('rentMortgage')
        .isFloat({ min: 0 }).withMessage('Monthly rent/mortgage must be a non-negative number'),
    body('applicantDriverLicenseNumber')
        .trim().notEmpty().withMessage('Driver\'s License Number is required'),
    body('applicantDriverLicenseState')
        .isLength({ min: 2, max: 2 }).withMessage('Driver\'s License State is required'),
    body('applicantDriverLicenseExp')
        .matches(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/).withMessage('Driver\'s License Expiration must be in MM/YY format'),

    // 2. Applicant Employment Information - Campos essenciais
    body('employerName')
        .trim().isLength({ min: 2, max: 100 }).withMessage('Employer name must be between 2 and 100 characters'),
    body('employerType')
        .isIn(['Full-time', 'Part-time', 'Self-employed', 'Retired', 'Unemployed', 'Student']).withMessage('Please select a valid employer type'),
    body('monthlyIncome')
        .isFloat({ min: 1000, max: 1000000 }).withMessage('Monthly income must be between $1,000 and $1,000,000'),
    body('occupation')
        .trim().isLength({ min: 2, max: 50 }).withMessage('Occupation must be between 2 and 50 characters'),
    body('employerAddress1')
        .trim().isLength({ min: 5, max: 100 }).withMessage('Employer Address Line 1 is required'),
    body('employerCity')
        .trim().isLength({ min: 2, max: 50 }).withMessage('Employer City is required'),
    body('employerState')
        .isLength({ min: 2, max: 2 }).withMessage('Employer State is required'),
    body('employerZip')
        .matches(/^\d{5}(-\d{4})?$/).withMessage('Employer ZIP code must be in format XXXXX or XXXXX-XXXX'),
    body('timeOnJobYears')
        .isInt({ min: 0, max: 50 }).withMessage('Years on job must be between 0 and 50'),
    body('timeOnJobMonths')
        .isInt({ min: 0, max: 11 }).withMessage('Months on job must be between 0 and 11'),
    body('workPhone') // Opcional no formulário, mas pode ter validação se preenchido
        .optional({ checkFalsy: true }) // Valida apenas se o campo não estiver vazio
        .matches(/^\(\d{3}\)\s\d{3}-\d{4}$/).withMessage('Work Phone must be in format (XXX) XXX-XXXX'),

    // 3. Co-Buyer (Condicionalmente obrigatório)
    body('coBuyerFirstName').if(body('hasCoBuyer').equals('true'))
        .trim().isLength({ min: 2, max: 50 }).withMessage('Co-Buyer First Name is required'),
    body('coBuyerLastName').if(body('hasCoBuyer').equals('true'))
        .trim().isLength({ min: 2, max: 50 }).withMessage('Co-Buyer Last Name is required'),
    body('coBuyerEmail').if(body('hasCoBuyer').equals('true'))
        .isEmail().normalizeEmail().withMessage('Co-Buyer Email must be a valid email address'),
    body('coBuyerMobilePhone').if(body('hasCoBuyer').equals('true'))
        .matches(/^\(\d{3}\)\s\d{3}-\d{4}$/).withMessage('Co-Buyer Phone must be in format (XXX) XXX-XXXX'),
    body('coBuyerSSN').if(body('hasCoBuyer').equals('true'))
        .matches(/^\d{3}-\d{2}-\d{4}$/).withMessage('Co-Buyer SSN must be in format XXX-XX-XXXX'),
    body('coBuyerDOB').if(body('hasCoBuyer').equals('true'))
        .isISO8601().withMessage('Co-Buyer Date of Birth is required'),
    body('coBuyerAddress1').if(body('hasCoBuyer').equals('true'))
        .trim().isLength({ min: 5, max: 100 }).withMessage('Co-Buyer Address Line 1 is required'),
    body('coBuyerCity').if(body('hasCoBuyer').equals('true'))
        .trim().isLength({ min: 2, max: 50 }).withMessage('Co-Buyer City is required'),
    body('coBuyerState').if(body('hasCoBuyer').equals('true'))
        .isLength({ min: 2, max: 2 }).withMessage('Co-Buyer State is required'),
    body('coBuyerZip').if(body('hasCoBuyer').equals('true'))
        .matches(/^\d{5}(-\d{4})?$/).withMessage('Co-Buyer ZIP code must be in format XXXXX or XXXXX-XXXX'),
    body('coBuyerTimeAtResidenceYears').if(body('hasCoBuyer').equals('true'))
        .isInt({ min: 0, max: 50 }).withMessage('Co-Buyer Years at residence must be between 0 and 50'),
    body('coBuyerTimeAtResidenceMonths').if(body('hasCoBuyer').equals('true'))
        .isInt({ min: 0, max: 11 }).withMessage('Co-Buyer Months at residence must be between 0 and 11'),
    body('coBuyerResidenceType').if(body('hasCoBuyer').equals('true'))
        .isIn(['Own', 'Rent', 'Other']).withMessage('Co-Buyer Residence Type is required'),
    body('coBuyerRentMortgage').if(body('hasCoBuyer').equals('true'))
        .isFloat({ min: 0 }).withMessage('Co-Buyer Monthly Rent/Mortgage must be a non-negative number'),
    body('coBuyerEmployerName').if(body('hasCoBuyer').equals('true'))
        .trim().isLength({ min: 2, max: 100 }).withMessage('Co-Buyer Employer Name is required'),
    body('coBuyerEmployerType').if(body('hasCoBuyer').equals('true'))
        .isIn(['Full-time', 'Part-time', 'Self-employed', 'Retired', 'Unemployed', 'Student']).withMessage('Co-Buyer Employer Type is required'),
    body('coBuyerMonthlyIncome').if(body('hasCoBuyer').equals('true'))
        .isFloat({ min: 1000, max: 1000000 }).withMessage('Co-Buyer Monthly Income must be between $1,000 and $1,000,000'),
    body('coBuyerOccupation').if(body('hasCoBuyer').equals('true'))
        .trim().isLength({ min: 2, max: 50 }).withMessage('Co-Buyer Occupation is required'),
    body('coBuyerEmployerAddress1').if(body('hasCoBuyer').equals('true'))
        .trim().isLength({ min: 5, max: 100 }).withMessage('Co-Buyer Employer Address Line 1 is required'),
    body('coBuyerEmployerCity').if(body('hasCoBuyer').equals('true'))
        .trim().isLength({ min: 2, max: 50 }).withMessage('Co-Buyer Employer City is required'),
    body('coBuyerEmployerState').if(body('hasCoBuyer').equals('true'))
        .isLength({ min: 2, max: 2 }).withMessage('Co-Buyer Employer State is required'),
    body('coBuyerEmployerZip').if(body('hasCoBuyer').equals('true'))
        .matches(/^\d{5}(-\d{4})?$/).withMessage('Co-Buyer Employer ZIP code must be in format XXXXX or XXXXX-XXXX'),
    body('coBuyerWorkPhone').if(body('hasCoBuyer').equals('true'))
        .optional({ checkFalsy: true })
        .matches(/^\(\d{3}\)\s\d{3}-\d{4}$/).withMessage('Co-Buyer Work Phone must be in format (XXX) XXX-XXXX'),
    body('coBuyerDriverLicenseNumber').if(body('hasCoBuyer').equals('true'))
        .trim().notEmpty().withMessage('Co-Buyer Driver\'s License Number is required'),
    body('coBuyerDriverLicenseState').if(body('hasCoBuyer').equals('true'))
        .isLength({ min: 2, max: 2 }).withMessage('Co-Buyer Driver\'s License State is required'),
    body('coBuyerDriverLicenseExp').if(body('hasCoBuyer').equals('true'))
        .matches(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/).withMessage('Co-Buyer Driver\'s License Expiration must be in MM/YY format'),
    body('coBuyerTimeOnJobYears').if(body('hasCoBuyer').equals('true'))
        .isInt({ min: 0, max: 50 }).withMessage('Co-Buyer Years on job must be between 0 and 50'),
    body('coBuyerTimeOnJobMonths').if(body('hasCoBuyer').equals('true'))
        .isInt({ min: 0, max: 11 }).withMessage('Co-Buyer Months on job must be between 0 and 11'),


    // 4. Vehicle Information - Campos essenciais
    body('vehicleYear')
        .isInt({ min: 2010, max: new Date().getFullYear() + 1 }).withMessage('Invalid vehicle year'),
    body('vehicleMake')
        .trim().isLength({ min: 1, max: 50 }).withMessage('Vehicle make is required'),
    body('vehicleModel')
        .trim().isLength({ min: 1, max: 50 }).withMessage('Vehicle model is required'),
    body('vehicleVin')
        .matches(/^[A-HJ-NPR-Z0-9]{17}$/).withMessage('VIN must be 17 alphanumeric characters (excluding I, O, Q)'),
    body('vehicleMileage')
        .isInt({ min: 0 }).withMessage('Vehicle mileage must be a non-negative number'),
    body('vehiclePrice') // Opcional no formulário, validação apenas se preenchido
        .optional({ checkFalsy: true })
        .isFloat({ min: 1000 }).withMessage('Vehicle price must be at least $1,000'),
    body('downPayment') // Opcional no formulário, validação apenas se preenchido
        .optional({ checkFalsy: true })
        .isFloat({ min: 0 }).withMessage('Down payment must be a non-negative number'),
    body('vehicleTrim') // Opcional
        .optional({ checkFalsy: true })
        .trim().isLength({ max: 50 }).withMessage('Vehicle trim too long'),
    body('stockNumber') // Opcional
        .optional({ checkFalsy: true })
        .trim().isLength({ max: 50 }).withMessage('Stock number too long'),

    // 5. Additional Comments - Opcional
    body('additionalComments')
        .optional({ checkFalsy: true })
        .trim().isLength({ max: 1000 }).withMessage('Additional comments too long'),

    // 6. Acknowledgment and Consent - Essencial
    body('acknowledgmentConsent')
        .equals('true').withMessage('Acknowledgment consent is required'),
    body('creditCheckConsent')
        .equals('true').withMessage('Credit check consent is required'),

    // 7. Text Message Consent - Opcional
    body('textMessageConsent')
        .optional() // É opcional, não precisa ser 'true'
        .isBoolean().withMessage('Text message consent must be a boolean value')
];

// Rota para processar a submissão do formulário
router.post('/financing-submit', financingValidation, async (req, res) => {
    try {
        // Verifica erros de validação
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(error => error.msg);
            req.flash('error_msg', errorMessages.join('. '));
            return res.redirect('/financing');
        }

        // Verifica se já existe uma aplicação com o mesmo email nas últimas 24 horas
        const recentApplication = await FinancingApplication.findOne({
            applicantEmail: req.body.applicantEmail,
            submissionDate: {
                $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 horas atrás
            }
        });

        if (recentApplication) {
            req.flash('error_msg', 'You have already submitted an application in the last 24 hours. Please wait before submitting another application.');
            return res.redirect('/financing');
        }

        // Processa dados do co-comprador se existir
        const hasCoBuyer = req.body.hasCoBuyer === 'true';
        let coBuyerData = { hasCoBuyer: false };

        if (hasCoBuyer) {
            coBuyerData = {
                hasCoBuyer: true,
                coBuyerFirstName: req.body.coBuyerFirstName || '',
                coBuyerMiddleInitial: req.body.coBuyerMiddleInitial || '',
                coBuyerLastName: req.body.coBuyerLastName || '',
                coBuyerAddress1: req.body.coBuyerAddress1 || '',
                coBuyerAddress2: req.body.coBuyerAddress2 || '',
                coBuyerCity: req.body.coBuyerCity || '',
                coBuyerState: req.body.coBuyerState || '',
                coBuyerZip: req.body.coBuyerZip || '',
                coBuyerSSN: req.body.coBuyerSSN || '',
                coBuyerDOB: req.body.coBuyerDOB ? new Date(req.body.coBuyerDOB) : null,
                coBuyerDriverLicenseNumber: req.body.coBuyerDriverLicenseNumber || '',
                coBuyerDriverLicenseState: req.body.coBuyerDriverLicenseState || '',
                coBuyerDriverLicenseExp: req.body.coBuyerDriverLicenseExp || '',
                coBuyerMobilePhone: req.body.coBuyerMobilePhone || '',
                coBuyerHomePhone: req.body.coBuyerHomePhone || '',
                coBuyerEmail: req.body.coBuyerEmail || '',
                coBuyerTimeAtResidenceYears: parseInt(req.body.coBuyerTimeAtResidenceYears) || 0,
                coBuyerTimeAtResidenceMonths: parseInt(req.body.coBuyerTimeAtResidenceMonths) || 0,
                coBuyerResidenceType: req.body.coBuyerResidenceType || '',
                coBuyerRentMortgage: parseFloat(req.body.coBuyerRentMortgage) || 0,
                coBuyerEmployerName: req.body.coBuyerEmployerName || '',
                coBuyerEmployerType: req.body.coBuyerEmployerType || '',
                coBuyerMonthlyIncome: parseFloat(req.body.coBuyerMonthlyIncome) || 0,
                coBuyerOccupation: req.body.coBuyerOccupation || '',
                coBuyerEmployerAddress1: req.body.coBuyerEmployerAddress1 || '',
                coBuyerEmployerAddress2: req.body.coBuyerEmployerAddress2 || '',
                coBuyerEmployerCity: req.body.coBuyerEmployerCity || '',
                coBuyerEmployerState: req.body.coBuyerEmployerState || '',
                coBuyerEmployerZip: req.body.coBuyerEmployerZip || '',
                coBuyerWorkPhone: req.body.coBuyerWorkPhone || '',
                coBuyerTimeOnJobYears: parseInt(req.body.coBuyerTimeOnJobYears) || 0,
                coBuyerTimeOnJobMonths: parseInt(req.body.coBuyerTimeOnJobMonths) || 0,
            };
        }

        // Cria nova aplicação de financiamento
        const financingApplication = new FinancingApplication({
            // Dados do solicitante principal
            applicantFirstName: req.body.applicantFirstName.trim(),
            applicantLastName: req.body.applicantLastName.trim(),
            applicantEmail: req.body.applicantEmail.trim().toLowerCase(),
            applicantAddress1: req.body.applicantAddress1.trim(),
            applicantAddress2: req.body.applicantAddress2 ? req.body.applicantAddress2.trim() : '',
            applicantCity: req.body.applicantCity.trim(),
            applicantState: req.body.applicantState,
            applicantZip: req.body.applicantZip.trim(),
            applicantSSN: req.body.applicantSSN,
            applicantDOB: new Date(req.body.applicantDOB),
            applicantMobilePhone: req.body.applicantMobilePhone,
            applicantHomePhone: req.body.applicantHomePhone || '',
            timeAtResidenceYears: parseInt(req.body.timeAtResidenceYears),
            timeAtResidenceMonths: parseInt(req.body.timeAtResidenceMonths),
            residenceType: req.body.residenceType,
            rentMortgage: parseFloat(req.body.rentMortgage),
            applicantDriverLicenseNumber: req.body.applicantDriverLicenseNumber,
            applicantDriverLicenseState: req.body.applicantDriverLicenseState,
            applicantDriverLicenseExp: req.body.applicantDriverLicenseExp,

            // Dados de emprego
            employerName: req.body.employerName.trim(),
            employerType: req.body.employerType,
            monthlyIncome: parseFloat(req.body.monthlyIncome),
            occupation: req.body.occupation.trim(),
            employerAddress1: req.body.employerAddress1.trim(),
            employerAddress2: req.body.employerAddress2 ? req.body.employerAddress2.trim() : '',
            employerCity: req.body.employerCity.trim(),
            employerState: req.body.employerState,
            employerZip: req.body.employerZip.trim(),
            workPhone: req.body.workPhone || '',
            timeOnJobYears: parseInt(req.body.timeOnJobYears),
            timeOnJobMonths: parseInt(req.body.timeOnJobMonths),

            // Dados do veículo
            vehicleYear: parseInt(req.body.vehicleYear),
            vehicleMake: req.body.vehicleMake.trim(),
            vehicleModel: req.body.vehicleModel.trim(),
            vehicleVin: req.body.vehicleVin.trim(),
            vehicleMileage: parseInt(req.body.vehicleMileage),
            vehicleToFinance: `${req.body.vehicleYear} ${req.body.vehicleMake} ${req.body.vehicleModel}`,
            stockNumber: req.body.stockNumber || '',
            vehicleTrim: req.body.vehicleTrim || '',
            vehiclePrice: parseFloat(req.body.vehiclePrice) || 0,
            downPayment: parseFloat(req.body.downPayment) || 0,

            // Co-comprador
            ...coBuyerData,

            // Consentimentos
            acknowledgmentConsent: req.body.acknowledgmentConsent === 'true',
            textMessageConsent: req.body.textMessageConsent === 'true', // Converte para booleano

            // Comentários adicionais
            additionalComments: req.body.additionalComments ? req.body.additionalComments.trim() : '',

            // Metadados da aplicação
            submissionDate: new Date()
        });

        // Salva no banco de dados
        const savedApplication = await financingApplication.save();

        // Log da operação para auditoria
        console.log(`New financing application submitted:`, {
            id: savedApplication._id,
            email: req.body.applicantEmail,
            vehicle: `${req.body.vehicleYear} ${req.body.vehicleMake} ${req.body.vehicleModel}`,
            income: req.body.monthlyIncome,
            timestamp: new Date().toISOString(),
            ip: req.ip
        });

        // ============================================
        // NOVO: Lógica de Envio de Email para Aplicação de Financiamento
        // ============================================
        const applicantEmail = req.body.applicantEmail;
        const recipientEmail = process.env.CONTACT_RECEIVER_EMAIL || process.env.EMAIL_USER;

        if (!recipientEmail) {
            console.error('❌ Error: Financing application recipient email not configured in .env (CONTACT_RECEIVER_EMAIL or EMAIL_USER).');
            req.flash('error_msg', 'Server email recipient not configured for financing applications. Please contact support.');
            return res.redirect('/financing');
        }

        // Conteúdo do email para a equipe/administrador
        const emailContent = createFinancingApplicationEmailHtml(req.body, savedApplication._id.toString().slice(-8).toUpperCase());

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recipientEmail,
            subject: `New Financing Application - ${req.body.applicantFirstName} ${req.body.applicantLastName}`,
            html: emailContent
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`✉️ Financing application email sent to ${recipientEmail} from ${applicantEmail}`);
        } catch (emailError) {
            console.error('❌ Error sending financing application email:', emailError);
            // Não falha a submissão do formulário se o email falhar, apenas loga o erro
        }
        // ============================================
        // FIM: Lógica de Envio de Email para Aplicação de Financiamento
        // ============================================


        // Mensagem de sucesso
        req.flash('success_msg', `Your financing application has been submitted successfully! Our team will contact you within 24 hours. Reference ID: ${savedApplication._id.toString().slice(-8).toUpperCase()}`);
        
        // Redireciona para a página de financiamento com mensagem de sucesso
        res.redirect('/financing');

    } catch (error) {
        console.error('Financing application submission error:', error);
        
        // Se for erro de validação do MongoDB
        if (error.name === 'ValidationError') {
            const mongoErrors = Object.values(error.errors).map(err => err.message);
            req.flash('error_msg', `Validation error: ${mongoErrors.join('. ')}`);
        } else {
            req.flash('error_msg', 'There was an error processing your application. Please try again or contact us directly.');
        }
        
        res.redirect('/financing');
    }
});

// Helper function to create the HTML content for the financing application email
function createFinancingApplicationEmailHtml(data, referenceId) {
    const formatValue = (value) => value || 'N/A';
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };
    const formatCurrency = (value) => value ? `$${parseFloat(value).toLocaleString('en-US')}` : 'N/A';
    const formatPhone = (value) => value || 'N/A';
    const formatSSN = (value) => value || 'N/A'; // SSN should ideally not be sent via email or be masked

    return `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background-color: #000000; color: #ffffff; padding: 20px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
            <div style="text-align: center; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 1px solid #333;">
                <h1 style="color: #05FC04; margin-bottom: 10px; font-size: 28px;">New Financing Application Received!</h1>
                <p style="color: #ffffff; font-size: 16px;"><strong>Reference ID:</strong> <span style="color: #05FC04;">${referenceId}</span></p>
                <p style="color: #888888; font-size: 12px;">Submitted on ${new Date().toLocaleString('en-US', { timeZoneName: 'short' })}</p>
            </div>

            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #05FC04; margin-top: 0; border-bottom: 1px solid #05FC04; padding-bottom: 10px; margin-bottom: 15px;">Applicant Information</h3>
                <table style="width: 100%; color: #ffffff; font-size: 14px; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; font-weight: bold; width: 40%;">Name:</td><td style="padding: 8px 0;">${formatValue(data.applicantFirstName)} ${formatValue(data.applicantMiddleInitial)} ${formatValue(data.applicantLastName)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td style="padding: 8px 0;"><a href="mailto:${data.applicantEmail}" style="color: #05FC04;">${formatValue(data.applicantEmail)}</a></td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Mobile Phone:</td><td style="padding: 8px 0;">${formatPhone(data.applicantMobilePhone)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Home Phone:</td><td style="padding: 8px 0;">${formatPhone(data.applicantHomePhone)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">SSN:</td><td style="padding: 8px 0;">${formatSSN(data.applicantSSN)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Date of Birth:</td><td style="padding: 8px 0;">${formatDate(data.applicantDOB)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Driver's License:</td><td style="padding: 8px 0;">${formatValue(data.applicantDriverLicenseNumber)} (${formatValue(data.applicantDriverLicenseState)}) Exp: ${formatValue(data.applicantDriverLicenseExp)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Address:</td><td style="padding: 8px 0;">${formatValue(data.applicantAddress1)} ${formatValue(data.applicantAddress2)}<br>${formatValue(data.applicantCity)}, ${formatValue(data.applicantState)} ${formatValue(data.applicantZip)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Time at Residence:</td><td style="padding: 8px 0;">${formatValue(data.timeAtResidenceYears)} Yrs, ${formatValue(data.timeAtResidenceMonths)} Mths</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Residence Type:</td><td style="padding: 8px 0;">${formatValue(data.residenceType)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Rent/Mortgage:</td><td style="padding: 8px 0;">${formatCurrency(data.rentMortgage)} / Month</td></tr>
                </table>
            </div>

            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #05FC04; margin-top: 0; border-bottom: 1px solid #05FC04; padding-bottom: 10px; margin-bottom: 15px;">Employment Information</h3>
                <table style="width: 100%; color: #ffffff; font-size: 14px; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; font-weight: bold; width: 40%;">Employer Name:</td><td style="padding: 8px 0;">${formatValue(data.employerName)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Employer Type:</td><td style="padding: 8px 0;">${formatValue(data.employerType)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Occupation:</td><td style="padding: 8px 0;">${formatValue(data.occupation)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Monthly Income:</td><td style="padding: 8px 0;">${formatCurrency(data.monthlyIncome)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Time on Job:</td><td style="padding: 8px 0;">${formatValue(data.timeOnJobYears)} Yrs, ${formatValue(data.timeOnJobMonths)} Mths</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Employer Address:</td><td style="padding: 8px 0;">${formatValue(data.employerAddress1)} ${formatValue(data.employerAddress2)}<br>${formatValue(data.employerCity)}, ${formatValue(data.employerState)} ${formatValue(data.employerZip)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Work Phone:</td><td style="padding: 8px 0;">${formatPhone(data.workPhone)}</td></tr>
                </table>
            </div>

            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #05FC04; margin-top: 0; border-bottom: 1px solid #05FC04; padding-bottom: 10px; margin-bottom: 15px;">Vehicle Information</h3>
                <table style="width: 100%; color: #ffffff; font-size: 14px; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; font-weight: bold; width: 40%;">Year:</td><td style="padding: 8px 0;">${formatValue(data.vehicleYear)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Make:</td><td style="padding: 8px 0;">${formatValue(data.vehicleMake)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Model:</td><td style="padding: 8px 0;">${formatValue(data.vehicleModel)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Trim:</td><td style="padding: 8px 0;">${formatValue(data.vehicleTrim)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">VIN:</td><td style="padding: 8px 0;">${formatValue(data.vehicleVin)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Mileage:</td><td style="padding: 8px 0;">${formatValue(data.vehicleMileage)} miles</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Price:</td><td style="padding: 8px 0;">${formatCurrency(data.vehiclePrice)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Down Payment:</td><td style="padding: 8px 0;">${formatCurrency(data.downPayment)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Stock Number:</td><td style="padding: 8px 0;">${formatValue(data.stockNumber)}</td></tr>
                </table>
            </div>

            ${data.hasCoBuyer === 'true' ? `
            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #05FC04; margin-top: 0; border-bottom: 1px solid #05FC04; padding-bottom: 10px; margin-bottom: 15px;">Co-Buyer Information</h3>
                <table style="width: 100%; color: #ffffff; font-size: 14px; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; font-weight: bold; width: 40%;">Name:</td><td style="padding: 8px 0;">${formatValue(data.coBuyerFirstName)} ${formatValue(data.coBuyerMiddleInitial)} ${formatValue(data.coBuyerLastName)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td style="padding: 8px 0;"><a href="mailto:${data.coBuyerEmail}" style="color: #05FC04;">${formatValue(data.coBuyerEmail)}</a></td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Mobile Phone:</td><td style="padding: 8px 0;">${formatPhone(data.coBuyerMobilePhone)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Home Phone:</td><td style="padding: 8px 0;">${formatPhone(data.coBuyerHomePhone)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">SSN:</td><td style="padding: 8px 0;">${formatSSN(data.coBuyerSSN)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Date of Birth:</td><td style="padding: 8px 0;">${formatDate(data.coBuyerDOB)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Driver's License:</td><td style="padding: 8px 0;">${formatValue(data.coBuyerDriverLicenseNumber)} (${formatValue(data.coBuyerDriverLicenseState)}) Exp: ${formatValue(data.coBuyerDriverLicenseExp)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Address:</td><td style="padding: 8px 0;">${formatValue(data.coBuyerAddress1)} ${formatValue(data.coBuyerAddress2)}<br>${formatValue(data.coBuyerCity)}, ${formatValue(data.coBuyerState)} ${formatValue(data.coBuyerZip)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Time at Residence:</td><td style="padding: 8px 0;">${formatValue(data.coBuyerTimeAtResidenceYears)} Yrs, ${formatValue(data.coBuyerTimeAtResidenceMonths)} Mths</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Residence Type:</td><td style="padding: 8px 0;">${formatValue(data.coBuyerResidenceType)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Rent/Mortgage:</td><td style="padding: 8px 0;">${formatCurrency(data.coBuyerRentMortgage)} / Month</td></tr>
                </table>

                <h3 style="color: #05FC04; margin-top: 20px; border-bottom: 1px solid #05FC04; padding-bottom: 10px; margin-bottom: 15px;">Co-Buyer Employment Information</h3>
                <table style="width: 100%; color: #ffffff; font-size: 14px; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; font-weight: bold; width: 40%;">Employer Name:</td><td style="padding: 8px 0;">${formatValue(data.coBuyerEmployerName)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Employer Type:</td><td style="padding: 8px 0;">${formatValue(data.coBuyerEmployerType)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Occupation:</td><td style="padding: 8px 0;">${formatValue(data.coBuyerOccupation)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Monthly Income:</td><td style="padding: 8px 0;">${formatCurrency(data.coBuyerMonthlyIncome)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Time on Job:</td><td style="padding: 8px 0;">${formatValue(data.coBuyerTimeOnJobYears)} Yrs, ${formatValue(data.coBuyerTimeOnJobMonths)} Mths</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Employer Address:</td><td style="padding: 8px 0;">${formatValue(data.coBuyerEmployerAddress1)} ${formatValue(data.coBuyerEmployerAddress2)}<br>${formatValue(data.coBuyerEmployerCity)}, ${formatValue(data.coBuyerEmployerState)} ${formatValue(data.coBuyerEmployerZip)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Work Phone:</td><td style="padding: 8px 0;">${formatPhone(data.coBuyerWorkPhone)}</td></tr>
                </table>
            </div>
            ` : ''}

            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #05FC04; margin-top: 0; border-bottom: 1px solid #05FC04; padding-bottom: 10px; margin-bottom: 15px;">Consent and Comments</h3>
                <p style="color: #ffffff; font-size: 14px;"><strong>Acknowledgment Consent:</strong> ${data.acknowledgmentConsent === 'true' ? '✅ Yes' : '❌ No'}</p>
                <p style="color: #ffffff; font-size: 14px;"><strong>Credit Check Consent:</strong> ${data.creditCheckConsent === 'true' ? '✅ Yes' : '❌ No'}</p>
                <p style="color: #ffffff; font-size: 14px;"><strong>Text Message Consent:</strong> ${data.textMessageConsent === 'true' ? '✅ Yes' : '❌ No'}</p>
                <p style="color: #ffffff; font-size: 14px;"><strong>Additional Comments:</strong> ${formatValue(data.additionalComments)}</p>
            </div>

            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #333333;">
                <p style="color: #888888; font-size: 12px; margin: 0;">
                    This is an automated email from KINGS AUTOHAUS. Please do not reply.
                </p>
                <p style="color: #05FC04; font-size: 10px; margin: 5px 0 0 0;">
                    KINGS AUTOHAUS - Premium Vehicle Experience
                </p>
            </div>
        </div>
    `;
}

// Rota para confirmação (opcional)
router.get('/financing/confirmation/:id?', (req, res) => {
    res.render('financing_confirmation', {
        title: 'Application Submitted - KINGS AUTOHAUS',
        applicationId: req.params.id,
        layout: 'layout'
    });
});

module.exports = router;

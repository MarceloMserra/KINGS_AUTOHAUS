// routes/contact.js
require('dotenv').config(); // Adicione esta linha aqui para garantir que as variáveis de ambiente sejam carregadas

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer'); // Importa o Nodemailer
const { body, validationResult } = require('express-validator');

// Adiciona logs para depuração das variáveis de ambiente
console.log('DEBUG (contact.js init): process.env.EMAIL_USER =', process.env.EMAIL_USER);
console.log('DEBUG (contact.js init): process.env.EMAIL_PASS =', process.env.EMAIL_PASS ? '***** (hidden)' : 'undefined'); // Não logar a senha real
console.log('DEBUG (contact.js init): process.env.CONTACT_RECEIVER_EMAIL =', process.env.CONTACT_RECEIVER_EMAIL);

// Verifica se as variáveis de ambiente essenciais para o transporter estão definidas
// Se não estiverem, loga um erro e o transporter pode não funcionar corretamente.
// O Nodemailer já faz algumas verificações, mas isso adiciona clareza no seu log.
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ Nodemailer: EMAIL_USER or EMAIL_PASS is not defined in .env! Email sending might fail.');
}

// Email configuration (you'll need to set these in your .env file)
// IMPORTANTE: Use as variáveis de ambiente para o email e senha
const transporter = nodemailer.createTransport({
    service: 'gmail', // Serviço Gmail
    auth: {
        user: process.env.EMAIL_USER, // Seu email (contact@kingsautohaus.com) do .env
        pass: process.env.EMAIL_PASS  // Sua senha de aplicativo do .env
    }
});

// Validation middleware for the main contact form (existing logic)
const validateContactForm = [
    body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),
    body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
    body('phone').matches(/^\(\d{3}\)\s\d{3}-\d{4}$/).withMessage('Phone must be in format (XXX) XXX-XXXX'),
    body('message').trim().isLength({ min: 10, max: 1000 }).withMessage('Message must be between 10 and 1000 characters'),
    body('contactType').isIn(['inquiry', 'test-drive', 'message']).withMessage('Invalid contact type'),
    body('dataConsent').equals('on').withMessage('Data usage consent is required'),
    body('accuracyConsent').equals('on').withMessage('Information accuracy consent is required'),
    
    // Conditional validation for test drive
    body('driversLicense').if(body('contactType').equals('test-drive'))
        .notEmpty().withMessage('Driver\'s license is required for test drives'),
    body('testDriveConsent').if(body('contactType').equals('test-drive'))
        .equals('on').withMessage('Test drive agreement is required for test drives')
];

// Main Contact form submission route (existing logic)
router.post('/contact/submit', validateContactForm, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error', 'Please check your form and try again: ' + errors.array().map(err => err.msg).join(', '));
            return res.redirect('/gas');
        }

        const {
            firstName,
            lastName,
            email,
            phone,
            address,
            city,
            state,
            zipCode,
            driversLicense,
            preferredContact,
            message,
            contactType,
            vehicleInfo,
            communicationConsent
        } = req.body;

        // Create contact type specific subject and content
        let emailSubject = '';
        let emailPriority = 'normal';
        
        switch(contactType) {
            case 'test-drive':
                emailSubject = `🚗 Test Drive Request - ${vehicleInfo}`;
                emailPriority = 'high';
                break;
            case 'inquiry':
                emailSubject = `❓ Vehicle Inquiry - ${vehicleInfo}`;
                break;
            case 'message':
                emailSubject = `💬 Customer Message - ${vehicleInfo}`;
                break;
            default:
                emailSubject = `📧 Contact Form Submission`;
        }

        // Create the main email content
        const emailHtml = createMainEmailTemplate({
            emailSubject,
            firstName,
            lastName,
            email,
            phone,
            address,
            city,
            state,
            zipCode,
            preferredContact,
            vehicleInfo,
            contactType,
            driversLicense,
            message,
            communicationConsent
        });

        // Define o destinatário, usando EMAIL_USER como fallback se CONTACT_RECEIVER_EMAIL não estiver definido
        const mainRecipientEmail = process.env.CONTACT_RECEIVER_EMAIL || process.env.EMAIL_USER;
        if (!mainRecipientEmail) {
            console.error('❌ Error: Main recipient email not configured in .env (CONTACT_RECEIVER_EMAIL or EMAIL_USER).');
            req.flash('error_msg', 'Server email recipient not configured. Please contact support.');
            return res.redirect('/gas');
        }

        // Email options
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: mainRecipientEmail, // Usando a variável garantida
            subject: emailSubject,
            html: emailHtml,
            priority: emailPriority,
            replyTo: email
        };

        // Send email
        await transporter.sendMail(mailOptions);

        // Create confirmation email
        const confirmationHtml = createConfirmationEmailTemplate({
            firstName,
            contactType,
            vehicleInfo
        });

        const confirmationMailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: `✅ Confirmation: Your ${getContactTypeText(contactType)} - KINGS AUTOHAUS`,
            html: confirmationHtml
        };

        // Send confirmation email (optional, don't fail if this fails)
        try {
            await transporter.sendMail(confirmationMailOptions);
        } catch (confirmationError) {
            console.log('Confirmation email failed, but main email sent:', confirmationError.message);
        }

        // Log the submission for internal tracking
        console.log(`📧 Contact form submission: ${contactType} from ${firstName} ${lastName} (${email}) regarding ${vehicleInfo || 'General inquiry'}`);

        // Set success message and redirect
        req.flash('success_msg', `Thank you ${firstName}! Your ${getContactTypeText(contactType)} has been sent successfully. We'll contact you within 24 hours.`);
        res.redirect('/gas');

    } catch (error) {
        console.error('Contact form submission error:', error);
        req.flash('error_msg', 'Sorry, there was an error sending your message. Please try again or call us directly at (774) 523-7860.');
        res.redirect('/gas');
    }
});

// NEW: Route for the simple message modal from home.hbs
router.post('/send-message', async (req, res) => {
    // Destructure data from the frontend
    const { name, email, phone, message } = req.body;

    // Basic validation for the modal form
    if (!name || !email || !phone || !message) {
        return res.status(400).json({ message: 'All fields (Name, Email, Phone, Message) are required.' });
    }

    // Ensure recipient email is defined, using EMAIL_USER as fallback
    const modalRecipientEmail = process.env.CONTACT_RECEIVER_EMAIL || process.env.EMAIL_USER;
    if (!modalRecipientEmail) {
        console.error('❌ Error: No recipient email configured in .env for modal messages (CONTACT_RECEIVER_EMAIL or EMAIL_USER).');
        return res.status(500).json({ message: 'Server email recipient not configured. Please contact support.' });
    }

    // Conteúdo do email para a equipe/administrador - AGORA USANDO A NOVA FUNÇÃO
    const mailContentHtml = createContactModalEmailHtml(req.body);

    const mailOptions = {
        from: `"${name}" <${email}>`, // Sender: User's Name <User's Email>
        to: modalRecipientEmail, // Destination email from .env (or fallback)
        subject: `New Message from Home Page Modal by ${name}`, // Email subject
        html: mailContentHtml // Conteúdo HTML formatado
    };

    try {
        // Attempt to send the email
        await transporter.sendMail(mailOptions);
        console.log(`✉️ Modal message sent from ${email} to ${modalRecipientEmail}`);
        // Em vez de enviar uma resposta JSON, redireciona para a página de sucesso
        res.status(200).json({ redirect: '/message-sent' }); // Envia um JSON com a URL de redirecionamento
    } catch (error) {
        // Log error and return a 500 status if sending fails
        console.error('❌ Error sending modal message email:', error);
        res.status(500).json({ message: 'Failed to send message. Please try again later.', error: error.message });
    }
});

// NEW: Route for the message sent confirmation page
router.get('/message-sent', (req, res) => {
    res.render('message-sent', {
        title: 'Message Sent - KINGS AUTOHAUS',
        layout: 'layout' // Usa o layout principal
    });
});


// Helper function to get contact type text
function getContactTypeText(contactType) {
    switch(contactType) {
        case 'test-drive':
            return 'test drive request';
        case 'inquiry':
            return 'inquiry';
        case 'message':
            return 'message';
        default:
            return 'contact';
    }
}

// Function to create main email template (for the main contact form)
function createMainEmailTemplate(data) {
    const currentDate = new Date().toLocaleString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/New_York'
    });

    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #000000; color: #ffffff; padding: 20px; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 1px solid #333;">
                <h1 style="color: #05FC04; margin-bottom: 10px; font-size: 28px;">${data.emailSubject}</h1>
                <p style="color: #888888; font-size: 12px;">Submitted on ${currentDate}</p>
            </div>
            
            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #05FC04; margin-top: 0; border-bottom: 1px solid #05FC04; padding-bottom: 10px; margin-bottom: 15px;">Contact Information</h3>
                <table style="width: 100%; color: #ffffff; font-size: 14px; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; font-weight: bold; width: 40%;">Name:</td><td style="padding: 8px 0;">${data.firstName} ${data.lastName}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td style="padding: 8px 0;"><a href="mailto:${data.email}" style="color: #05FC04;">${data.email}</a></td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Phone:</td><td style="padding: 8px 0;">${data.phone}</td></tr>
                    ${data.address ? `<tr><td style="padding: 8px 0; font-weight: bold;">Address:</td><td style="padding: 8px 0;">${data.address}</td></tr>` : ''}
                    ${data.city ? `<tr><td style="padding: 8px 0; font-weight: bold;">City:</td><td style="padding: 8px 0;">${data.city}</td></tr>` : ''}
                    ${data.state ? `<tr><td style="padding: 8px 0; font-weight: bold;">State:</td><td style="padding: 8px 0;">${data.state}</td></tr>` : ''}
                    ${data.zipCode ? `<tr><td style="padding: 8px 0; font-weight: bold;">ZIP:</td><td style="padding: 8px 0;">${data.zipCode}</td></tr>` : ''}
                    <tr><td style="padding: 8px 0; font-weight: bold;">Preferred Contact:</td><td style="padding: 8px 0; text-transform: capitalize;">${data.preferredContact}</td></tr>
                </table>
            </div>
            
            ${data.vehicleInfo ? `
            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #05FC04; margin-top: 0; border-bottom: 1px solid #05FC04; padding-bottom: 10px; margin-bottom: 15px;">Vehicle Interest</h3>
                <p style="font-size: 1.1rem; color: #ffffff; margin: 0;"><strong>${data.vehicleInfo}</strong></p>
            </div>
            ` : ''}
            
            ${data.contactType === 'test-drive' && data.driversLicense ? `
            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #05FC04; margin-top: 0; border-bottom: 1px solid #05FC04; padding-bottom: 10px; margin-bottom: 15px;">Test Drive Information</h3>
                <p style="color: #ffffff; margin: 0;"><strong>Driver's License:</strong> ${data.driversLicense}</p>
                <p style="color: #ffc107; font-size: 0.9rem; margin: 10px 0 0 0;">⚠️ Please verify license before test drive</p>
            </div>
            ` : ''}
            
            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #05FC04; margin-top: 0; border-bottom: 1px solid #05FC04; padding-bottom: 10px; margin-bottom: 15px;">Message</h3>
                <p style="color: #ffffff; line-height: 1.6; white-space: pre-wrap;">${data.message}</p>
            </div>
            
            <div style="background-color: #1a1a1a; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="color: #05FC04; margin-top: 0; font-size: 1rem;">Consent Information</h4>
                <ul style="color: #ffffff; font-size: 0.9rem; margin: 0; padding-left: 20px;">
                    <li>✅ Data usage consent provided</li>
                    <li>✅ Information accuracy confirmed</li>
                    ${data.contactType === 'test-drive' ? '<li>✅ Test drive agreement accepted</li>' : ''}
                    ${data.communicationConsent === 'on' ? '<li>✅ Marketing communications accepted</li>' : '<li>❌ Marketing communications declined</li>'}
                </ul>
            </div>
            
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #333333;">
                <p style="color: #888888; font-size: 0.9rem; margin: 0;">
                    This is an automated confirmation. Please do not reply to this email.
                </p>
                <p style="color: #05FC04; font-size: 0.8rem; margin: 5px 0 0 0;">
                    KINGS AUTOHAUS - Premium Vehicle Experience
                </p>
            </div>
        </div>
    `;
}

// Function to create confirmation email template
function createConfirmationEmailTemplate(data) {
    const contactTypeText = getContactTypeText(data.contactType);
    const contactTypeTitleCase = contactTypeText.charAt(0).toUpperCase() + contactTypeText.slice(1);

    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #000000; color: #ffffff; padding: 20px; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #05FC04; margin-bottom: 10px;">Thank You for Contacting KINGS AUTOHAUS</h1>
                <div style="height: 3px; width: 150px; background-color: #05FC04; margin: 0 auto; border-radius: 2px;"></div>
            </div>
            
            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #05FC04; margin-top: 0;">We've Received Your ${contactTypeTitleCase}</h3>
                <p style="color: #ffffff; line-height: 1.6;">
                    Dear ${data.firstName},<br><br>
                    Thank you for your interest in ${data.vehicleInfo ? `<strong>${data.vehicleInfo}</strong>` : 'our premium vehicles'}. 
                    We've received your ${contactTypeText} and one of our vehicle specialists will contact you within 24 hours.
                </p>
                
                ${data.contactType === 'test-drive' ? `
                <div style="background-color: rgba(5, 252, 4, 0.1); padding: 15px; border-radius: 5px; border: 1px solid #05FC04; margin: 15px 0;">
                    <h4 style="color: #05FC04; margin: 0 0 10px 0; font-size: 1rem;">Test Drive Preparation</h4>
                    <p style="color: #ffffff; margin: 0; font-size: 0.9rem;">
                        Please bring a valid driver's license and proof of insurance for your test drive appointment.
                        Our team will verify these documents before the test drive begins.
                    </p>
                </div>
                ` : ''}
            </div>
            
            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #05FC04; margin-top: 0;">Contact Information</h3>
                <p style="color: #ffffff; margin: 0; line-height: 1.6;">
                    <strong>📍 Address:</strong> 1278 Washington St, Holliston MA 01746<br>
                    <strong>📞 Phone:</strong> <a href="tel:+17745237860" style="color: #05FC04;">+1 (774) 523-7860</a><br>
                    <strong>✉️ Email:</strong> <a href="mailto:contact@kingsautous.com" style="color: #05FC04;">contact@kingsautous.com</a><br>
                    <strong>🕒 Hours:</strong> Mon-Fri 9AM-7PM, Sat 9AM-6PM, Sun 11AM-5PM
                </p>
            </div>
            
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #333333;">
                <p style="color: #888888; font-size: 0.9rem; margin: 0 0 10px 0;">
                    This is an automated confirmation. Please do not reply to this email.
                </p>
                <p style="color: #05FC04; font-size: 0.8rem; margin: 0;">
                    KINGS AUTOHAUS - Premium Vehicle Experience
                </p>
            </div>
        </div>
    `;
}

// Helper function to create the HTML content for the contact modal email
function createContactModalEmailHtml(data) {
    const formatValue = (value) => value || 'N/A';
    const formatPhone = (value) => value || 'N/A';

    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #000000; color: #ffffff; padding: 20px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
            <div style="text-align: center; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 1px solid #333;">
                <h1 style="color: #05FC04; margin-bottom: 10px; font-size: 28px;">New Message from KINGS AUTOHAUS Website</h1>
                <p style="color: #888888; font-size: 12px;">Received on ${new Date().toLocaleString('en-US', { timeZoneName: 'short' })}</p>
            </div>

            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #05FC04; margin-top: 0; border-bottom: 1px solid #05FC04; padding-bottom: 10px; margin-bottom: 15px;">Sender Information</h3>
                <table style="width: 100%; color: #ffffff; font-size: 14px; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; font-weight: bold; width: 40%;">Name:</td><td style="padding: 8px 0;">${formatValue(data.name)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td style="padding: 8px 0;"><a href="mailto:${data.email}" style="color: #05FC04;">${formatValue(data.email)}</a></td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Phone:</td><td style="padding: 8px 0;">${formatPhone(data.phone)}</td></tr>
                </table>
            </div>
            
            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #05FC04; margin-top: 0; border-bottom: 1px solid #05FC04; padding-bottom: 10px; margin-bottom: 15px;">Message Details</h3>
                <p style="color: #ffffff; line-height: 1.6; white-space: pre-wrap; font-size: 14px;">${formatValue(data.message)}</p>
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

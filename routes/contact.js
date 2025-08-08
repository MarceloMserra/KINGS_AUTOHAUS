const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');

// Email configuration (you'll need to set these in your .env file)
const transporter = nodemailer.createTransport({
    service: 'gmail', // or your email service
    auth: {
        user: process.env.EMAIL_USER, // your email
        pass: process.env.EMAIL_PASS  // your email password or app password
    }
});

// Validation middleware for contact form
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

// Contact form submission route
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

        // Email options
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.CONTACT_EMAIL || process.env.EMAIL_USER,
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

// Function to create main email template
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
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #05FC04; margin-bottom: 10px;">${data.emailSubject}</h1>
                <div style="height: 3px; width: 100px; background-color: #05FC04; margin: 0 auto; border-radius: 2px;"></div>
            </div>
            
            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #05FC04; margin-top: 0;">Contact Information</h3>
                <table style="width: 100%; color: #ffffff;">
                    <tr><td style="padding: 5px 0; font-weight: bold;">Name:</td><td>${data.firstName} ${data.lastName}</td></tr>
                    <tr><td style="padding: 5px 0; font-weight: bold;">Email:</td><td><a href="mailto:${data.email}" style="color: #05FC04;">${data.email}</a></td></tr>
                    <tr><td style="padding: 5px 0; font-weight: bold;">Phone:</td><td><a href="tel:${data.phone}" style="color: #05FC04;">${data.phone}</a></td></tr>
                    ${data.address ? `<tr><td style="padding: 5px 0; font-weight: bold;">Address:</td><td>${data.address}</td></tr>` : ''}
                    ${data.city ? `<tr><td style="padding: 5px 0; font-weight: bold;">City:</td><td>${data.city}</td></tr>` : ''}
                    ${data.state ? `<tr><td style="padding: 5px 0; font-weight: bold;">State:</td><td>${data.state}</td></tr>` : ''}
                    ${data.zipCode ? `<tr><td style="padding: 5px 0; font-weight: bold;">ZIP:</td><td>${data.zipCode}</td></tr>` : ''}
                    <tr><td style="padding: 5px 0; font-weight: bold;">Preferred Contact:</td><td style="text-transform: capitalize;">${data.preferredContact}</td></tr>
                </table>
            </div>
            
            ${data.vehicleInfo ? `
            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #05FC04; margin-top: 0;">Vehicle Interest</h3>
                <p style="font-size: 1.1rem; color: #ffffff; margin: 0;"><strong>${data.vehicleInfo}</strong></p>
            </div>
            ` : ''}
            
            ${data.contactType === 'test-drive' && data.driversLicense ? `
            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #05FC04; margin-top: 0;">Test Drive Information</h3>
                <p style="color: #ffffff; margin: 0;"><strong>Driver's License:</strong> ${data.driversLicense}</p>
                <p style="color: #ffc107; font-size: 0.9rem; margin: 10px 0 0 0;">⚠️ Please verify license before test drive</p>
            </div>
            ` : ''}
            
            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #05FC04; margin-top: 0;">Message</h3>
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
                    Submitted on ${currentDate} EST
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

// Route to display contact success page (optional)
router.get('/contact/success', (req, res) => {
    res.render('contact_success', {
        title: 'Message Sent - KINGS AUTOHAUS',
        layout: 'layout'
    });
});

module.exports = router;
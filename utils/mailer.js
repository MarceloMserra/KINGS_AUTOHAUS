const nodemailer = require("nodemailer");
require('dotenv').config(); // Garante que as variáveis de ambiente sejam carregadas

// A função sendEmail agora aceita um objeto mailOptions completo
async function sendEmail(mailOptions) {
    // Configura o transporter usando as variáveis de ambiente
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Ou o serviço de e-mail que você usa
        auth: {
            user: process.env.EMAIL_USER, // Seu e-mail do .env
            pass: process.env.EMAIL_PASS  // Sua senha/app password do .env
        }
    });

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log("Mailer Response - ", info.response);
        return true; // Retorna true em caso de sucesso
    } catch (error) {
        console.error("❌ Erro ao enviar e-mail:", error);
        return false; // Retorna false em caso de erro
    }
}

module.exports = sendEmail;

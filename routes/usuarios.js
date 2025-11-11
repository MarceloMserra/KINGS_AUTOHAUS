const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const crypto = require('crypto'); // Módulo Node.js para gerar tokens
const sendEmail = require('../utils/mailer'); // Seu utilitário de envio de e-mail

// ✅ Modelos de usuário e carros
require('../models/UserModel');
const Usuario = mongoose.model('usuarios');
const GasModel = require('../models/GasModel'); // Importar o modelo GasModel
// REMOVIDO: const ElectricModel = require('../models/ElectricModel');


// ✅ Página principal - Home (GET)
router.get('/', async (req, res) => {
    try {
        // ====================================================================
        // ===================== LÓGICA DE DESTAQUES CORRIGIDA ====================
        // ====================================================================

        // 1. Busca carros a gasolina em destaque que NÃO estejam vendidos ou pendentes
        const featuredGasCars = await GasModel.find({
            featured: true,       // O campo que você marcou no admin
            
            // --- MUDANÇA PRINCIPAL AQUI ---
            // Em vez de procurar status: 'available' (que pode ser nulo em carros antigos),
            // vamos procurar por carros que NÃO estejam 'sold' E NÃO estejam 'pending'.
            status: { $nin: ['sold', 'pending'] }
            // --- FIM DA MUDANÇA ---

        })
        .sort({ date: -1 }) // Ordena pelos mais novos
        .lean();

        // 2. Coloca os resultados na variável
        let latestCars = featuredGasCars
            .sort((a, b) => new Date(b.date) - new Date(a.date)) // Garante que os mais novos venham primeiro
            .slice(0, 10); // Limita a 10 carros

        console.log(`🚗 Loaded ${latestCars.length} *MANUALLY FEATURED* gas cars for homepage carousel`);

        // REMOVIDO: Lógica desnecessária de filtros que não existem na home.hbs

        // ====================================================================
        // ===================== FIM DA CORREÇÃO ============================
        // ====================================================================

        res.render('home', {
            layout: 'layout',
            // REMOVIDO: carBrands: carBrands,
            // REMOVIDO: modelsByBrand: JSON.stringify(modelsByBrand),
            latestCars: latestCars, // Envia os carros corretos para o home.hbs
        });
    } catch (err) {
        console.error("❌ Error fetching homepage data:", err);
        req.flash('error_msg', 'Could not load homepage content at this time.');
        res.render('home', {
            layout: 'layout',
            error: 'Could not load content.',
            latestCars: []
        });
    }
});

// ✅ Página de login (GET)
router.get('/login', (req, res) => {
    res.render('login', { layout: 'layout_list' });
});

// ✅ Rota de registro (GET) - Exibe o formulário de registro
router.get('/register', (req, res) => {
    res.render('register', { layout: 'layout_list' });
});

// ✅ Rota de registro (POST) - Processa o formulário de registro
router.post('/register', async (req, res) => {
    const { nome, email, senha, senha2 } = req.body;
    let errors = [];

    if (!nome || !email || !senha || !senha2) {
        errors.push({ text: 'Please fill in all fields.' });
    }
    if (senha !== senha2) {
        errors.push({ text: 'Passwords do not match.' });
    }
    if (senha.length < 6) {
        errors.push({ text: 'Password must be at least 6 characters long.' });
    }

    if (errors.length > 0) {
        res.render('register', {
            layout: 'layout_list',
            errors: errors,
            nome: nome,
            email: email
        });
    } else {
        try {
            const usuarioExistente = await Usuario.findOne({ email: email });
            if (usuarioExistente) {
                req.flash('error_msg', 'An account with this email already exists.');
                res.redirect('/register');
            } else {
                const novoUsuario = new Usuario({
                    nome: nome,
                    email: email,
                    senha: senha
                });

                const salt = await bcrypt.genSalt(10);
                novoUsuario.senha = await bcrypt.hash(novoUsuario.senha, salt);

                await novoUsuario.save();
                req.flash('success_msg', 'You are now registered and can log in!');
                res.redirect('/login');
            }
        } catch (err) {
            console.error("❌ Error registering user:", err);
            req.flash('error_msg', 'Error registering user: ' + err.message);
            res.redirect('/register');
        }
    }
});

// ✅ Página de erro de login (GET)
router.get('/loginerror', (req, res) => {
    res.render('loginerror', { layout: 'layout_list' });
});

// ✅ Rota de login (POST)
router.post('/login', (req, res, next) => {
    console.log("🛂 Attempting login with:", req.body);

    passport.authenticate('local', {
        successRedirect: '/admin',
        failureRedirect: '/loginerror',
        failureFlash: true
    })(req, res, next);
});

// ✅ Rota de logout (GET)
router.get('/logout', (req, res, next) => {
    req.logout(function(err) {
        if (err) {
            console.error("Error logging out:", err);
            return next(err);
        }
        req.flash('success_msg', 'You are logged out!');
        res.redirect('/login');
    });
});

// ============================================
// ✅ ROTAS DE RECUPERAÇÃO DE SENHA
// ============================================

// GET /forgot-password - Exibe o formulário para solicitar a redefinição de senha
router.get('/forgot-password', (req, res) => {
    res.render('forgot_password', { layout: 'layout_list' });
});

// POST /forgot-password - Processa a solicitação de redefinição de senha
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    let errors = [];

    if (!email) {
        errors.push({ text: 'Please enter your email.' });
    }

    if (errors.length > 0) {
        res.render('forgot_password', {
            layout: 'layout_list',
            errors: errors,
            email: email
        });
    } else {
        try {
            const usuario = await Usuario.findOne({ email: email });

            if (!usuario) {
                req.flash('error_msg', 'No user with that email found.');
                return res.redirect('/forgot-password');
            }

            const token = crypto.randomBytes(20).toString('hex');
            usuario.resetPasswordToken = token;
            usuario.resetPasswordExpires = Date.now() + 3600000;

            await usuario.save();

            const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${token}`;
            const emailContent = `
                <p>You are receiving this email because you (or someone else) has requested the reset of the password for your account.</p>
                <p>Please click on the following link, or paste this into your browser to complete the process:</p>
                <p><a href="${resetUrl}">${resetUrl}</a></p>
                <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
            `;

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: usuario.email,
                subject: 'KINGS AUTOHAUS - Password Reset',
                html: emailContent
            };

            await sendEmail(mailOptions);
            req.flash('success_msg', 'An email with password reset instructions has been sent to you.');
            res.redirect('/forgot-password');

        } catch (err) {
            console.error("❌ Error requesting password reset:", err);
            req.flash('error_msg', 'Error processing your request: ' + err.message);
            res.redirect('/forgot-password');
        }
    }
});

// GET /reset-password/:token - Exibe o formulário para redefinir a senha
router.get('/reset-password/:token', async (req, res) => {
    try {
        const usuario = await Usuario.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!usuario) {
            req.flash('error_msg', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgot-password');
        }

        res.render('reset_password', {
            layout: 'layout_list',
            token: req.params.token
        });

    } catch (err) {
        console.error("❌ Error verifying reset token:", err);
        req.flash('error_msg', 'Error processing your request.');
        res.redirect('/forgot-password');
    }
});

// POST /reset-password/:token - Processa a redefinição da senha
router.post('/reset-password/:token', async (req, res) => {
    const { senha, senha2 } = req.body;
    let errors = [];

    if (!senha || !senha2) {
        errors.push({ text: 'Please fill in both password fields.' });
    }
    if (senha !== senha2) {
        errors.push({ text: 'Passwords do not match.' });
    }
    if (senha.length < 6) {
        errors.push({ text: 'Password must be at least 6 characters long.' });
    }

    if (errors.length > 0) {
        return res.render('reset_password', {
            layout: 'layout_list',
            errors: errors,
            token: req.params.token
        });
    }

    try {
        const usuario = await Usuario.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!usuario) {
            req.flash('error_msg', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgot-password');
        }

        const salt = await bcrypt.genSalt(10);
        usuario.senha = await bcrypt.hash(senha, salt);
        usuario.resetPasswordToken = undefined;
        usuario.resetPasswordExpires = undefined;

        await usuario.save();
        req.flash('success_msg', 'Your password has been reset successfully! You can log in now.');
        res.redirect('/login');

    } catch (err) {
        console.error("❌ Error resetting password:", err);
        req.flash('error_msg', 'Error resetting your password: ' + err.message);
        res.redirect('/reset-password/' + req.params.token);
    }
});

// ✅ Página de Política de Privacidade (GET)
router.get('/privacy', (req, res) => {
    res.render('privacy', { layout: 'layout' });
});

// ✅ Página da Calculadora de Financiamento (GET)
router.get('/loan-calculator', (req, res) => {
    res.render('loan_calculator', { layout: 'layout' });
});


module.exports = router;
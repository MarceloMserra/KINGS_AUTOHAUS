const express = require('express');
const path = require('path');
const router = express.Router();
const multer = require('multer');
// REMOVIDO: const ElectricModel = require("../models/ElectricModel");
const GasModel = require('../models/GasModel');
const ServiceModel = require('../models/ServiceModel');
const CustomerModel = require('../models/CustomerModel');
const UserModel = require("../models/UserModel"); // Importa o modelo de usuário
const bcrypt = require('bcryptjs'); // Para criptografar senhas
const sendEmail = require("../utils/mailer");
const crypto = require('crypto'); // <-- ADICIONADO: Necessário para gerar o token

// Função auxiliar para converter strings com vírgula para números com ponto
function convertToNumber(value) {
    if (typeof value === 'string' && value.includes(',')) {
        return parseFloat(value.replace(',', '.'));
    }
    return parseFloat(value); // Converte diretamente se já for ponto ou número
}

// Middleware para verificar se o usuário está autenticado
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Please log in to view this resource.'); // Mensagem de erro para o usuário
    res.redirect('/login'); // Redireciona para a página de login
}

// Middleware para verificar se o usuário autenticado é um administrador
function ensureAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.isAdmin) {
        return next();
    }
    req.flash('error_msg', 'You do not have permission to access this page.');
    res.redirect('/admin'); // Redireciona para o painel admin ou outra página
}

// Aplicar o middleware 'ensureAuthenticated' a TODAS as rotas definidas neste router.
// Isso significa que qualquer rota abaixo só será acessível se o usuário estiver logado.
router.use(ensureAuthenticated);

// 🏠 Página inicial do painel admin (após login)
router.get('/', function (req, res) {
    console.log("🔐 Entered /admin route - user:", req.user);
    res.render('admin/admin_index', { layout: 'layout_list', user: req.user }); // Passa o objeto user
});

// 🔐 Redirecionamento do botão de login para o controller de usuário
router.post("/login", (req, res) => {
    res.redirect("/usuarios/login");
});

// 📤 Configuração do multer para upload de imagens
const storage = multer.diskStorage({
    destination: './public/images/',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// ============================ ROTAS DE ADMIN ============================

// 📊 Página principal do admin (rota redundante, a '/' já faz isso agora)
router.get('/admin_index', async function (req, res) {
    res.render("admin/admin_index", { layout: 'layout_list', user: req.user }); // Passa o objeto user
});

// 🛠 Lista de serviços
router.get('/service', async function (req, res) {
    let servicecars = await ServiceModel.find().lean();
    res.render("admin/service", { servicecars: servicecars, layout: 'layout_list' });
});

// ✉️ Enviar email ao cliente
router.get('/service/email/:mailid', async function (req, res) {
    const client_email = req.params.mailid;
    const mail_status = await sendEmail({
        from: process.env.EMAIL_USER,
        to: client_email,
        subject: "KINGS AUTOHAUS - Service Update",
        html: '<h4>Dear Customer, Vehicle service is now completed. Visit the garage to drive your vehicle back</h4>'
    });
    console.log("Email Status - " + mail_status);
    req.flash('success_msg', 'Service update email sent successfully!');
    res.redirect('/admin/service');
});


// ====================================================================
// ===================== ROTAS DE CARROS ELÉTRICOS REMOVIDAS =====================
// ====================================================================


// ⛽ Carros a gasolina
router.get('/gas', async function (req, res) {
    const gas_models = await GasModel.find().lean();
    res.render("admin/gas_list", { list: gas_models, layout: 'layout_list' });
});

router.get('/addgas', (req, res) => {
    res.render("admin/gas_form", { layout: 'layout_list' });
});

// ====================================================================
// ===================== MUDANÇA #1 NESTA FUNÇÃO ======================
// ====================================================================
router.post('/addgas', upload.array('imagesupld'), async function (req, res) {
    try {
        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            imageUrls = req.files.map(file => '/images/' + file.filename);
        }

        // --- LINHA NOVA ADICIONADA ---
        // Se o checkbox 'featured' foi marcado, o valor é "true". Se não, é undefined.
        // Isso converte para um Booleano (true/false) para salvar no banco de dados.
        const isFeatured = req.body.featured === 'true' ? true : false;
        // --- FIM DA LINHA NOVA ---

        const gas = new GasModel({
            brand: req.body.brand,
            title: req.body.title,
            t2: req.body.t2,
            year: convertToNumber(req.body.year),
            price: convertToNumber(req.body.price),
            priceStr: req.body.priceStr,
            topspeed: convertToNumber(req.body.topspeed),
            time60: convertToNumber(req.body.time60),
            mileage: convertToNumber(req.body.mileage),
            engine: convertToNumber(req.body.engine),
            cyl: convertToNumber(req.body.cyl),
            gearbox: req.body.gearbox,
            transmission: req.body.transmission,
            colour: req.body.colour,
            interior: req.body.interior,
            body: req.body.body,
            drivetrain: req.body.drivetrain,
            wheel: req.body.wheel,
            description: req.body.description,
            safety: req.body.safety,
            technology: req.body.technology,
            image: imageUrls,
            
            // --- LINHA ADICIONADA NA CONVERSA ANTERIOR ---
            featured: isFeatured, 
            
            // --- LINHA NOVA ADICIONADA AGORA ---
            // Salva o status que veio do formulário
            status: req.body.status
            // --- FIM DA LINHA NOVA ---
        });

        await gas.save();
        req.flash('success_msg', 'Gas car added successfully!');
        res.redirect('/admin/gas');
    } catch (err) {
        console.error("Error adding gas car:", err);
        req.flash('error_msg', 'Error adding gas car: ' + err.message);
        res.render("admin/gas_form", { layout: 'layout_list', error: err.message });
    }
});

router.get('/editgas/:id', async function (req, res) {
    try {
        const gasCar = await GasModel.findById(req.params.id).lean();
        if (!gasCar) {
            req.flash('error_msg', 'Gas car not found.');
            return res.redirect('/admin/gas');
        }
        res.render('admin/gas_edit_form', { gasCar: gasCar, layout: 'layout_list' });
    } catch (err) {
        console.error("Error loading edit form for gas car:", err);
        req.flash('error_msg', 'Error loading edit form: ' + err.message);
        res.redirect('/admin/gas');
    }
});

// ====================================================================
// ===================== MUDANÇA #2 NESTA FUNÇÃO ======================
// ====================================================================
router.put('/editgas/:id', upload.array('imagesupld'), async function (req, res) {
    try {
        let gasCar = await GasModel.findById(req.params.id);
        if (!gasCar) {
            req.flash('error_msg', 'Gas car not found for update.');
            return res.redirect('/admin/gas');
        }

        gasCar.brand = req.body.brand;
        gasCar.title = req.body.title;
        gasCar.t2 = req.body.t2;
        gasCar.year = convertToNumber(req.body.year);
        gasCar.price = convertToNumber(req.body.price);
        gasCar.priceStr = req.body.priceStr;
        gasCar.topspeed = convertToNumber(req.body.topspeed);
        gasCar.time60 = convertToNumber(req.body.time60);
        gasCar.mileage = convertToNumber(req.body.mileage);
        gasCar.engine = convertToNumber(req.body.engine);
        gasCar.cyl = convertToNumber(req.body.cyl);
        gasCar.gearbox = req.body.gearbox;
        gasCar.transmission = req.body.transmission;
        gasCar.colour = req.body.colour;
        gasCar.interior = req.body.interior;
        gasCar.body = req.body.body;
        gasCar.drivetrain = req.body.drivetrain;
        gasCar.wheel = req.body.wheel;
        gasCar.description = req.body.description;
        gasCar.safety = req.body.safety;
        gasCar.technology = req.body.technology;

        // --- LINHA ADICIONADA NA CONVERSA ANTERIOR ---
        gasCar.featured = req.body.featured === 'true' ? true : false;
        
        // --- LINHA NOVA ADICIONADA AGORA ---
        // Salva o status que veio do formulário
        gasCar.status = req.body.status;
        // --- FIM DA LINHA NOVA ---

        if (req.files && req.files.length > 0) {
            gasCar.image = req.files.map(file => '/images/' + file.filename);
        }

        await gasCar.save();
        req.flash('success_msg', 'Gas car updated successfully!');
        res.redirect('/admin/gas');
    } catch (err) {
        console.error("Error updating gas car:", err);
        req.flash('error_msg', 'Error updating gas car: ' + err.message);
        res.render("admin/gas_edit_form", { layout: 'layout_list', error: err.message, gasCar: req.body });
    }
});

router.get('/deletegas/:id', async function (req, res) {
    await GasModel.findByIdAndDelete(req.params.id);
    req.flash('success_msg', 'Gas car deleted successfully!');
    res.redirect('/admin/gas');
});

// 👤 Clientes
router.get('/customers', async function (req, res) {
    const customers = await CustomerModel.find().lean();
    req.flash('success_msg', 'Customers list loaded successfully!');
    res.render("admin/customers_list", { list: customers, layout: 'layout_list' });
});

router.get('/deletecustomer/:id', async function (req, res) {
    await CustomerModel.findByIdAndRemove(req.params.id);
    req.flash('success_msg', 'Customer deleted successfully!');
    res.redirect('/admin/customers');
});

// 🖼 Upload de imagens
router.get('/images', (req, res) => {
    res.render("admin/images_upload", { layout: 'layout_list' });
});

router.post('/uploadimage', upload.single('imageupld'), (req, res) => {
    if (req.file) {
        req.flash('success_msg', `Image ${req.file.filename} uploaded successfully!`);
        console.log(`Image ${req.file.filename} uploaded successfully to /public/images/`);
        res.redirect("/admin/images");
    } else {
        req.flash('error_msg', "No file uploaded or upload error.");
        res.render('admin/images_upload', { img: { err: "No file uploaded or upload error." }, layout: 'layout_list' });
    }
});

// ============================ ROTAS DE REGISTRO DE FUNCIONÁRIOS ============================
// Proteger estas rotas apenas para administradores
router.get('/register-staff', ensureAdmin, (req, res) => {
    res.render('admin/register_staff', { layout: 'layout_list' });
});

router.post('/register-staff', ensureAdmin, async (req, res) => {
    const { nome, email, senha, senha2, isAdmin } = req.body;
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
        res.render('admin/register_staff', {
            layout: 'layout_list',
            errors: errors,
            nome: nome,
            email: email,
            isAdmin: isAdmin
        });
    } else {
        try {
            const usuarioExistente = await UserModel.findOne({ email: email });
            if (usuarioExistente) {
                req.flash('error_msg', 'An account with this email already exists.');
                res.redirect('/admin/register-staff');
            } else {
                const novoUsuario = new UserModel({
                    nome: nome,
                    email: email,
                    senha: senha,
                    isAdmin: isAdmin === 'on' ? true : false
                });

                const salt = await bcrypt.genSalt(10);
                novoUsuario.senha = await bcrypt.hash(novoUsuario.senha, salt);

                await novoUsuario.save();
                req.flash('success_msg', `User ${nome} registered successfully!`);
                res.redirect('/admin/gas');
            }
        } catch (err) {
            console.error("Error registering staff:", err);
            req.flash('error_msg', 'Error registering staff: ' + err.message);
            res.render('admin/register_staff', { layout: 'layout_list', error: err.message, nome: nome, email: email, isAdmin: isAdmin });
        }
    }
});

// ============================ NOVA ROTA: LISTAR USUÁRIOS ============================
router.get('/users', ensureAdmin, async (req, res) => {
    try {
        const users = await UserModel.find().lean(); // Busca todos os usuários
        res.render('admin/users_list', {
            title: 'Manage Staff Users - KINGS AUTOHAUS',
            users: users,
            layout: 'layout_list',
            user: req.user // Passa o usuário logado para o template para controle de visibilidade
        });
    } catch (err) {
        console.error("Error fetching users list:", err);
        req.flash('error_msg', 'Error loading staff users list: ' + err.message);
        res.redirect('/admin');
    }
});

// ============================ ROTA DELETAR USUÁRIO ATUALIZADA ============================
router.delete('/deleteuser/:id', ensureAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Proteção para não deletar o admin principal
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.email === 'admin@admin.com') {
            return res.status(403).json({ success: false, message: 'Cannot delete primary admin account!' });
        }

        await UserModel.findByIdAndDelete(userId);
        
        // Responde com sucesso para o script
        res.json({ success: true, message: 'User deleted successfully' });

    } catch (err) {
        console.error("Error deleting user:", err);
        // Responde com erro para o script
        res.status(500).json({ success: false, message: 'Error deleting user: ' + err.message });
    }
});

// ============================ ROTA ADICIONADA: ENVIAR LINK DE RESET ============================
router.post('/send-reset-link', ensureAdmin, async (req, res) => {
    try {
        const { userId } = req.body;
        const usuario = await UserModel.findById(userId);

        if (!usuario) {
            return res.status(4404).json({ success: false, message: 'User not found.' });
        }

        // 1. Gerar Token (lógica copiada de usuarios.js)
        const token = crypto.randomBytes(20).toString('hex');
        usuario.resetPasswordToken = token;
        usuario.resetPasswordExpires = Date.now() + 3600000; // 1 hora

        await usuario.save();

        // 2. Preparar e enviar e-mail
        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${token}`;
        const emailContent = `
            <p>You are receiving this email because an admin from KINGS AUTOHAUS has triggered a password reset for your account.</p>
            <p>Please click on the following link, or paste this into your browser to complete the process:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>If you did not request this, please contact your administrator.</p>
        `;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: usuario.email,
            subject: 'KINGS AUTOHAUS - Staff Password Reset',
            html: emailContent
        };

        await sendEmail(mailOptions);

        // 3. Responder com sucesso para o script
        res.json({ success: true, message: `Password reset link sent to ${usuario.email}!` });

    } catch (err) {
        console.error("Error sending reset link:", err);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});


module.exports = router;
const express = require('express');
const path = require('path');
const router = express.Router();
const multer = require('multer');
const ElectricModel = require("../models/ElectricModel");
const GasModel = require('../models/GasModel');
const ServiceModel = require('../models/ServiceModel');
const CustomerModel = require('../models/CustomerModel');
const UserModel = require("../models/UserModel"); // Importa o modelo de usuário
const bcrypt = require('bcryptjs'); // Para criptografar senhas
const sendEmail = require("../utils/mailer");

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

// ⚡ Carros elétricos
router.get('/electric', async function (req, res) {
    const electric_models = await ElectricModel.find().lean();
    res.render("admin/electric_list", { list: electric_models, layout: 'layout_list' });
});

router.get('/addelectric', (req, res) => {
    res.render("admin/electric_form", { layout: 'layout_list' });
});

router.post('/addelectric', upload.array('imagesupld'), async function (req, res) {
    try {
        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            imageUrls = req.files.map(file => '/images/' + file.filename);
        }

        const electric = new ElectricModel({
            brand: req.body.brand,
            title: req.body.title,
            t1: req.body.t1,
            t2: req.body.t2,
            year: convertToNumber(req.body.year),
            price: convertToNumber(req.body.price),
            priceStr: req.body.priceStr,
            topspeed: convertToNumber(req.body.topspeed),
            time60: convertToNumber(req.body.time60),
            range: convertToNumber(req.body.range),
            colour: req.body.colour,
            interior: req.body.interior,
            wheel: req.body.wheel,
            description: req.body.description,
            safety: req.body.safety,
            rangedesc: req.body.rangedesc,
            image: imageUrls
        });
        await electric.save();
        req.flash('success_msg', 'Electric car added successfully!');
        res.redirect('/admin/electric');
    } catch (err) {
        console.error("Error adding electric car:", err);
        req.flash('error_msg', 'Error adding electric car: ' + err.message);
        res.render("admin/electric_form", { layout: 'layout_list', error: err.message });
    }
});

router.get('/editelectric/:id', async function (req, res) {
    try {
        const electricCar = await ElectricModel.findById(req.params.id).lean();
        if (!electricCar) {
            req.flash('error_msg', 'Electric car not found.');
            return res.redirect('/admin/electric');
        }
        res.render('admin/electric_edit_form', { electricCar: electricCar, layout: 'layout_list' });
    } catch (err) {
        console.error("Error loading edit form for electric car:", err);
        req.flash('error_msg', 'Error loading edit form: ' + err.message);
        res.redirect('/admin/electric');
    }
});

router.put('/editelectric/:id', upload.array('imagesupld'), async function (req, res) {
    try {
        let electricCar = await ElectricModel.findById(req.params.id);
        if (!electricCar) {
            req.flash('error_msg', 'Electric car not found for update.');
            return res.redirect('/admin/electric');
        }

        electricCar.brand = req.body.brand;
        electricCar.title = req.body.title;
        electricCar.t1 = req.body.t1;
        electricCar.t2 = req.body.t2;
        electricCar.year = convertToNumber(req.body.year);
        electricCar.price = convertToNumber(req.body.price);
        electricCar.priceStr = req.body.priceStr;
        electricCar.topspeed = convertToNumber(req.body.topspeed);
        electricCar.time60 = convertToNumber(req.body.time60);
        electricCar.range = convertToNumber(req.body.range);
        electricCar.colour = req.body.colour;
        electricCar.interior = req.body.interior;
        electricCar.wheel = req.body.wheel;
        electricCar.description = req.body.description;
        electricCar.safety = req.body.safety;
        electricCar.rangedesc = req.body.rangedesc;

        if (req.files && req.files.length > 0) {
            electricCar.image = req.files.map(file => '/images/' + file.filename);
        }

        await electricCar.save();
        req.flash('success_msg', 'Electric car updated successfully!');
        res.redirect('/admin/electric');
    } catch (err) {
        console.error("Error updating electric car:", err);
        req.flash('error_msg', 'Error updating electric car: ' + err.message);
        res.render("admin/electric_edit_form", { layout: 'layout_list', error: err.message, electricCar: req.body });
    }
});

router.get('/deleteelectric/:id', async function (req, res) {
    await ElectricModel.findByIdAndRemove(req.params.id);
    req.flash('success_msg', 'Electric car deleted successfully!');
    res.redirect('/admin/electric');
});

// ⛽ Carros a gasolina
router.get('/gas', async function (req, res) {
    const gas_models = await GasModel.find().lean();
    res.render("admin/gas_list", { list: gas_models, layout: 'layout_list' });
});

router.get('/addgas', (req, res) => {
    res.render("admin/gas_form", { layout: 'layout_list' });
});

router.post('/addgas', upload.array('imagesupld'), async function (req, res) {
    try {
        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            imageUrls = req.files.map(file => '/images/' + file.filename);
        }

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
            image: imageUrls
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
    await GasModel.findByIdAndRemove(req.params.id);
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

// ============================ NOVA ROTA: DELETAR USUÁRIO ============================
router.get('/deleteuser/:id', ensureAdmin, async (req, res) => {
    try {
        await UserModel.findByIdAndRemove(req.params.id);
        req.flash('success_msg', 'User deleted successfully!');
        res.redirect('/admin/users');
    } catch (err) {
        console.error("Error deleting user:", err);
        req.flash('error_msg', 'Error deleting user: ' + err.message);
        res.redirect('/admin/users');
    }
});


module.exports = router;

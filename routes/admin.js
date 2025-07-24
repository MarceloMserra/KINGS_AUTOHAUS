const express = require('express');
const path = require('path');
const router = express.Router();
const multer = require('multer');
const ElectricModel = require("../models/ElectricModel");
const GasModel = require('../models/GasModel');
const ServiceModel = require('../models/ServiceModel');
const CustomerModel = require('../models/CustomerModel');
const UserModel = require("../models/UserModel");
const sendEmail = require("../utils/mailer");

// Função auxiliar para converter strings com vírgula para números com ponto
function convertToNumber(value) {
    if (typeof value === 'string' && value.includes(',')) {
        return parseFloat(value.replace(',', '.'));
    }
    return parseFloat(value); // Converte diretamente se já for ponto ou número
}

// 🏠 Página inicial do painel admin (após login)
router.get('/', function (req, res) {
    console.log("🔐 Entrou na rota /admin - user:", req.user);
    res.render('admin/admin_index', { layout: 'layout_list' });
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
// Configurado para aceitar até 10 arquivos no campo 'imagesupld'
const upload = multer({ storage: storage });

// ============================ ROTAS DE ADMIN ============================

// 📊 Página principal do admin (rota redundante, a '/' já faz isso agora)
router.get('/admin_index', async function (req, res) {
    res.render("admin/admin_index", { layout: 'layout_list' });
});

// 🛠 Lista de serviços
router.get('/service', async function (req, res) {
    let servicecars = await ServiceModel.find().lean(); // Adicionado .lean()
    res.render("admin/service", { servicecars: servicecars, layout: 'layout_list' });
});

// ✉️ Enviar email ao cliente
router.get('/service/email/:mailid', async function (req, res) {
    const client_email = req.params.mailid;
    const mail_status = await sendEmail(client_email);
    console.log("Email Status - " + mail_status);
    res.redirect('/admin/service');
});

// ⚡ Carros elétricos
router.get('/electric', async function (req, res) {
    const electric_models = await ElectricModel.find().lean(); // Adicionado .lean()
    res.render("admin/electric_list", { list: electric_models, layout: 'layout_list' });
});

router.get('/addelectric', (req, res) => {
    res.render("admin/electric_form", { layout: 'layout_list' });
});

// Rota POST para adicionar carro elétrico com upload de múltiplas imagens
router.post('/addelectric', upload.array('imagesupld', 10), async function (req, res) { // 'imagesupld' e limite de 10
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
            year: convertToNumber(req.body.year), // Converte para número
            price: convertToNumber(req.body.price), // Converte para número
            priceStr: req.body.priceStr,
            topspeed: convertToNumber(req.body.topspeed), // Converte para número
            time60: convertToNumber(req.body.time60), // Converte para número
            range: convertToNumber(req.body.range), // Converte para número
            colour: req.body.colour,
            interior: req.body.interior,
            wheel: req.body.wheel,
            description: req.body.description,
            safety: req.body.safety,
            rangedesc: req.body.rangedesc,
            image: imageUrls
        });
        await electric.save();
        req.flash('success_msg', 'Carro elétrico adicionado com sucesso!');
        res.redirect('/admin/electric');
    } catch (err) {
        console.error("Erro ao adicionar carro elétrico:", err);
        req.flash('error_msg', 'Erro ao adicionar carro elétrico: ' + err.message);
        res.render("admin/electric_form", { layout: 'layout_list', error: err.message });
    }
});

// Rota GET para exibir formulário de edição de carro elétrico
router.get('/editelectric/:id', async function (req, res) {
    try {
        const electricCar = await ElectricModel.findById(req.params.id).lean();
        if (!electricCar) {
            req.flash('error_msg', 'Carro elétrico não encontrado.');
            return res.redirect('/admin/electric');
        }
        res.render('admin/electric_edit_form', { electricCar: electricCar, layout: 'layout_list' });
    } catch (err) {
        console.error("Erro ao carregar formulário de edição de carro elétrico:", err);
        req.flash('error_msg', 'Erro ao carregar formulário de edição: ' + err.message);
        res.redirect('/admin/electric');
    }
});

// Rota PUT para atualizar carro elétrico com upload de múltiplas imagens
router.put('/editelectric/:id', upload.array('imagesupld', 10), async function (req, res) {
    try {
        let electricCar = await ElectricModel.findById(req.params.id);
        if (!electricCar) {
            req.flash('error_msg', 'Carro elétrico não encontrado para atualização.');
            return res.redirect('/admin/electric');
        }

        // Atualiza os campos do carro
        electricCar.brand = req.body.brand;
        electricCar.title = req.body.title;
        electricCar.t1 = req.body.t1;
        electricCar.t2 = req.body.t2;
        electricCar.year = convertToNumber(req.body.year); // Converte para número
        electricCar.price = convertToNumber(req.body.price); // Converte para número
        electricCar.priceStr = req.body.priceStr;
        electricCar.topspeed = convertToNumber(req.body.topspeed); // Converte para número
        electricCar.time60 = convertToNumber(req.body.time60); // Converte para número
        electricCar.range = convertToNumber(req.body.range); // Converte para número
        electricCar.colour = req.body.colour;
        electricCar.interior = req.body.interior;
        electricCar.wheel = req.body.wheel;
        electricCar.description = req.body.description;
        electricCar.safety = req.body.safety;
        electricCar.rangedesc = req.body.rangedesc;

        // Lida com novas imagens: se novas imagens forem enviadas, substitui as antigas
        if (req.files && req.files.length > 0) {
            electricCar.image = req.files.map(file => '/images/' + file.filename);
        }

        await electricCar.save();
        req.flash('success_msg', 'Carro elétrico atualizado com sucesso!');
        res.redirect('/admin/electric');
    } catch (err) {
        console.error("Erro ao atualizar carro elétrico:", err);
        req.flash('error_msg', 'Erro ao atualizar carro elétrico: ' + err.message);
        res.render("admin/electric_edit_form", { layout: 'layout_list', error: err.message, electricCar: req.body });
    }
});

router.get('/deleteelectric/:id', async function (req, res) {
    await ElectricModel.findByIdAndRemove(req.params.id);
    req.flash('success_msg', 'Carro elétrico excluído com sucesso!');
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

// Rota POST para adicionar carro a gasolina com upload de múltiplas imagens
router.post('/addgas', upload.array('imagesupld', 10), async function (req, res) {
    try {
        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            imageUrls = req.files.map(file => '/images/' + file.filename);
        }

        const gas = new GasModel({
            brand: req.body.brand,
            title: req.body.title,
            t2: req.body.t2,
            year: convertToNumber(req.body.year), // Converte para número
            price: convertToNumber(req.body.price), // Converte para número
            priceStr: req.body.priceStr,
            topspeed: convertToNumber(req.body.topspeed), // Converte para número
            time60: convertToNumber(req.body.time60), // Converte para número
            mileage: convertToNumber(req.body.mileage), // Converte para número
            engine: convertToNumber(req.body.engine), // Converte para número
            cyl: convertToNumber(req.body.cyl), // Converte para número
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
        req.flash('success_msg', 'Carro a gasolina adicionado com sucesso!');
        res.redirect('/admin/gas');
    } catch (err) {
        console.error("Erro ao adicionar carro a gasolina:", err);
        req.flash('error_msg', 'Erro ao adicionar carro a gasolina: ' + err.message);
        res.render("admin/gas_form", { layout: 'layout_list', error: err.message });
    }
});

// Rota GET para exibir formulário de edição de carro a gasolina
router.get('/editgas/:id', async function (req, res) {
    try {
        const gasCar = await GasModel.findById(req.params.id).lean();
        if (!gasCar) {
            req.flash('error_msg', 'Carro a gasolina não encontrado.');
            return res.redirect('/admin/gas');
        }
        res.render('admin/gas_edit_form', { gasCar: gasCar, layout: 'layout_list' });
    } catch (err) {
        console.error("Erro ao carregar formulário de edição de carro a gasolina:", err);
        req.flash('error_msg', 'Erro ao carregar formulário de edição: ' + err.message);
        res.redirect('/admin/gas');
    }
});

// Rota PUT para atualizar carro a gasolina com upload de múltiplas imagens
router.put('/editgas/:id', upload.array('imagesupld', 10), async function (req, res) {
    try {
        let gasCar = await GasModel.findById(req.params.id);
        if (!gasCar) {
            req.flash('error_msg', 'Carro a gasolina não encontrado para atualização.');
            return res.redirect('/admin/gas');
        }

        // Atualiza os campos do carro
        gasCar.brand = req.body.brand;
        gasCar.title = req.body.title;
        gasCar.t2 = req.body.t2;
        gasCar.year = convertToNumber(req.body.year); // Converte para número
        gasCar.price = convertToNumber(req.body.price); // Converte para número
        gasCar.priceStr = req.body.priceStr;
        gasCar.topspeed = convertToNumber(req.body.topspeed); // Converte para número
        gasCar.time60 = convertToNumber(req.body.time60); // Converte para número
        gasCar.mileage = convertToNumber(req.body.mileage); // Converte para número
        gasCar.engine = convertToNumber(req.body.engine); // Converte para número
        gasCar.cyl = convertToNumber(req.body.cyl); // Converte para número
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

        // Lida com novas imagens: se novas imagens forem enviadas, substitui as antigas
        if (req.files && req.files.length > 0) {
            gasCar.image = req.files.map(file => '/images/' + file.filename);
        }

        await gasCar.save();
        req.flash('success_msg', 'Carro a gasolina atualizado com sucesso!');
        res.redirect('/admin/gas');
    } catch (err) {
        console.error("Erro ao atualizar carro a gasolina:", err);
        req.flash('error_msg', 'Erro ao atualizar carro a gasolina: ' + err.message);
        res.render("admin/gas_edit_form", { layout: 'layout_list', error: err.message, gasCar: req.body });
    }
});

router.get('/deletegas/:id', async function (req, res) {
    await GasModel.findByIdAndRemove(req.params.id);
    req.flash('success_msg', 'Carro a gasolina excluído com sucesso!');
    res.redirect('/admin/gas');
});

// 👤 Clientes
router.get('/customers', async function (req, res) {
    const customers = await CustomerModel.find().lean(); // Adicionado .lean()
    res.render("admin/customers_list", { list: customers, layout: 'layout_list' });
});

router.get('/deletecustomer/:id', async function (req, res) {
    await CustomerModel.findByIdAndRemove(req.params.id);
    req.flash('success_msg', 'Cliente excluído com sucesso!');
    res.redirect('/admin/customers');
});

// 🖼 Upload de imagens
router.get('/images', (req, res) => {
    res.render("admin/images_upload", { layout: 'layout_list' });
});

router.post('/uploadimage', upload.single('imageupld'), (req, res) => {
    if (req.file) {
        req.flash('success_msg', `Imagem ${req.file.filename} enviada com sucesso!`);
        console.log(`Imagem ${req.file.filename} enviada com sucesso para /public/images/`);
        res.redirect("/admin/images");
    } else {
        req.flash('error_msg', "Nenhum arquivo enviado ou erro no upload.");
        res.render('admin/images_upload', { img: { err: "Nenhum arquivo enviado ou erro no upload." }, layout: 'layout_list' });
    }
});

module.exports = router;

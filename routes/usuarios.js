const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const passport = require('passport');

// ✅ Modelos de usuário e carros
require('../models/UserModel');
const Usuario = mongoose.model('usuarios');
const GasModel = require('../models/GasModel'); // Importar o modelo GasModel
const ElectricModel = require('../models/ElectricModel'); // Importar o modelo ElectricModel


// ✅ Página principal - Home (GET)
router.get('/', async (req, res) => {
    try {
        // Busca todos os carros a gasolina e elétricos
        const gasCars = await GasModel.find().lean();
        const electricCars = await ElectricModel.find().lean();

        const allCars = [...gasCars, ...electricCars];

        // Processa as marcas e suas contagens para o filtro "Fazer" (Make)
        const brandsMap = new Map();
        allCars.forEach(car => {
            // AGORA USANDO O CAMPO 'brand' DIRETAMENTE DO MODELO
            const brand = car.brand;
            if (brand) {
                // Converte a marca para Capitalize a primeira letra para exibição consistente
                const formattedBrand = brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
                brandsMap.set(formattedBrand, (brandsMap.get(formattedBrand) || 0) + 1);
            }
        });

        const carBrands = Array.from(brandsMap.entries()).map(([name, count]) => ({
            name: name,
            count: count
        })).sort((a, b) => a.name.localeCompare(b.name)); // Ordena por nome da marca

        // Prepara os dados para o filtro de modelo (por marca)
        const modelsByBrand = {};
        carBrands.forEach(brand => {
            modelsByBrand[brand.name] = allCars
                // Filtra carros pela marca exata (agora usando o campo 'brand' do modelo)
                .filter(car => (car.brand && car.brand.toLowerCase() === brand.name.toLowerCase()))
                .map(car => car.t2 || car.title) // Usa t2 como modelo, ou o título completo
                .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicatas
                .sort(); // Ordena os modelos
        });

        // ✅ NOVA LÓGICA PARA FEATURED VEHICLES
        // Busca carros em destaque - prioriza carros mais recentes e com imagens
        const featuredCarsQuery = await GasModel.find({
            image: { $exists: true, $ne: [], $not: { $size: 0 } } // Apenas carros com imagens
        })
        .sort({
            date: -1, // Ordena por data mais recente primeiro
            price: -1  // Depois por preço mais alto (carros premium)
        })
        .limit(12) // Pega até 12 carros para o carrossel
        .lean();

        // Se não houver carros suficientes com imagens, complementa com outros carros
        let latestCars = featuredCarsQuery;
        if (latestCars.length < 6) {
            const additionalCars = await GasModel.find({
                _id: { $nin: latestCars.map(car => car._id) } // Exclui os já selecionados
            })
            .sort({ date: -1, price: -1 })
            .limit(12 - latestCars.length)
            .lean();
            
            latestCars = [...latestCars, ...additionalCars];
        }

        // Adiciona carros elétricos em destaque se necessário
        if (latestCars.length < 8) {
            const electricFeatured = await ElectricModel.find({
                image: { $exists: true, $ne: [], $not: { $size: 0 } }
            })
            .sort({ date: -1, price: -1 })
            .limit(8 - latestCars.length)
            .lean();
            
            latestCars = [...latestCars, ...electricFeatured];
        }

        // Ordena os carros em destaque de forma alternada para variedade
        latestCars = latestCars.sort((a, b) => {
            // Prioriza carros com mais imagens e mais recentes
            const scoreA = (a.image?.length || 0) * 10 + (a.price || 0) / 10000;
            const scoreB = (b.image?.length || 0) * 10 + (b.price || 0) / 10000;
            return scoreB - scoreA;
        }).slice(0, 10); // Limita a 10 carros em destaque

        console.log(`🚗 Loaded ${latestCars.length} featured cars for homepage carousel`);

        res.render('home', {
            layout: 'layout', // Usar o layout principal para a home page pública
            carBrands: carBrands, // Marcas com contagens para o filtro "Fazer"
            modelsByBrand: JSON.stringify(modelsByBrand), // Modelos por marca para JS (stringified)
            latestCars: latestCars, // Carros para a seção de carrossel Featured Vehicles
            // Você pode adicionar outras variáveis aqui para a seção "Sobre a Empresa" se precisar
        });
    } catch (err) {
        console.error("❌ Erro ao buscar dados para a home page:", err);
        req.flash('error_msg', 'Não foi possível carregar o conteúdo da página inicial no momento.');
        res.render('home', { 
            layout: 'layout', 
            error: 'Não foi possível carregar o conteúdo.',
            carBrands: [],
            modelsByBrand: JSON.stringify({}),
            latestCars: []
        });
    }
});

// ✅ Página de login (GET)
router.get('/login', (req, res) => {
    res.render('login', { layout: 'layout_list' }); // Usa layout_list.hbs como layout
});


// ✅ Página de erro de login (GET)
router.get('/loginerror', (req, res) => {
    res.render('loginerror', { layout: 'layout_list' });
});

// ✅ Rota de login (POST)
router.post('/login', (req, res, next) => {
    console.log("🛂 Tentando login com:", req.body);

    passport.authenticate('local', {
        successRedirect: '/admin', // ao logar com sucesso
        failureRedirect: '/loginerror', // ao falhar, redireciona para a rota correta
        failureFlash: true
    })(req, res, next);
});

// ✅ Rota de logout (GET)
router.get('/logout', (req, res, next) => {
    req.logout(function(err) {
        if (err) {
            console.error("Erro ao fazer logout:", err);
            return next(err);
        }
        req.flash('success_msg', 'Deslogado com sucesso!');
        res.redirect('/login');
    });
});

module.exports = router;
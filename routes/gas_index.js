const express = require('express');
const router = express.Router();
const GasModel = require('../models/GasModel');
const ElectricModel = require('../models/ElectricModel');

// Rota para a página pública de carros a gasolina
router.get('/', async (req, res) => {
    try {
        const query = {}; // Objeto para construir a consulta MongoDB

        // Filtros da URL (make, model, price, year, etc.)
        if (req.query.make) {
            query.brand = new RegExp(req.query.make, 'i');
        }
        if (req.query.model) {
            query.t2 = new RegExp(req.query.model, 'i');
        }
        if (req.query.price) {
            query.price = { $lte: parseInt(req.query.price) };
        }
        if (req.query.year) {
            query.year = parseInt(req.query.year);
        }
        if (req.query.mileage) {
            query.mileage = { $lte: parseInt(req.query.mileage) };
        }
        if (req.query.colour) {
            query.colour = new RegExp(req.query.colour, 'i');
        }
        if (req.query.transmission) {
            query.transmission = new RegExp(req.query.transmission, 'i');
        }
        if (req.query.drivetrain) {
            query.drivetrain = new RegExp(req.query.drivetrain, 'i');
        }
        if (req.query.cyl) {
            query.cyl = parseInt(req.query.cyl);
        }

        // Lógica de ordenação
        let sortOption = {};
        if (req.query.sort) {
            switch (req.query.sort) {
                case 'price_asc':
                    sortOption = { price: 1 };
                    break;
                case 'price_desc':
                    sortOption = { price: -1 };
                    break;
                case 'year_desc':
                    sortOption = { year: -1 };
                    break;
                case 'topspeed_desc':
                    sortOption = { topspeed: -1 };
                    break;
                case 'mileage_desc':
                    sortOption = { mileage: -1 };
                    break;
            }
        }

        const gasCars = await GasModel.find(query).sort(sortOption).lean();

        // --- NOVA LÓGICA DE REDIRECIONAMENTO E EXIBIÇÃO ---
        if (gasCars.length === 1 && Object.keys(req.query).length > 0) {
            // Se apenas um carro for encontrado E a requisição veio com filtros,
            // redireciona diretamente para a página de detalhes desse carro.
            return res.redirect(`/gas/details/${gasCars[0]._id}`);
        } else {
            // Se múltiplos carros forem encontrados, ou se não houver filtros,
            // ou se nenhum carro for encontrado, renderiza a página de listagem.

            // Busca todos os carros a gasolina novamente para gerar os filtros de marca/modelo
            // (Esta parte é para o caso de a página ser acessada diretamente sem filtros,
            // ou para o "Limpar Filtros" que mostra todos)
            const allGasCarsForFilters = await GasModel.find().lean();
            const brandsMap = new Map();
            allGasCarsForFilters.forEach(car => {
                const brand = car.brand;
                if (brand) {
                    const formattedBrand = brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
                    brandsMap.set(formattedBrand, (brandsMap.get(formattedBrand) || 0) + 1);
                }
            });
            const carBrands = Array.from(brandsMap.entries()).map(([name, count]) => ({
                name: name,
                count: count
            })).sort((a, b) => a.name.localeCompare(b.name));

            const modelsByBrand = {};
            carBrands.forEach(brand => {
                modelsByBrand[brand.name] = allGasCarsForFilters
                    .filter(car => (car.brand && car.brand.toLowerCase() === brand.name.toLowerCase()))
                    .map(car => car.t2 || car.title)
                    .filter((value, index, self) => self.indexOf(value) === index)
                    .sort();
            });

            res.render('gas_index', {
                layout: 'layout',
                gasCars: gasCars, // Lista de carros filtrados/encontrados
                carBrands: carBrands, // Marcas para o filtro (se o filtro for exibido)
                modelsByBrand: JSON.stringify(modelsByBrand), // Modelos por marca para JS
                selectedMake: req.query.make || '',
                selectedModel: req.query.model || '',
                selectedPrice: req.query.price || '',
                selectedYear: req.query.year || '',
                selectedMileage: req.query.mileage || '',
                selectedColour: req.query.colour || '',
                selectedTransmission: req.query.transmission || '',
                selectedDrivetrain: req.query.drivetrain || '',
                selectedCyl: req.query.cyl || '',
                selectedSort: req.query.sort || ''
            });
        }
    } catch (err) {
        console.error("❌ Erro ao carregar carros a gasolina na página pública:", err);
        req.flash('error_msg', 'Não foi possível carregar os carros a gasolina no momento.');
        res.render('gas_index', { layout: 'layout', error: 'Não foi possível carregar os carros.' });
    }
});

// Rota para a página de detalhes de um único carro a gasolina
router.get('/details/:id', async (req, res) => {
    try {
        const car = await GasModel.findById(req.params.id).lean();
        if (!car) {
            req.flash('error_msg', 'Carro não encontrado.');
            return res.redirect('/gas');
        }
        res.render('car_details', {
            layout: 'layout',
            car: car
        });
    } catch (err) {
        console.error("❌ Erro ao carregar detalhes do carro:", err);
        req.flash('error_msg', 'Não foi possível carregar os detalhes do carro.');
        res.redirect('/gas');
    }
});

module.exports = router;

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const ElectricModel = require("../models/ElectricModel");

router.use(express.static("public"));

// ======================
// 📱 ROTA PRINCIPAL /electric - CORRIGIDA E SEGURA
// ======================
router.get('/', async function (req, res) {
    try {
        const {
            brand,
            minPrice,
            maxPrice,
            minYear,
            maxYear,
            sortBy,
            priceBy,
            year,
            yearLt,
            rangeLt,
            sort = 'date',
            order = 'desc',
            page = 1,
            limit = 12
        } = req.query;
        
        console.log('🔍 Electric route query params:', req.query);
        
        // VALIDAÇÃO RIGOROSA: Evita erros de cast
        let filters = {};
        let sortObject = { date: -1 }; // Default sort
        
        // ==========================================
        // FILTROS COM VALIDAÇÃO SEGURA
        // ==========================================
        
        // Brand filter
        if (brand && brand !== 'all' && typeof brand === 'string' && brand.length > 0) {
            // Verifica se não é um valor estranho como "acknowledgmentConsent"
            if (!brand.includes('Consent') && !brand.includes('acknowledgment')) {
                filters.brand = new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            }
        }
        
        // Price filters - VALIDAÇÃO RIGOROSA
        if (minPrice && typeof minPrice === 'string') {
            const minPriceNum = parseFloat(minPrice);
            if (!isNaN(minPriceNum) && minPriceNum > 0 && minPriceNum < 10000000) {
                filters.price = filters.price || {};
                filters.price.$gte = minPriceNum;
            }
        }
        
        if (maxPrice && typeof maxPrice === 'string') {
            const maxPriceNum = parseFloat(maxPrice);
            if (!isNaN(maxPriceNum) && maxPriceNum > 0 && maxPriceNum < 10000000) {
                filters.price = filters.price || {};
                filters.price.$lte = maxPriceNum;
            }
        }
        
        // Legacy price filter (priceBy)
        if (priceBy && typeof priceBy === 'string' && priceBy.startsWith('under')) {
            const priceValue = priceBy.slice(5);
            const priceLt = parseFloat(priceValue) * 1000;
            if (!isNaN(priceLt) && priceLt > 0) {
                filters.price = { $lte: priceLt };
                sortObject = { price: -1 };
            }
        }
        
        // Year filters - VALIDAÇÃO SEGURA
        const currentYear = new Date().getFullYear();
        
        if (minYear && typeof minYear === 'string') {
            const minYearNum = parseInt(minYear);
            if (!isNaN(minYearNum) && minYearNum >= 1990 && minYearNum <= currentYear + 2) {
                filters.year = filters.year || {};
                filters.year.$gte = minYearNum;
            }
        }
        
        if (maxYear && typeof maxYear === 'string') {
            const maxYearNum = parseInt(maxYear);
            if (!isNaN(maxYearNum) && maxYearNum >= 1990 && maxYearNum <= currentYear + 2) {
                filters.year = filters.year || {};
                filters.year.$lte = maxYearNum;
            }
        }
        
        // Legacy year filters
        if (year && typeof year === 'string' && year.startsWith('year')) {
            const yearValue = parseInt(year.slice(4));
            if (!isNaN(yearValue) && yearValue >= 1990 && yearValue <= currentYear + 2) {
                filters.year = yearValue;
            }
        }
        
        if (yearLt && typeof yearLt === 'string' && yearLt.startsWith('year')) {
            const yearValue = parseInt(yearLt.slice(4));
            if (!isNaN(yearValue) && yearValue >= 1990 && yearValue <= currentYear + 2) {
                filters.year = { $lte: yearValue };
            }
        }
        
        // Range filter (electric specific)
        if (rangeLt && typeof rangeLt === 'string') {
            const rangeValue = parseFloat(rangeLt);
            if (!isNaN(rangeValue) && rangeValue > 0 && rangeValue < 1000) {
                filters.range = { $lte: rangeValue };
                sortObject = { range: -1 };
            }
        }
        
        // ==========================================
        // SORTING COM VALIDAÇÃO
        // ==========================================
        
        if (sortBy && typeof sortBy === 'string') {
            switch (sortBy) {
                case 'latest':
                    sortObject = { year: -1 };
                    break;
                case 'highprice':
                    sortObject = { price: -1 };
                    break;
                case 'lowprice':
                    sortObject = { price: 1 };
                    break;
                case 'highrange':
                    sortObject = { range: -1 };
                    break;
                case 'lowrange':
                    sortObject = { range: 1 };
                    break;
                case 'highperf':
                    sortObject = { time60: 1 };
                    break;
                case 'lowperf':
                    sortObject = { time60: -1 };
                    break;
                default:
                    sortObject = { date: -1 };
            }
        } else if (sort && typeof sort === 'string') {
            const allowedSortFields = ['date', 'price', 'year', 'brand', 'range', 'time60'];
            if (allowedSortFields.includes(sort)) {
                const sortOrder = order === 'asc' ? 1 : -1;
                sortObject = {};
                sortObject[sort] = sortOrder;
            }
        }
        
        // ==========================================
        // PAGINAÇÃO SEGURA
        // ==========================================
        
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 12));
        const skip = (pageNum - 1) * limitNum;
        
        console.log('🔍 Final filters:', JSON.stringify(filters, null, 2));
        console.log('📊 Sort object:', sortObject);
        
        // ==========================================
        // BUSCA NO BANCO - COM TRATAMENTO DE ERRO
        // ==========================================
        
        let vehicles = [];
        let totalCount = 0;
        
        try {
            [vehicles, totalCount] = await Promise.all([
                ElectricModel.find(filters)
                    .sort(sortObject)
                    .skip(skip)
                    .limit(limitNum)
                    .lean(),
                ElectricModel.countDocuments(filters)
            ]);
        } catch (dbError) {
            console.error('❌ Database query error:', dbError);
            // Se der erro na query, retorna busca básica
            vehicles = await ElectricModel.find({}).sort({ date: -1 }).limit(12).lean();
            totalCount = await ElectricModel.countDocuments({});
        }
        
        const totalPages = Math.ceil(totalCount / limitNum);
        
        // ==========================================
        // RESPOSTA
        // ==========================================
        
        res.render('electric_index', {
            title: 'Electric Vehicles - KINGS AUTOHAUS',
            models: vehicles, // Mantém compatibilidade com template
            vehicles: vehicles, // Para futuras melhorias
            pagination: {
                current: pageNum,
                total: totalPages,
                hasNext: pageNum < totalPages,
                hasPrev: pageNum > 1,
                next: pageNum < totalPages ? pageNum + 1 : null,
                prev: pageNum > 1 ? pageNum - 1 : null
            },
            currentFilters: {
                brand: brand || '',
                minPrice: minPrice || '',
                maxPrice: maxPrice || '',
                minYear: minYear || '',
                maxYear: maxYear || '',
                sortBy: sortBy || '',
                sort: sort || 'date',
                order: order || 'desc'
            },
            resultCount: totalCount,
            layout: 'layout'
        });
        
    } catch (error) {
        console.error('❌ Electric vehicles page error:', error);
        
        // FALLBACK: Se tudo der errado, mostra página básica
        try {
            const basicVehicles = await ElectricModel.find({}).sort({ date: -1 }).limit(12).lean();
            res.render('electric_index', {
                title: 'Electric Vehicles - KINGS AUTOHAUS',
                models: basicVehicles,
                vehicles: basicVehicles,
                error: 'Some filters may not be working properly.',
                layout: 'layout'
            });
        } catch (fallbackError) {
            console.error('❌ Fallback error:', fallbackError);
            res.status(500).render('error', { 
                message: 'Unable to load electric vehicles',
                layout: 'layout'
            });
        }
    }
});

// ======================
// 📄 ROTA DE FILTROS LEGACY - REDIRECIONAMENTO
// ======================
router.get('/filter', (req, res) => {
    // Redireciona filtros antigos para a rota principal
    const queryString = new URLSearchParams(req.query).toString();
    res.redirect(`/electric${queryString ? '?' + queryString : ''}`);
});

// ======================
// 🚗 ROTA DE DETALHES DO VEÍCULO
// ======================
router.get('/booknow/:id', async function (req, res) {
    try {
        const modelid = req.params.id;
        
        // Valida se é um ID válido do MongoDB
        if (!mongoose.Types.ObjectId.isValid(modelid)) {
            return res.status(404).render('404', {
                title: 'Vehicle Not Found - KINGS AUTOHAUS',
                message: 'The vehicle you are looking for does not exist.',
                layout: 'layout'
            });
        }
        
        const booked_model = await ElectricModel.findById(modelid);
        
        if (!booked_model) {
            return res.status(404).render('404', {
                title: 'Vehicle Not Found - KINGS AUTOHAUS',
                message: 'The vehicle you are looking for does not exist.',
                layout: 'layout'
            });
        }
        
        // Incrementa views se o campo existir
        await ElectricModel.findByIdAndUpdate(modelid, { $inc: { views: 1 } });
        
        res.render("booking", { 
            model: booked_model,
            title: `${booked_model.brand} ${booked_model.t2} - KINGS AUTOHAUS`,
            layout: 'layout'
        });
        
    } catch (error) {
        console.error('❌ Electric vehicle details error:', error);
        res.status(500).render('error', {
            message: 'Unable to load vehicle details',
            layout: 'layout'
        });
    }
});

// ======================
// 🔄 REDIRECIONAMENTO DE FILTROS LEGADOS
// ======================
router.get('/filter/booknow/:id', (req, res) => {
    res.redirect(`/electric/booknow/${req.params.id}`);
});

module.exports = router;
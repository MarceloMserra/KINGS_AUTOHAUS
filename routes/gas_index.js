// routes/gas_index.js - UPDATED VERSION
const express = require('express');
const router = express.Router();
const GasModel = require('../models/GasModel');
const mongoose = require('mongoose');

// Route for the vehicle inventory catalog with improved filters
router.get('/', async (req, res) => {
  try {
    const {
      year,
      make,
      model,
      priceRange,
      bodyType,
      transmission,
      sort = 'date-desc',
      page = 1,
      perPage = 12,
      search
    } = req.query;

    // Ensure page and perPage are numbers
    const currentPage = parseInt(page);
    const vehiclesPerPage = parseInt(perPage);

    // Dynamic filter construction
    let filters = { status: 'available' }; // Only show available cars

    // Year filter
    if (year && year !== '') {
      filters.year = parseInt(year);
    }

    // Make filter
    if (make && make !== '') {
      filters.brand = new RegExp(make, 'i');
    }

    // Model filter
    if (model && model !== '') {
      filters.t2 = new RegExp(model, 'i');
    }

    // Price range filter
    if (priceRange && priceRange !== '') {
      const [minPrice, maxPrice] = priceRange.split('-').map(p => parseInt(p));
      filters.price = {};
      if (minPrice) filters.price.$gte = minPrice;
      if (maxPrice && maxPrice !== 999999) filters.price.$lte = maxPrice;
      else if (maxPrice === 999999) filters.price.$gte = minPrice; // For "100000+" option
    }

    // Body type filter
    if (bodyType && bodyType !== '') {
      filters.body = new RegExp(bodyType, 'i');
    }

    // Transmission filter
    if (transmission && transmission !== '') {
      filters.transmission = new RegExp(transmission, 'i');
    }

    // Text search across multiple fields
    if (search) {
      filters.$or = [
        { title: new RegExp(search, 'i') },
        { brand: new RegExp(search, 'i') },
        { t2: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { trim: new RegExp(search, 'i') },
        { stockNumber: new RegExp(search, 'i') },
        { vin: new RegExp(search, 'i') }
      ];
    }

    // Dynamic sorting
    let sortObject = {};
    switch(sort) {
      case 'price-asc':
        sortObject.price = 1;
        break;
      case 'price-desc':
        sortObject.price = -1;
        break;
      case 'year-desc':
        sortObject.year = -1;
        break;
      case 'year-asc':
        sortObject.year = 1;
        break;
      case 'mileage-asc':
        sortObject.mileage = 1;
        break;
      case 'mileage-desc':
        sortObject.mileage = -1;
        break;
      case 'date-asc':
        sortObject.date = 1;
        break;
      default: // 'date-desc'
        sortObject.date = -1;
    }

    // Pagination calculation
    const skip = (currentPage - 1) * vehiclesPerPage;

    // Execute queries in parallel for efficiency
    const [vehicles, totalCount, filterOptions] = await Promise.all([
      // Vehicles for the current page
      GasModel.find(filters)
        .sort(sortObject)
        .skip(skip)
        .limit(vehiclesPerPage)
        .lean(),

      // Total count for pagination
      GasModel.countDocuments(filters),

      // Options for dynamic filters
      Promise.all([
        GasModel.distinct('brand', { status: 'available' }),
        GasModel.distinct('transmission', { status: 'available' }),
        GasModel.distinct('body', { status: 'available' }),
        GasModel.aggregate([
          { $match: { status: 'available' } },
          { $group: {
            _id: null,
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
            minYear: { $min: '$year' },
            maxYear: { $max: '$year' }
          }}
        ])
      ])
    ]);

    const [brands, transmissions, bodyTypes, priceYearRanges] = filterOptions;

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / vehiclesPerPage);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    // Prepare models by brand for dynamic model dropdown
    const modelsByBrand = {};
    for (const brandName of brands) {
        const models = await GasModel.distinct('t2', { 
          brand: new RegExp(brandName, 'i'), 
          status: 'available' 
        });
        modelsByBrand[brandName] = models.sort();
    }

    // Clean up body types for better display
    const cleanBodyTypes = bodyTypes
      .filter(body => body && body.trim() !== '')
      .map(body => {
        // Standardize common body type names
        const normalized = body.toLowerCase().trim();
        if (normalized.includes('coupe') || normalized.includes('coupé')) return 'Coupe';
        if (normalized.includes('sedan') || normalized.includes('4 door')) return 'Sedan';
        if (normalized.includes('suv') || normalized.includes('sport utility')) return 'SUV';
        if (normalized.includes('convertible') || normalized.includes('cabriolet')) return 'Convertible';
        if (normalized.includes('hatchback') || normalized.includes('hatch')) return 'Hatchback';
        if (normalized.includes('pickup') || normalized.includes('truck')) return 'Pickup';
        if (normalized.includes('wagon') || normalized.includes('estate')) return 'Wagon';
        return body; // Return original if no match
      })
      .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
      .sort();

    res.render('gas_index', {
      title: 'Premium Vehicle Collection - KINGS AUTOHAUS',
      vehicles,
      pagination: {
        current: currentPage,
        total: totalPages,
        hasNext: hasNextPage,
        hasPrev: hasPrevPage,
        next: hasNextPage ? currentPage + 1 : null,
        prev: hasPrevPage ? currentPage - 1 : null
      },
      filters: {
        brands: brands.sort(),
        transmissions: transmissions.sort(),
        bodyTypes: cleanBodyTypes,
        priceRange: priceYearRanges[0] || { minPrice: 0, maxPrice: 200000 },
        yearRange: priceYearRanges[0] || { minYear: 2010, maxYear: new Date().getFullYear() }
      },
      modelsByBrand: JSON.stringify(modelsByBrand),
      currentFilters: req.query,
      resultCount: totalCount,
      layout: 'layout'
    });

  } catch (error) {
    console.error('Catalog error:', error);
    res.status(500).render('error', { 
      message: 'Unable to load vehicle catalog',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Route for single vehicle details page with view tracking
router.get('/details/:id', async (req, res) => {
  try {
    const vehicleId = req.params.id;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
      return res.status(404).render('404', { 
        message: 'Vehicle not found',
        layout: 'layout'
      });
    }

    // Find vehicle and increment views
    const vehicle = await GasModel.findByIdAndUpdate(
      vehicleId,
      { $inc: { views: 1 } },
      { new: true }
    ).lean();

    if (!vehicle) {
      return res.status(404).render('404', { 
        message: 'Vehicle not found',
        layout: 'layout'
      });
    }

    // Related vehicles (same brand or similar price range)
    const relatedVehicles = await GasModel.find({
      _id: { $ne: vehicleId },
      status: 'available',
      $or: [
        { brand: vehicle.brand },
        {
          price: {
            $gte: vehicle.price * 0.7,
            $lte: vehicle.price * 1.3
          }
        }
      ]
    })
    .limit(4)
    .lean();

    // Schema.org structured data for SEO
    const structuredData = {
      "@context": "https://schema.org/",
      "@type": "Car",
      "name": `${vehicle.year} ${vehicle.brand} ${vehicle.t2}`,
      "brand": {
        "@type": "Brand",
        "name": vehicle.brand
      },
      "model": vehicle.t2,
      "vehicleModelDate": vehicle.year,
      "color": vehicle.colour,
      "bodyType": vehicle.body,
      "vehicleTransmission": vehicle.transmission,
      "mileageFromOdometer": {
        "@type": "QuantitativeValue",
        "value": vehicle.mileage,
        "unitCode": "SMI"
      },
      "offers": {
        "@type": "Offer",
        "price": vehicle.price,
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "seller": {
          "@type": "AutoDealer",
          "name": "KINGS AUTOHAUS",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "1278 Washington St",
            "addressLocality": "Holliston",
            "addressRegion": "MA",
            "postalCode": "01746",
            "addressCountry": "US"
          }
        }
      },
      "image": vehicle.image || []
    };

    res.render('car_details', {
      title: `${vehicle.year} ${vehicle.brand} ${vehicle.t2} - KINGS AUTOHAUS`,
      car: vehicle,
      relatedVehicles,
      structuredData: JSON.stringify(structuredData),
      layout: 'layout',
      meta: {
        description: `${vehicle.year} ${vehicle.brand} ${vehicle.t2} - ${(vehicle.description || '').substring(0, 160)}`,
        keywords: `${vehicle.brand}, ${vehicle.t2}, ${vehicle.year}, luxury car, premium vehicle, ${vehicle.body}`,
        canonical: req.protocol + '://' + req.get('host') + req.originalUrl
      }
    });

  } catch (error) {
    console.error('Vehicle details error:', error);
    res.status(500).render('error', { 
      message: 'Unable to load vehicle details',
      layout: 'layout'
    });
  }
});

module.exports = router;
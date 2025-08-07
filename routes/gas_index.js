// routes/gas_index.js
const express = require('express');
const router = express.Router();
const GasModel = require('../models/GasModel'); // Ensure this path is correct
const mongoose = require('mongoose'); // Import mongoose for ObjectId validation

// Route for the vehicle inventory catalog
router.get('/', async (req, res) => {
  try {
    const {
      brand,
      minPrice,
      maxPrice,
      minYear,
      maxYear,
      transmission,
      color,
      sort = 'date', // Default sort by date
      order = 'desc', // Default order descending
      page = 1,
      limit = 12, // Default limit per page to 12 cars for good performance
      search // New search field for general text search
    } = req.query;

    // Ensure page and limit are numbers
    const currentPage = parseInt(page);
    const carsPerPage = parseInt(limit);

    // Dynamic filter construction
    let filters = { status: 'available' }; // Only show available cars

    if (brand && brand !== 'all') {
      filters.brand = new RegExp(brand, 'i');
    }

    if (minPrice || maxPrice) {
      filters.price = {};
      if (minPrice) filters.price.$gte = parseFloat(minPrice);
      if (maxPrice) filters.price.$lte = parseFloat(maxPrice);
    }

    if (minYear || maxYear) {
      filters.year = {};
      if (minYear) filters.year.$gte = parseInt(minYear);
      if (maxYear) filters.year.$lte = parseInt(maxYear);
    }

    if (transmission && transmission !== 'all') {
      filters.transmission = new RegExp(transmission, 'i');
    }

    if (color && color !== 'all') {
      filters.colour = new RegExp(color, 'i');
    }

    // Textual search across multiple fields
    if (search) {
      filters.$or = [
        { title: new RegExp(search, 'i') },
        { brand: new RegExp(search, 'i') },
        { t2: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { trim: new RegExp(search, 'i') }, // Search by trim
        { stockNumber: new RegExp(search, 'i') }, // Search by stock number
        { vin: new RegExp(search, 'i') } // Search by VIN
      ];
    }

    // Dynamic sorting
    let sortObject = {};
    // Handle specific sort values from the frontend
    if (sort === 'price-asc') {
      sortObject.price = 1;
    } else if (sort === 'price-desc') {
      sortObject.price = -1;
    } else if (sort === 'year-desc') {
      sortObject.year = -1;
    } else if (sort === 'year-asc') {
      sortObject.year = 1;
    } else {
      // Default sort
      sortObject.date = -1;
    }

    // Pagination calculation
    const skip = (currentPage - 1) * carsPerPage;

    // Execute queries in parallel for efficiency
    const [vehicles, totalCount, filterOptions] = await Promise.all([
      // Vehicles for the current page
      GasModel.find(filters)
        .sort(sortObject)
        .skip(skip)
        .limit(carsPerPage)
        .lean(), // Use .lean() for faster query results

      // Total count for pagination
      GasModel.countDocuments(filters),

      // Options for dynamic filters (brands, transmissions, colors, price/year ranges)
      Promise.all([
        GasModel.distinct('brand', { status: 'available' }),
        GasModel.distinct('transmission', { status: 'available' }),
        GasModel.distinct('colour', { status: 'available' }),
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

    const [brands, transmissions, colors, priceYearRanges] = filterOptions;

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / carsPerPage);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    // Prepare data for the frontend
    const modelsByBrand = {};
    for (const brandName of brands) {
        // Fetch distinct models for each brand
        const models = await GasModel.distinct('t2', { brand: brandName, status: 'available' });
        modelsByBrand[brandName] = models.sort();
    }

    res.render('gas_index', {
      title: 'Premium Vehicle Collection - KINGS AUTOHAUS',
      vehicles, // Pass 'vehicles' instead of 'gasCars' for consistency
      pagination: {
        current: currentPage,
        total: totalPages,
        totalCount: totalCount, // Pass total count for display
        hasNext: hasNextPage,
        hasPrev: hasPrevPage,
        next: hasNextPage ? currentPage + 1 : null,
        prev: hasPrevPage ? currentPage - 1 : null
      },
      filters: {
        brands: brands.sort(),
        transmissions: transmissions.sort(),
        colors: colors.sort(),
        priceRange: priceYearRanges[0] || { minPrice: 0, maxPrice: 1000000 }, // Default range if no cars
        yearRange: priceYearRanges[0] || { minYear: 1990, maxYear: new Date().getFullYear() + 1 }
      },
      modelsByBrand: JSON.stringify(modelsByBrand), // Pass models by brand as JSON string
      currentFilters: req.query, // Pass current filters to pre-select dropdowns
      resultCount: totalCount,
      layout: 'layout'
    });

  } catch (error) {
    console.error('Catalog error:', error);
    res.status(500).render('error', { message: 'Unable to load vehicle catalog' });
  }
});

// Route for single vehicle details page with view tracking
router.get('/details/:id', async (req, res) => {
  try {
    const vehicleId = req.params.id;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
      return res.status(404).render('404', { message: 'Vehicle not found' });
    }

    // Find vehicle and increment views
    const vehicle = await GasModel.findByIdAndUpdate(
      vehicleId,
      { $inc: { views: 1 } }, // Increment view counter
      { new: true } // Return the updated document
    ).lean(); // Use .lean() for faster query results

    if (!vehicle) {
      return res.status(404).render('404', { message: 'Vehicle not found' });
    }

    // Related vehicles (same brand or price category)
    const relatedVehicles = await GasModel.find({
      _id: { $ne: vehicleId }, // Exclude current vehicle
      status: 'available',
      $or: [
        { brand: vehicle.brand },
        {
          price: {
            $gte: vehicle.price * 0.8, // 20% less
            $lte: vehicle.price * 1.2  // 20% more
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
      "brand": vehicle.brand,
      "model": vehicle.t2,
      "vehicleModelDate": vehicle.year,
      "mileageFromOdometer": {
        "@type": "QuantitativeValue",
        "value": vehicle.mileage,
        "unitCode": "SMI"
      },
      "offers": {
        "@type": "Offer",
        "price": vehicle.price,
        "priceCurrency": "BRL", // Assuming BRL as currency
        "availability": "https://schema.org/InStock"
      },
      "image": vehicle.image
    };

    res.render('car_details', {
      title: `${vehicle.year} ${vehicle.brand} ${vehicle.t2} - KINGS AUTOHAUS`,
      car: vehicle, // Pass 'car' instead of 'vehicle' for consistency with template
      relatedVehicles,
      structuredData: JSON.stringify(structuredData),
      layout: 'layout',
      meta: {
        description: `${vehicle.year} ${vehicle.brand} ${vehicle.t2} - ${vehicle.description.substring(0, 160)}`,
        keywords: `${vehicle.brand}, ${vehicle.t2}, ${vehicle.year}, luxury car, premium vehicle`,
        canonical: req.protocol + '://' + req.get('host') + req.originalUrl
      }
    });

  } catch (error) {
    console.error('Vehicle details error:', error);
    res.status(500).render('error', { message: 'Unable to load vehicle details' });
  }
});

module.exports = router;

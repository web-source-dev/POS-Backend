const express = require('express');
const Inventory = require('../models/Inventory');
const { verifyToken, isAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/images/');
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'inventory-' + uniqueSuffix + ext);
  }
});

// Filter function to allow only image files
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, JPG, PNG, GIF, and WEBP files are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage, 
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB file size limit
  }
});

// Configure multer for CSV file uploads
const csvStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/csv/');
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'inventory-bulk-' + uniqueSuffix + ext);
  }
});

// Filter function to allow only CSV files
const csvFileFilter = (req, file, cb) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only CSV files are allowed.'), false);
  }
};

const uploadCsv = multer({ 
  storage: csvStorage, 
  fileFilter: csvFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB file size limit
  }
});

// Get all inventory items (with optional filters)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { category, search, status, supplier, subcategory, subcategory2, brand, vehicleName } = req.query;
    const userId = req.user.id;
    
    // Build query based on filters
    let query = { userId };
    
    if (category) {
      query.category = category;
    }
    
    if (subcategory) {
      query.subcategory = subcategory;
    }
    
    if (subcategory2) {
      query.subcategory2 = subcategory2;
    }
    
    if (brand) {
      query.brand = brand;
    }
    
    if (vehicleName) {
      query.vehicleName = vehicleName;
    }
    
    if (supplier) {
      query.supplier = supplier;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { subcategory: { $regex: search, $options: 'i' } },
        { subcategory2: { $regex: search, $options: 'i' } },
        { categoryPath: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { vehicleName: { $regex: search, $options: 'i' } }
      ];
    }
    
    const items = await Inventory.find(query)
      .populate('supplier', 'name contact email phone')
      .sort({ createdAt: -1 });
    
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single inventory item
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const item = await Inventory.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).populate('supplier', 'name contact email phone');
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload image for inventory item
router.post('/upload-image', verifyToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }
    
    // Create the URL for the uploaded image
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${baseUrl}/uploads/images/${req.file.filename}`;
    
    res.status(200).json({ 
      message: 'Image uploaded successfully',
      imageUrl: imageUrl
    });
  } catch (error) {
    // Delete uploaded file in case of error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    
    console.error('Image upload error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create inventory item
router.post('/', verifyToken, async (req, res) => {
  try {
    const { 
      name, sku, category, price, stock, description, reorderLevel,
      subcategory, subcategory2, brand, supplier, purchasePrice, location, 
      imageUrl, expiryDate, unitOfMeasure, measureValue, tags, taxRate, vehicleName
    } = req.body;

    console.log(req.body);

    
    // Check if item with SKU already exists for this user
    const existingItem = await Inventory.findOne({ 
      sku, 
      userId: req.user.id 
    });
    
    if (existingItem) {
      return res.status(400).json({ message: 'Item with this SKU already exists' });
    }
    
    // Create new inventory item
    const newItem = new Inventory({
      name,
      sku,
      category,
      price,
      stock,
      description,
      userId: req.user.id,
      reorderLevel: reorderLevel || 5,
      // New fields
      subcategory,
      subcategory2,
      brand,
      supplier: supplier && supplier !== "" ? supplier : null,
      purchasePrice,
      location,
      imageUrl,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      unitOfMeasure,
      measureValue,
      tags,
      taxRate,
      vehicleName
    });
    
    await newItem.save();

    // Update the supplier's totalOrders and lastOrder
    if (supplier && supplier !== "" && supplier !== "null") {
      const Supplier = require('../models/Supplier');
      await Supplier.findByIdAndUpdate(supplier, {
        $inc: { totalOrders: 1 },
        lastOrder: Date.now()
      });
    }
    
    res.status(201).json(newItem);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update inventory item
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { 
      name, sku, category, price, stock, description, reorderLevel,
      subcategory, subcategory2, brand, supplier, purchasePrice, location, 
      imageUrl, expiryDate, unitOfMeasure, measureValue, tags, taxRate, vehicleName
    } = req.body;
    
    // Check if item exists and belongs to user
    let item = await Inventory.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Check if updating to an existing SKU
    if (sku !== item.sku) {
      const existingItem = await Inventory.findOne({ 
        sku, 
        userId: req.user.id,
        _id: { $ne: req.params.id }
      });
      
      if (existingItem) {
        return res.status(400).json({ message: 'Item with this SKU already exists' });
      }
    }
    
    // Update fields
    item.name = name || item.name;
    item.sku = sku || item.sku;
    item.category = category || item.category;
    item.price = price !== undefined ? price : item.price;
    item.stock = stock !== undefined ? stock : item.stock;
    item.description = description !== undefined ? description : item.description;
    item.reorderLevel = reorderLevel || item.reorderLevel;
    
    // Update new fields
    if (subcategory !== undefined) item.subcategory = subcategory;
    if (subcategory2 !== undefined) item.subcategory2 = subcategory2;
    if (brand !== undefined) item.brand = brand;
    if (supplier !== undefined) item.supplier = supplier && supplier !== "" ? supplier : null;
    if (purchasePrice !== undefined) item.purchasePrice = purchasePrice;
    if (location !== undefined) item.location = location;
    if (imageUrl !== undefined) item.imageUrl = imageUrl;
    if (expiryDate !== undefined) item.expiryDate = new Date(expiryDate);
    if (unitOfMeasure !== undefined) item.unitOfMeasure = unitOfMeasure;
    if (measureValue !== undefined) item.measureValue = measureValue;
    if (tags !== undefined) item.tags = tags;
    if (taxRate !== undefined) item.taxRate = taxRate;
    if (vehicleName !== undefined) item.vehicleName = vehicleName;
    
    await item.save();
    
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete inventory item
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const item = await Inventory.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get inventory categories
router.get('/categories/list', verifyToken, async (req, res) => {
  try {
    const categories = await Inventory.distinct('category', { userId: req.user.id });
    
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get suppliers list
router.get('/suppliers/list', verifyToken, async (req, res) => {
  try {
    const { category, subcategory, brand } = req.query;
    
    // If category filter is provided, find suppliers that have items in that category
    if (category || subcategory || brand) {
      // Build query for inventory items
      let itemQuery = { 
        userId: req.user.id,
        supplier: { $ne: null, $ne: "" }
      };
      
      if (category) {
        itemQuery.category = category;
      }
      
      if (subcategory) {
        itemQuery.subcategory = subcategory;
      }
      
      if (brand) {
        itemQuery.brand = brand;
      }
      
      // Find unique supplier IDs from inventory items
      const supplierIds = await Inventory.distinct('supplier', itemQuery);
      
      // Some suppliers might be stored as strings and some as ObjectIds
      // Build a query that handles both cases
      const stringIds = supplierIds.filter(id => typeof id === 'string');
      const objectIds = supplierIds.filter(id => typeof id !== 'string');
      
      // Import the Supplier model
      const Supplier = require('../models/Supplier');
      
      // Find suppliers using the IDs
      const suppliers = await Supplier.find({
        $or: [
          { _id: { $in: objectIds } },
          { name: { $in: stringIds } }
        ]
      }, 'name _id');
      
      res.json(suppliers);
    } else {
      // No filters, just return all suppliers
      const Supplier = require('../models/Supplier');
      const suppliers = await Supplier.find({}, 'name _id');
      res.json(suppliers);
    }
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get brands list
router.get('/brands/list', verifyToken, async (req, res) => {
  try {
    const { category, subcategory } = req.query;
    let query = { 
      userId: req.user.id,
      brand: { $ne: null, $ne: "" }
    };
    
    // Filter by category if provided
    if (category) {
      query.category = category;
    }
    
    // Further filter by subcategory if provided
    if (subcategory) {
      query.subcategory = subcategory;
    }
    
    const brands = await Inventory.distinct('brand', query);
    
    res.json(brands);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get vehicle names list
router.get('/vehicles/list', verifyToken, async (req, res) => {
  try {
    const { category, subcategory, brand } = req.query;
    let query = { 
      userId: req.user.id,
      vehicleName: { $ne: null, $ne: "" }
    };
    
    // Apply filters if provided
    if (category) {
      query.category = category;
    }
    
    if (subcategory) {
      query.subcategory = subcategory;
    }
    
    if (brand) {
      query.brand = brand;
    }
    
    const vehicleNames = await Inventory.distinct('vehicleName', query);
    
    res.json(vehicleNames);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get inventory subcategories list
router.get('/subcategories/list', verifyToken, async (req, res) => {
  try {
    const { category } = req.query;
    let query = { 
      userId: req.user.id,
      subcategory: { $ne: null, $ne: "" }
    };
    
    // If category is provided, filter subcategories by parent category
    if (category) {
      query.category = category;
    }
    
    const subcategories = await Inventory.distinct('subcategory', query);
    
    res.json(subcategories);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get subcategory2 list
router.get('/subcategories2/list', verifyToken, async (req, res) => {
  try {
    const { category, subcategory } = req.query;
    console.log('Fetching subcategory2 values:', { category, subcategory, userId: req.user.id });
    
    let query = { 
      userId: req.user.id,
      subcategory2: { $ne: null, $ne: "" }
    };
    
    // Filter by parent categories if provided
    if (category) {
      query.category = category;
    }
    
    if (subcategory) {
      query.subcategory = subcategory;
    }
    
    const subcategories2 = await Inventory.distinct('subcategory2', query);
    console.log('Found subcategory2 values:', subcategories2);
    
    res.json(subcategories2);
  } catch (error) {
    console.error('Error fetching subcategory2 values:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get inventory statistics
router.get('/stats/summary', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const totalItems = await Inventory.countDocuments({ userId });
    const lowStockItems = await Inventory.countDocuments({ userId, status: 'Low Stock' });
    const outOfStockItems = await Inventory.countDocuments({ userId, status: 'Out of Stock' });
    
    // Get total inventory value
    const items = await Inventory.find({ userId });
    const totalValue = items.reduce((sum, item) => sum + (item.price * item.stock), 0);
    
    // Calculate total purchase value and potential profit
    const totalPurchaseValue = items.reduce((sum, item) => {
      if (item.purchasePrice && item.stock) {
        return sum + (item.purchasePrice * item.stock);
      }
      return sum;
    }, 0);
    
    const potentialProfit = totalValue - totalPurchaseValue;
    
    res.json({
      totalItems,
      lowStockItems,
      outOfStockItems,
      totalValue,
      totalPurchaseValue,
      potentialProfit
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get sales history for a specific inventory item
router.get('/:id/sales', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, customer } = req.query;
    const userId = req.user.id;
    
    // Import the Sales model
    const Sales = require('../models/Sales');
    
    // Build the query
    let query = {
      userId,
      'items.itemId': id
    };
    
    // Apply date filters if provided
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }
    
    // Find all sales that include this item
    const salesData = await Sales.find(query).sort({ date: -1 });
    
    // Extract the relevant item data from each sale
    const salesHistory = salesData.map(sale => {
      // Find this specific item in the sale's items array
      const item = sale.items.find(item => item.itemId.toString() === id);
      
      // Only include sales where customer matches filter (if provided)
      if (customer && !sale.customerName.toLowerCase().includes(customer.toLowerCase())) {
        return null;
      }
      
      return {
        _id: sale._id,
        date: sale.date,
        customerName: sale.customerName || 'Walk-in Customer',
        quantity: item.quantity,
        price: item.price,
        total: item.quantity * item.price,
        receiptNumber: sale.receiptNumber
      };
    }).filter(item => item !== null); // Remove null entries (filtered out by customer name)
    
    res.json(salesHistory);
  } catch (error) {
    console.error('Error fetching sales history:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get inventory template for bulk upload
router.get('/bulk-upload/template', verifyToken, (req, res) => {
  try {
    // Define CSV headers based on inventory model
    const headers = [
      'name', 'sku', 'category', 'subcategory', 'subcategory2', 'brand', 
      'price', 'purchasePrice', 'stock', 'description', 'reorderLevel', 'location',
      'expiryDate', 'unitOfMeasure', 'measureValue', 'tags', 'taxRate', 'vehicleName'
    ];
    
    // Create CSV content with headers and example items
    const exampleItems = [
      'Example Item 1,SKU001,Category1,Subcategory1,Subcategory2,Brand1,10.00,5.00,100,Description1,5,Location1,2023-12-31,each,1,tag1,0,Vehicle1',
      'Example Item 2,SKU002,Category2,Subcategory1,Subcategory2,Brand2,20.00,10.00,200,Description2,5,Location2,2024-01-31,each,1,tag2,0,Vehicle2',
      'Example Item 3,SKU003,Category3,Subcategory1,Subcategory2,Brand3,30.00,15.00,300,Description3,5,Location3,2024-02-28,each,1,tag3,0,Vehicle3'
    ];
    
    const csvContent = headers.join(',') + '\n' + exampleItems.join('\n') + '\n';
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory_template.csv"');
    
    // Send the CSV content
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Bulk upload inventory items
router.post('/bulk-upload', verifyToken, uploadCsv.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No CSV file uploaded' });
    }
    
    // Read the uploaded CSV file
    const fs = require('fs');
    const csv = require('csv-parser');
    const results = [];
    const errors = [];
    let successCount = 0;
    
    // Create a readable stream from the uploaded file
    const stream = fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        // Process each row in the CSV
        for (let i = 0; i < results.length; i++) {
          try {
            const row = results[i];
            
            // Check required fields
            if (!row.name || !row.sku || !row.category || !row.price) {
              errors.push({
                row: i + 1,
                sku: row.sku || 'N/A',
                error: 'Missing required fields (name, sku, category, or price)'
              });
              continue;
            }
            
            // Check if item with SKU already exists
            const existingItem = await Inventory.findOne({ 
              sku: row.sku, 
              userId: req.user.id 
            });
            
            if (existingItem) {
              errors.push({
                row: i + 1,
                sku: row.sku,
                error: 'Item with this SKU already exists'
              });
              continue;
            }
            
            // Prepare the inventory item data
            const itemData = {
              name: row.name,
              sku: row.sku,
              category: row.category,
              subcategory: row.subcategory || '',
              subcategory2: row.subcategory2 || '',
              brand: row.brand || '',
              vehicleName: row.vehicleName || '',
              supplier: row.supplier && row.supplier.trim() !== "" ? new mongoose.Types.ObjectId(row.supplier) : null,
              price: parseFloat(row.price) || 0,
              purchasePrice: parseFloat(row.purchasePrice) || 0,
              stock: parseInt(row.stock) || 0,
              description: row.description || '',
              reorderLevel: parseInt(row.reorderLevel) || 5,
              location: row.location || '',
              expiryDate: row.expiryDate ? new Date(row.expiryDate) : null,
              unitOfMeasure: row.unitOfMeasure || 'each',
              measureValue: row.measureValue || '',
              tags: row.tags ? row.tags.split(',').map(tag => tag.trim()) : [],
              taxRate: parseFloat(row.taxRate) || 0,
              userId: req.user.id
            };
            
            // Create the inventory item
            const newItem = new Inventory(itemData);
            await newItem.save();
            successCount++;
          } catch (err) {
            errors.push({
              row: i + 1,
              sku: results[i].sku || 'N/A',
              error: err.message
            });
          }
        }
        
        // Delete the uploaded file
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
        
        // Return the result
        res.json({
          message: 'Bulk upload completed',
          totalRows: results.length,
          successCount,
          errorCount: errors.length,
          errors
        });
      });
  } catch (error) {
    // Delete uploaded file in case of error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 
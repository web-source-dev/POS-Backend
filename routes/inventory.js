const express = require('express');
const Inventory = require('../models/Inventory');
const { verifyToken, isAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

// Get all inventory items (with optional filters)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { category, search, status, supplier, subcategory, brand } = req.query;
    const userId = req.user.id;
    
    // Build query based on filters
    let query = { userId };
    
    if (category) {
      query.category = category;
    }
    
    if (subcategory) {
      query.subcategory = subcategory;
    }
    
    if (brand) {
      query.brand = brand;
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
        { barcode: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { supplier: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }
    
    const items = await Inventory.find(query).sort({ createdAt: -1 });
    
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
    });
    
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
      barcode, subcategory, brand, supplier, purchasePrice, location, 
      imageUrl, expiryDate, unitOfMeasure, weight, dimensions, tags, taxRate
    } = req.body;
    
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
      barcode,
      subcategory,
      brand,
      supplier,
      purchasePrice,
      location,
      imageUrl,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      unitOfMeasure,
      weight,
      dimensions,
      tags,
      taxRate
    });
    
    await newItem.save();
    
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update inventory item
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { 
      name, sku, category, price, stock, description, reorderLevel,
      barcode, subcategory, brand, supplier, purchasePrice, location, 
      imageUrl, expiryDate, unitOfMeasure, weight, dimensions, tags, taxRate
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
    if (barcode !== undefined) item.barcode = barcode;
    if (subcategory !== undefined) item.subcategory = subcategory;
    if (brand !== undefined) item.brand = brand;
    if (supplier !== undefined) item.supplier = supplier;
    if (purchasePrice !== undefined) item.purchasePrice = purchasePrice;
    if (location !== undefined) item.location = location;
    if (imageUrl !== undefined) item.imageUrl = imageUrl;
    if (expiryDate !== undefined) item.expiryDate = new Date(expiryDate);
    if (unitOfMeasure !== undefined) item.unitOfMeasure = unitOfMeasure;
    if (weight !== undefined) item.weight = weight;
    if (dimensions !== undefined) item.dimensions = dimensions;
    if (tags !== undefined) item.tags = tags;
    if (taxRate !== undefined) item.taxRate = taxRate;
    
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
    const suppliers = await Inventory.distinct('supplier', { 
      userId: req.user.id,
      supplier: { $ne: null, $ne: "" }
    });
    
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get brands list
router.get('/brands/list', verifyToken, async (req, res) => {
  try {
    const brands = await Inventory.distinct('brand', { 
      userId: req.user.id,
      brand: { $ne: null, $ne: "" }
    });
    
    res.json(brands);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get subcategories list
router.get('/subcategories/list', verifyToken, async (req, res) => {
  try {
    const subcategories = await Inventory.distinct('subcategory', { 
      userId: req.user.id,
      subcategory: { $ne: null, $ne: "" }
    });
    
    res.json(subcategories);
  } catch (error) {
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

module.exports = router; 
const express = require('express');
const Inventory = require('../models/Inventory');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all inventory items (with optional filters)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { category, search, status } = req.query;
    const userId = req.user.id;
    
    // Build query based on filters
    let query = { userId };
    
    if (category) {
      query.category = category;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
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

// Create inventory item
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, sku, category, price, stock, description, reorderLevel } = req.body;
    
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
      reorderLevel: reorderLevel || 5
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
    const { name, sku, category, price, stock, description, reorderLevel } = req.body;
    
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
    
    res.json({
      totalItems,
      lowStockItems,
      outOfStockItems,
      totalValue
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 
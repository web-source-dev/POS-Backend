const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const Sales = require('../models/Sales');
const CashDrawer = require('../models/CashDrawer');
const { verifyToken } = require('../middleware/auth');

/**
 * @route   POST /api/sales/complete
 * @desc    Complete a sale and update inventory
 * @access  Private
 */
router.post('/complete', verifyToken, async (req, res) => {
  try {
    const { items, total, discount, cashAmount, change, customerName } = req.body;
    const userId = req.user.id;

    // Validate request
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Sale must include at least one item' });
    }

    // Process inventory updates
    const updatedItems = [];
    const saleItems = [];
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    for (const item of items) {
      // Find the inventory item
      const inventoryItem = await Inventory.findOne({ _id: item.id, userId });
      
      if (!inventoryItem) {
        return res.status(404).json({ 
          message: `Item ${item.name} not found in inventory` 
        });
      }
      
      // Check if there's enough stock
      if (inventoryItem.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Not enough stock for ${item.name}. Available: ${inventoryItem.stock}` 
        });
      }
      
      // Update inventory
      inventoryItem.stock -= item.quantity;
      await inventoryItem.save();
      
      updatedItems.push({
        id: inventoryItem._id,
        name: inventoryItem.name,
        quantitySold: item.quantity,
        remainingStock: inventoryItem.stock,
        status: inventoryItem.status
      });

      // Prepare sale item
      saleItems.push({
        itemId: inventoryItem._id,
        name: inventoryItem.name,
        sku: inventoryItem.sku,
        quantity: item.quantity,
        price: inventoryItem.price
      });
    }

    // Create sales record
    const sale = new Sales({
      items: saleItems,
      subtotal,
      discount: discount || 0,
      total,
      cashAmount,
      change,
      customerName: customerName || '',
      userId
    });

    await sale.save();

    // Update cash drawer with the sale amount
    const currentDrawer = await CashDrawer.findOne({ userId }).sort({ date: -1 });
    let previousBalance = 0;
    
    if (currentDrawer) {
      previousBalance = currentDrawer.balance;
    }

    // Create a new cash drawer entry for this sale
    const newBalance = previousBalance + (cashAmount - change);
    await CashDrawer.create({
      userId,
      previousBalance,
      amount: cashAmount - change,
      balance: newBalance,
      operation: 'sale',
      reference: sale._id,
      notes: `Sale completed for ${customerName || 'customer'}`
    });

    // Return the sale confirmation and updated inventory
    res.status(200).json({
      message: 'Sale completed successfully',
      saleDetails: {
        id: sale._id,
        items,
        total,
        discount,
        cashAmount,
        change,
        customerName,
        date: sale.date,
        userId
      },
      inventoryUpdates: updatedItems,
      cashDrawer: {
        previousBalance,
        currentBalance: newBalance,
        saleAmount: cashAmount - change
      }
    });
  } catch (error) {
    console.error('Error completing sale:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/sales
 * @desc    Get all sales with optional filtering
 * @access  Private
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    // Extract query parameters
    const { startDate, endDate, search } = req.query;
    
    // Build query filter
    const filter = { userId: req.user.id };
    
    // Add date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    // Add search filter
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { '_id': { $regex: search, $options: 'i' } }
      ];
    }
    
    const sales = await Sales.find(filter).sort({ date: -1 });
    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/sales/history
 * @desc    Get sales history
 * @access  Private
 */
router.get('/history', verifyToken, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const sales = await Sales.find({ userId: req.user.id })
      .sort({ date: -1 })
      .limit(parseInt(limit));
    
    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales history:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/sales/:id
 * @desc    Get sale by ID
 * @access  Private
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const sale = await Sales.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    
    res.json(sale);
  } catch (error) {
    console.error('Error fetching sale details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 
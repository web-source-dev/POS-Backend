const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const Sales = require('../models/Sales');
const CashDrawer = require('../models/CashDrawer');
const { verifyToken } = require('../middleware/auth');





// Get all inventory items (with optional filters)
router.get('/inventory', verifyToken, async (req, res) => {
  try {
    const { category, search, status, supplier, subcategory, subcategory2, brand, vehicleName } = req.query;
    const userId = req.user.id;
    
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
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
    
    // Get total count for pagination metadata
    const totalItems = await Inventory.countDocuments(query);
    
    // Get paginated results
    const items = await Inventory.find(query)
      .populate('supplier', 'name contact email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Return with pagination metadata
    res.json({
      items,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


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

    // Get next receipt number - updated to use userId for user-specific receipt numbering
    const { receiptNumber, receiptNumberValue } = await Sales.getNextReceiptNumber(userId);

    // Create sales record
    const sale = new Sales({
      receiptNumber,
      receiptNumberValue,
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

    // Format sale items to match the expected structure in the frontend
    const formattedItems = saleItems.map(item => ({
      id: item.itemId.toString(),
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      sku: item.sku || ''
    }));

    // Return the sale confirmation and updated inventory
    res.status(200).json({
      message: 'Sale completed successfully',
      saleDetails: {
        id: sale._id,
        receiptNumber: sale.receiptNumber,
        items: formattedItems,
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
 * @route   PATCH /api/sales/:id/printed
 * @desc    Mark a sale as printed
 * @access  Private
 */
router.patch('/:id/printed', verifyToken, async (req, res) => {
  try {
    const sale = await Sales.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    
    sale.printed = true;
    await sale.save();
    
    res.json({ message: 'Sale marked as printed', sale });
  } catch (error) {
    console.error('Error updating sale print status:', error);
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
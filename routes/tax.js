const express = require('express');
const router = express.Router();
const Tax = require('../models/Tax');
const TaxSettings = require('../models/TaxSettings');
const User = require('../models/User');
const Sales = require('../models/Sales');
const Expense = require('../models/Expense');
const CashDrawer = require('../models/CashDrawer');
const { verifyToken, isAdmin } = require('../middleware/auth');
const mongoose = require('mongoose');

/**
 * @route   GET /api/tax/settings
 * @desc    Get tax settings for the user
 * @access  Private
 */
router.get('/settings', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find tax settings for the user or create default ones
    let settings = await TaxSettings.findOne({ userId });
    
    if (!settings) {
      // Create default settings
      settings = new TaxSettings({ userId });
      await settings.save();
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching tax settings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/tax/settings
 * @desc    Update tax settings
 * @access  Private
 */
router.put('/settings', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find tax settings for the user or create default ones
    let settings = await TaxSettings.findOne({ userId });
    
    if (!settings) {
      settings = new TaxSettings({ userId, ...req.body });
    } else {
      // Update with new settings
      const updateFields = req.body;
      Object.keys(updateFields).forEach(key => {
        settings[key] = updateFields[key];
      });
    }
    
    await settings.save();
    res.json(settings);
  } catch (error) {
    console.error('Error updating tax settings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/tax/records
 * @desc    Get tax records
 * @access  Private
 */
router.get('/records', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, type, status } = req.query;
    
    // Build query filter
    const filter = { userId };
    
    // Add date range filter
    if (startDate || endDate) {
      filter['taxPeriod.startDate'] = {};
      filter['taxPeriod.endDate'] = {};
      
      if (startDate) {
        filter['taxPeriod.startDate'].$gte = new Date(startDate);
      }
      
      if (endDate) {
        filter['taxPeriod.endDate'].$lte = new Date(endDate);
      }
    }
    
    // Add type filter
    if (type) {
      filter.type = type;
    }
    
    // Add status filter
    if (status) {
      filter.paymentStatus = status;
    }
    
    const taxRecords = await Tax.find(filter).sort({ 'taxPeriod.endDate': -1 });
    res.json(taxRecords);
  } catch (error) {
    console.error('Error fetching tax records:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/tax/records
 * @desc    Add a new tax record
 * @access  Private
 */
router.post('/records', verifyToken, async (req, res) => {
  try {
    const {
      type,
      taxableAmount,
      taxRate,
      taxAmount,
      description,
      paymentStatus,
      paidAmount,
      paymentDate,
      paymentMethod,
      taxPeriod,
      reference,
      isManualEntry,
      isFinalAssessment
    } = req.body;
    
    const userId = req.user.id;
    
    // Generate a unique taxId
    const taxId = 'TAX-' + new mongoose.Types.ObjectId().toString().substr(-8).toUpperCase();
    
    // Validate required fields
    if (!type || !taxableAmount || !taxRate || !taxAmount || !taxPeriod) {
      return res.status(400).json({
        message: 'Missing required fields'
      });
    }
    
    // Create tax record
    const tax = new Tax({
      taxId,
      userId,
      type,
      taxableAmount,
      taxRate,
      taxAmount,
      description: description || '',
      paymentStatus: paymentStatus || 'Pending',
      paidAmount: paidAmount || 0,
      paymentDate: paymentDate || null,
      paymentMethod: paymentMethod || 'Cash',
      taxPeriod: {
        startDate: new Date(taxPeriod.startDate),
        endDate: new Date(taxPeriod.endDate)
      },
      reference: reference || '',
      isManualEntry: isManualEntry || false,
      isFinalAssessment: isFinalAssessment || false
    });
    
    await tax.save();
    res.status(201).json(tax);
  } catch (error) {
    console.error('Error adding tax record:', error);
    
    // Handle duplicate key errors more gracefully
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'An error occurred with the tax ID. Please try again.',
        error: 'Duplicate key error'
      });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/tax/records/:id
 * @desc    Update a tax record
 * @access  Private
 */
router.put('/records/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const taxId = req.params.id;
    
    const tax = await Tax.findOne({
      _id: taxId,
      userId
    });
    
    if (!tax) {
      return res.status(404).json({ message: 'Tax record not found' });
    }
    
    // Update tax record fields
    const updateFields = req.body;
    Object.keys(updateFields).forEach(key => {
      // Special handling for taxPeriod which is an object
      if (key === 'taxPeriod') {
        if (updateFields.taxPeriod.startDate) {
          tax.taxPeriod.startDate = new Date(updateFields.taxPeriod.startDate);
        }
        if (updateFields.taxPeriod.endDate) {
          tax.taxPeriod.endDate = new Date(updateFields.taxPeriod.endDate);
        }
      } else {
        tax[key] = updateFields[key];
      }
    });
    
    await tax.save();
    res.json(tax);
  } catch (error) {
    console.error('Error updating tax record:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   DELETE /api/tax/records/:id
 * @desc    Delete a tax record
 * @access  Private
 */
router.delete('/records/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const taxId = req.params.id;
    
    const tax = await Tax.findOneAndDelete({
      _id: taxId,
      userId
    });
    
    if (!tax) {
      return res.status(404).json({ message: 'Tax record not found' });
    }
    
    res.json({ message: 'Tax record deleted successfully' });
  } catch (error) {
    console.error('Error deleting tax record:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/tax/calculate/income
 * @desc    Calculate income tax based on income amount
 * @access  Private
 */
router.get('/calculate/income', verifyToken, async (req, res) => {
  try {
    // Log incoming request to help with debugging
    console.log('Income tax calculation request:', req.query);
    const { annualIncome } = req.query;
    
    // Very strict validation for annualIncome
    if (!annualIncome) {
      return res.status(400).json({ message: 'Annual income parameter is missing' });
    }
    
    // Parse the income value
    const parsedIncome = parseFloat(annualIncome);
    if (isNaN(parsedIncome) || parsedIncome <= 0) {
      return res.status(400).json({ message: 'Valid positive annual income is required' });
    }
    
    // Get user's tax settings
    const userId = req.user.id;
    const settings = await TaxSettings.findOne({ userId });
    
    let taxAmount = 0;
    
    // Use custom tax slabs if available and enabled, otherwise use default
    if (settings && !settings.useDefaultTaxSlabs && settings.customTaxSlabs.length > 0) {
      // Sort slabs by min income
      const slabs = [...settings.customTaxSlabs].sort((a, b) => a.minIncome - b.minIncome);
      
      // Find the applicable slab
      const applicableSlab = slabs.find(slab => 
        parsedIncome >= slab.minIncome && 
        (slab.maxIncome === undefined || parsedIncome <= slab.maxIncome)
      );
      
      if (applicableSlab) {
        taxAmount = applicableSlab.fixedAmount + 
          (applicableSlab.rate / 100) * (parsedIncome - applicableSlab.minIncome);
      }
    } else {
      // Use default calculation
      taxAmount = Tax.calculateIncomeTax(parsedIncome);
    }
    
    const result = {
      annualIncome: parsedIncome,
      taxAmount,
      effectiveRate: (parsedIncome > 0) ? (taxAmount / parsedIncome) * 100 : 0
    };
    
    // Log result for debugging
    console.log('Income tax calculation result:', result);
    
    res.json(result);
  } catch (error) {
    console.error('Error calculating income tax:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/tax/calculate/zakat
 * @desc    Calculate Zakat based on assets
 * @access  Private
 */
router.get('/calculate/zakat', verifyToken, async (req, res) => {
  try {
    // Log incoming request to help with debugging
    console.log('Zakat calculation request:', req.query);
    const { netAssets } = req.query;
    
    // Very strict validation for netAssets
    if (!netAssets) {
      return res.status(400).json({ message: 'Net assets parameter is missing' });
    }
    
    // Parse the assets value
    const parsedAssets = parseFloat(netAssets);
    if (isNaN(parsedAssets) || parsedAssets <= 0) {
      return res.status(400).json({ message: 'Valid positive net assets value is required' });
    }
    
    // Get user's tax settings
    const userId = req.user.id;
    const settings = await TaxSettings.findOne({ userId });
    
    // Use custom rate if available, otherwise use default
    const zakatRate = (settings && settings.zakatRate) ? settings.zakatRate / 100 : 0.025;
    
    const zakatAmount = parsedAssets * zakatRate;
    
    const result = {
      netAssets: parsedAssets,
      zakatRate: zakatRate * 100, // Convert back to percentage for display
      zakatAmount
    };
    
    // Log result for debugging
    console.log('Zakat calculation result:', result);
    
    res.json(result);
  } catch (error) {
    console.error('Error calculating Zakat:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/tax/summary
 * @desc    Get tax summary for dashboard
 * @access  Private
 */
router.get('/summary', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'year' } = req.query;
    
    // Define date ranges
    const now = new Date();
    let startDate;
    
    switch(period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
      default:
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }
    
    // Get tax records for the period
    const taxRecords = await Tax.find({
      userId,
      'taxPeriod.endDate': { $gte: startDate, $lte: now }
    });
    
    // Calculate summary
    const totalTaxAmount = taxRecords.reduce((sum, record) => sum + record.taxAmount, 0);
    const totalPaidAmount = taxRecords.reduce((sum, record) => sum + record.paidAmount, 0);
    const pendingAmount = totalTaxAmount - totalPaidAmount;
    
    // Count by tax type
    const countByType = {};
    taxRecords.forEach(record => {
      countByType[record.type] = (countByType[record.type] || 0) + 1;
    });
    
    // Count by status
    const countByStatus = {};
    taxRecords.forEach(record => {
      countByStatus[record.paymentStatus] = (countByStatus[record.paymentStatus] || 0) + 1;
    });
    
    // Get income data for estimating taxes
    const salesTotal = await Sales.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), date: { $gte: startDate, $lte: now } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    const expensesTotal = await Expense.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), date: { $gte: startDate, $lte: now } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalIncome = (salesTotal[0]?.total || 0) - (expensesTotal[0]?.total || 0);
    
    // Estimate taxes
    const estimatedIncomeTax = Tax.calculateIncomeTax(totalIncome);
    
    res.json({
      summary: {
        period,
        totalTaxAmount,
        totalPaidAmount,
        pendingAmount,
        totalRecords: taxRecords.length,
        countByType,
        countByStatus,
        estimatedIncome: totalIncome,
        estimatedIncomeTax
      },
      recentRecords: taxRecords.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5)
    });
  } catch (error) {
    console.error('Error fetching tax summary:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/tax/payment
 * @desc    Record a tax payment and update cash drawer
 * @access  Private
 */
router.post('/payment', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { taxId, amount, paymentMethod, notes } = req.body;
    
    if (!taxId || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid tax ID and payment amount are required' });
    }
    
    // Find the tax record
    const tax = await Tax.findOne({ _id: taxId, userId });
    
    if (!tax) {
      return res.status(404).json({ message: 'Tax record not found' });
    }
    
    // Validate payment amount
    const remainingAmount = tax.taxAmount - tax.paidAmount;
    if (amount > remainingAmount) {
      return res.status(400).json({ 
        message: `Payment amount exceeds the remaining balance of ${remainingAmount}` 
      });
    }
    
    // Record in cash drawer as an expense (check first before modifying tax record)
    const lastCashDrawer = await CashDrawer.findOne(
      { userId: new mongoose.Types.ObjectId(userId) },
      {},
      { sort: { date: -1 } }
    );
    
    if (!lastCashDrawer) {
      return res.status(400).json({ 
        message: 'No cash drawer found. Please initialize a cash drawer first.' 
      });
    }
    
    const balance = lastCashDrawer.balance - amount;
    
    // Update tax record
    const newPaidAmount = tax.paidAmount + amount;
    let newPaymentStatus = tax.paymentStatus;
    
    if (newPaidAmount >= tax.taxAmount) {
      newPaymentStatus = 'Paid';
    } else if (newPaidAmount > 0) {
      newPaymentStatus = 'Partially Paid';
    }
    
    tax.paidAmount = newPaidAmount;
    tax.paymentStatus = newPaymentStatus;
    tax.paymentDate = new Date();
    tax.paymentMethod = paymentMethod;
    
    // Save the tax record first
    await tax.save();
    
    // Create and save the cash drawer entry
    const cashDrawerEntry = new CashDrawer({
      userId: new mongoose.Types.ObjectId(userId),
      date: new Date(),
      previousBalance: lastCashDrawer.balance,
      amount: -amount, // Negative amount because it's an expense
      balance,
      operation: 'expense',
      notes: notes || `Tax payment for ${tax.taxId}: ${tax.type}`,
    });
    
    await cashDrawerEntry.save();
    
    res.json({
      message: 'Tax payment recorded successfully',
      tax,
      cashDrawerBalance: balance
    });
  } catch (error) {
    console.error('Error recording tax payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 
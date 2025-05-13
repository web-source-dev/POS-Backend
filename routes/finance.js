const express = require('express');
const router = express.Router();
const CashDrawer = require('../models/CashDrawer');
const { verifyToken } = require('../middleware/auth');
const mongoose = require('mongoose');

// Get cash drawer history for a user
router.get('/cash-drawer/history', verifyToken, async (req, res) => {
  try {
    const cashDrawerHistory = await CashDrawer.find({ userId: req.user.id })
      .sort({ date: -1 })
      .limit(50);
    
    res.json(cashDrawerHistory);
  } catch (error) {
    console.error('Error fetching cash drawer history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current cash drawer balance
router.get('/cash-drawer/balance', verifyToken, async (req, res) => {
  try {
    const latestEntry = await CashDrawer.findOne({ userId: req.user.id })
      .sort({ date: -1 });
    
    const balance = latestEntry ? latestEntry.balance : 0;
    
    res.json({ balance });
  } catch (error) {
    console.error('Error fetching cash drawer balance:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add cash to drawer
router.post('/cash-drawer/add', verifyToken, async (req, res) => {
  try {
    const { amount, notes } = req.body;
    
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }
    
    // Get the current balance
    const latestEntry = await CashDrawer.findOne({ userId: req.user.id })
      .sort({ date: -1 });
    
    const previousBalance = latestEntry ? latestEntry.balance : 0;
    
    // Create new cash drawer transaction
    const cashDrawerEntry = new CashDrawer({
      userId: req.user.id,
      previousBalance,
      amount: parseFloat(amount),
      balance: previousBalance + parseFloat(amount),
      operation: 'add',
      notes
    });
    
    await cashDrawerEntry.save();
    
    res.json(cashDrawerEntry);
  } catch (error) {
    console.error('Error adding cash:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove cash from drawer
router.post('/cash-drawer/remove', verifyToken, async (req, res) => {
  try {
    const { amount, notes } = req.body;
    
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }
    
    // Get the current balance
    const latestEntry = await CashDrawer.findOne({ userId: req.user.id })
      .sort({ date: -1 });
    
    const previousBalance = latestEntry ? latestEntry.balance : 0;
    
    // Check if there's enough cash in the drawer
    if (previousBalance < parseFloat(amount)) {
      return res.status(400).json({ message: 'Insufficient funds in cash drawer' });
    }
    
    // Create new cash drawer transaction
    const cashDrawerEntry = new CashDrawer({
      userId: req.user.id,
      previousBalance,
      amount: parseFloat(amount),
      balance: previousBalance - parseFloat(amount),
      operation: 'remove',
      notes
    });
    
    await cashDrawerEntry.save();
    
    res.json(cashDrawerEntry);
  } catch (error) {
    console.error('Error removing cash:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get cash drawer summary by date range
router.get('/cash-drawer/summary', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Set up date filters
    const dateFilter = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
      // Set time to end of day
      dateFilter.$lte.setHours(23, 59, 59, 999);
    }
    
    // Add date filter if provided
    const query = { userId: req.user.id };
    if (Object.keys(dateFilter).length > 0) {
      query.date = dateFilter;
    }
    
    // Aggregate cash drawer operations
    const summary = await CashDrawer.aggregate([
      { $match: query },
      { $group: {
        _id: '$operation',
        count: { $sum: 1 },
        total: { $sum: '$amount' }
      }},
      { $sort: { _id: 1 } }
    ]);
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching cash drawer summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

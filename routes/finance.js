const express = require('express');
const router = express.Router();
const CashDrawer = require('../models/CashDrawer');
const Expense = require('../models/Expense');
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

// Get a single cash drawer transaction by ID
router.get('/cash-drawer/transaction/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid transaction ID' });
    }

    // Find transaction by ID and ensure it belongs to the current user
    let transaction = await CashDrawer.findOne({ 
      _id: id, 
      userId: req.user.id 
    });
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    // Include additional details for sale transactions
    if (transaction.operation === 'sale' && transaction.reference) {
      try {
        // Fetch the related sale document
        const Sales = require('../models/Sales');
        const saleDetails = await Sales.findById(transaction.reference);
        
        if (saleDetails) {
          // Include sale details in the response
          const saleData = saleDetails.toObject();
          transaction = transaction.toObject();
          transaction.saleDetails = saleData;
        }
      } catch (saleError) {
        console.error('Error fetching sale details:', saleError);
        // Continue even if sale details can't be fetched
      }
    }
    
    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction details:', error);
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

// EXPENSE MANAGEMENT ROUTES

// Get all expenses
router.get('/expenses', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate, category, status } = req.query;
    
    // Build query filter
    const filter = { userId: req.user.id };
    
    // Add date range filter if provided
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        filter.date.$lte = endDateObj;
      }
    }
    
    // Add category filter if provided
    if (category) filter.category = category;
    
    // Add status filter if provided
    if (status) filter.status = status;
    
    const expenses = await Expense.find(filter)
      .sort({ date: -1 })
      .limit(100);
    
    res.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single expense by ID
router.get('/expenses/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid expense ID' });
    }

    const expense = await Expense.findOne({ 
      _id: id, 
      userId: req.user.id 
    });
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    res.json(expense);
  } catch (error) {
    console.error('Error fetching expense details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new expense
router.post('/expenses', verifyToken, async (req, res) => {
  try {
    const { category, description, amount, paymentMethod, status, date } = req.body;
    
    if (!category || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Valid category and amount are required' });
    }
    
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Create the expense record
      const expense = new Expense({
        category,
        description,
        amount: parseFloat(amount),
        paymentMethod: paymentMethod || 'Cash',
        status: status || 'Paid',
        date: date ? new Date(date) : new Date(),
        userId: req.user.id
      });
      
      await expense.save({ session });
      
      // If expense is paid with cash, create a cash drawer transaction
      if (paymentMethod === 'Cash' && status === 'Paid') {
        // Get current balance
        const latestEntry = await CashDrawer.findOne({ userId: req.user.id })
          .sort({ date: -1 });
        
        const previousBalance = latestEntry ? latestEntry.balance : 0;
        
        // Check if there's enough cash
        if (previousBalance < parseFloat(amount)) {
          throw new Error('Insufficient funds in cash drawer');
        }
        
        // Create cash drawer transaction
        const cashDrawerEntry = new CashDrawer({
          userId: req.user.id,
          previousBalance,
          amount: parseFloat(amount),
          balance: previousBalance - parseFloat(amount),
          operation: 'expense',
          reference: expense._id,
          notes: `Expense: ${category} - ${description || ''}`
        });
        
        await cashDrawerEntry.save({ session });
      }
      
      await session.commitTransaction();
      
      res.status(201).json(expense);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(400).json({ message: error.message || 'Failed to create expense' });
  }
});

// Update an expense
router.put('/expenses/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { category, description, amount, paymentMethod, status, date } = req.body;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid expense ID' });
    }
    
    // Find the expense and ensure it belongs to the user
    const expense = await Expense.findOne({ _id: id, userId: req.user.id });
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    // Update the expense fields
    if (category) expense.category = category;
    if (description !== undefined) expense.description = description;
    if (amount) expense.amount = parseFloat(amount);
    if (paymentMethod) expense.paymentMethod = paymentMethod;
    if (status) expense.status = status;
    if (date) expense.date = new Date(date);
    
    await expense.save();
    
    res.json(expense);
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(400).json({ message: error.message || 'Failed to update expense' });
  }
});

// Delete an expense
router.delete('/expenses/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid expense ID' });
    }
    
    // Find the expense and ensure it belongs to the user
    const expense = await Expense.findOne({ _id: id, userId: req.user.id });
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    // Check if there are related cash drawer entries
    const relatedEntry = await CashDrawer.findOne({ 
      reference: expense._id,
      operation: 'expense'
    });
    
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Delete expense
      await Expense.deleteOne({ _id: id }, { session });
      
      // If there was a cash entry for this expense, reverse it
      if (relatedEntry) {
        // Get current balance
        const latestEntry = await CashDrawer.findOne({ userId: req.user.id })
          .sort({ date: -1 });
        
        const previousBalance = latestEntry ? latestEntry.balance : 0;
        
        // Create reversing cash drawer transaction
        const cashDrawerEntry = new CashDrawer({
          userId: req.user.id,
          previousBalance,
          amount: expense.amount,
          balance: previousBalance + expense.amount,
          operation: 'add',
          notes: `Reversed expense: ${expense.category} - ${expense.description || ''}`
        });
        
        await cashDrawerEntry.save({ session });
      }
      
      await session.commitTransaction();
      
      res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(400).json({ message: error.message || 'Failed to delete expense' });
  }
});

// Get expense categories (unique list from existing expenses)
router.get('/expense-categories', verifyToken, async (req, res) => {
  try {
    const categories = await Expense.distinct('category', { userId: req.user.id });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

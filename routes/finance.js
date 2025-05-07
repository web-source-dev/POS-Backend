const express = require('express');
const router = express.Router();
const Sales = require('../models/Sales');
const Expense = require('../models/Expense');
const CashDrawer = require('../models/CashDrawer');
const { verifyToken } = require('../middleware/auth');
const mongoose = require('mongoose');

/**
 * @route   GET /api/finance/summary
 * @desc    Get financial summary
 * @access  Private
 */
router.get('/summary', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'today' } = req.query;
    
    let startDate, endDate = new Date();
    
    // Set date range based on period
    switch (period) {
      case 'today':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
    }
    
    // Get sales data for the period
    const sales = await Sales.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    });
    
    // Get expenses data for the period
    const expenses = await Expense.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    });
    
    // Calculate financial metrics
    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const netCashFlow = totalSales - totalExpenses;
    
    // Get today's transaction counts
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todaySales = sales.filter(sale => sale.date >= todayStart);
    const todayExpenses = expenses.filter(expense => expense.date >= todayStart);
    
    const todaySalesTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0);
    const todayExpensesTotal = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const todayNetCashFlow = todaySalesTotal - todayExpensesTotal;
    
    // Get cash balance
    const cashDrawerData = await CashDrawer.findOne({ userId }).sort({ date: -1 });
    const cashBalance = cashDrawerData ? cashDrawerData.balance : 0;
    
    res.json({
      summary: {
        cashBalance,
        lastUpdated: cashDrawerData ? cashDrawerData.date : new Date(),
        todaySales: {
          amount: todaySalesTotal,
          count: todaySales.length
        },
        todayExpenses: {
          amount: todayExpensesTotal,
          count: todayExpenses.length
        },
        todayNetCashFlow,
        periodSales: totalSales,
        periodExpenses: totalExpenses,
        periodNetCashFlow: netCashFlow
      }
    });
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/finance/expenses
 * @desc    Get all expenses
 * @access  Private
 */
router.get('/expenses', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, category } = req.query;
    
    // Build query filter
    const filter = { userId };
    
    // Add date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    // Add category filter
    if (category) {
      filter.category = category;
    }
    
    const expenses = await Expense.find(filter).sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/finance/expenses
 * @desc    Add a new expense
 * @access  Private
 */
router.post('/expenses', verifyToken, async (req, res) => {
  try {
    const { category, description, amount, paymentMethod, date } = req.body;
    const userId = req.user.id;
    
    // Validate request
    if (!category || !amount || amount <= 0) {
      return res.status(400).json({ 
        message: 'Category and a positive amount are required' 
      });
    }
    
    // Generate a unique expenseId
    const expenseId = 'EXP-' + new mongoose.Types.ObjectId().toString().substr(-8).toUpperCase();
    
    // Create expense record
    const expense = new Expense({
      expenseId,  // Set the expense ID explicitly
      category,
      description: description || '',
      amount,
      paymentMethod: paymentMethod || 'Cash',
      date: date ? new Date(date) : new Date(),
      userId,
      status: 'Paid'
    });
    
    await expense.save();
    
    // Update cash drawer
    if (paymentMethod === 'Cash' || !paymentMethod) {
      const cashDrawer = await CashDrawer.findOne({ userId }).sort({ date: -1 });
      
      if (cashDrawer) {
        const newBalance = cashDrawer.balance - amount;
        
        const drawerOperation = new CashDrawer({
          userId,
          date: new Date(), // Ensure a unique timestamp
          previousBalance: cashDrawer.balance,
          amount: -amount,
          balance: newBalance,
          operation: 'expense',
          reference: expense._id,
          notes: description || 'Expense payment'
        });
        
        await drawerOperation.save();
      } else {
        // If no cash drawer exists yet, create one with initial negative balance for this expense
        const drawerOperation = new CashDrawer({
          userId,
          date: new Date(),
          previousBalance: 0,
          amount: -amount,
          balance: -amount,
          operation: 'expense',
          reference: expense._id,
          notes: description || 'Expense payment'
        });
        
        await drawerOperation.save();
      }
    }
    
    res.status(201).json(expense);
  } catch (error) {
    console.error('Error adding expense:', error);
    
    // Handle duplicate key errors more gracefully
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'An error occurred with the expense ID. Please try again.', 
        error: 'Duplicate key error' 
      });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/finance/cash-drawer
 * @desc    Get cash drawer data
 * @access  Private
 */
router.get('/cash-drawer', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get current cash drawer status
    const currentDrawer = await CashDrawer.findOne({ userId }).sort({ date: -1 });
    
    let openingBalance = 0;
    let currentBalance = 0;
    
    if (currentDrawer) {
      currentBalance = currentDrawer.balance;
      
      // Get opening balance for the day
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const startOfDayDrawer = await CashDrawer.findOne({
        userId,
        date: { $lte: todayStart }
      }).sort({ date: -1 });
      
      if (startOfDayDrawer) {
        openingBalance = startOfDayDrawer.balance;
      }
    }
    
    // Get today's cash sales
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todaySales = await Sales.find({
      userId,
      date: { $gte: todayStart }
    });
    
    const cashSales = todaySales.reduce((sum, sale) => sum + sale.total, 0);
    
    // Get today's cash expenses
    const todayExpenses = await Expense.find({
      userId,
      date: { $gte: todayStart },
      paymentMethod: 'Cash'
    });
    
    const cashExpenses = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Get recent cash operations
    const recentOperations = await CashDrawer.find({ userId })
      .sort({ date: -1 })
      .limit(10);
    
    res.json({
      currentBalance,
      openingBalance,
      cashSales,
      cashExpenses,
      expectedBalance: openingBalance + cashSales - cashExpenses,
      recentOperations
    });
  } catch (error) {
    console.error('Error fetching cash drawer data:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/finance/cash-drawer/operation
 * @desc    Perform a cash drawer operation
 * @access  Private
 */
router.post('/cash-drawer/operation', verifyToken, async (req, res) => {
  try {
    const { type, amount, reason } = req.body;
    const userId = req.user.id;
    
    // Validate request
    if (!type) {
      return res.status(400).json({ 
        message: 'Operation type is required' 
      });
    }
    
    // Get current cash drawer
    const currentDrawer = await CashDrawer.findOne({ userId }).sort({ date: -1 });
    let previousBalance = 0;
    
    if (currentDrawer) {
      previousBalance = currentDrawer.balance;
    } else {
      // If no cash drawer exists, initialize one with zero balance
      const newDrawer = new CashDrawer({
        userId,
        previousBalance: 0,
        amount: 0,
        balance: 0,
        operation: 'initialization',
        notes: 'Initial cash drawer setup'
      });
      
      await newDrawer.save();
      // Now we have a drawer with zero balance
    }
    
    // Calculate new balance based on operation type
    let newBalance = previousBalance;
    let operationAmount = amount ? parseFloat(amount) : 0;
    
    switch (type) {
      case 'add':
        // Validate amount for add operation
        if (!amount || isNaN(operationAmount) || operationAmount <= 0) {
          return res.status(400).json({ 
            message: 'A positive amount is required for adding cash' 
          });
        }
        newBalance += operationAmount;
        break;
        
      case 'remove':
        // Validate amount for remove operation
        if (!amount || isNaN(operationAmount) || operationAmount <= 0) {
          return res.status(400).json({ 
            message: 'A positive amount is required for removing cash' 
          });
        }
        // Check if there's enough cash to remove
        if (operationAmount > previousBalance) {
          return res.status(400).json({ 
            message: `Cannot remove $${operationAmount}. Current balance is only $${previousBalance}.` 
          });
        }
        newBalance -= operationAmount;
        operationAmount = -operationAmount; // Make negative for records
        break;
        
      case 'close':
        // Closing the drawer doesn't change the balance, it just records the action
        operationAmount = 0;
        break;
        
      default:
        return res.status(400).json({ message: 'Invalid operation type' });
    }
    
    // Create cash drawer operation with a unique timestamp to avoid duplicate key issues
    const operation = new CashDrawer({
      userId,
      date: new Date(), // Ensure a unique timestamp
      previousBalance,
      amount: operationAmount,
      balance: newBalance,
      operation: type,
      notes: reason || `Cash ${type} operation`
    });
    
    await operation.save();
    
    // Return the updated cash drawer status
    const updatedDrawer = {
      currentBalance: newBalance,
      lastOperation: {
        type,
        amount: Math.abs(operationAmount),
        timestamp: new Date(),
        notes: reason || `Cash ${type} operation`
      }
    };
    
    res.status(200).json(updatedDrawer);
  } catch (error) {
    console.error('Error performing cash drawer operation:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'An error occurred with the cash drawer operation. Please try again.',
        error: 'Duplicate key error'
      });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 
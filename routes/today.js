const express = require('express');
const router = express.Router();
const {verifyToken} = require('../middleware/auth');
const Sales = require('../models/Sales');
const Expense = require('../models/Expense');
const Inventory = require('../models/Inventory');
const CashDrawer = require('../models/CashDrawer');

// Get all today's data (sales, expenses, cash drawer operations)
router.get('/', verifyToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const userId = req.user.id;

    // Get all sales from today
    const sales = await Sales.find({
      userId,
      date: { $gte: today, $lt: tomorrow }
    }).sort({ date: -1 });

    // Get all expenses from today
    const expenses = await Expense.find({
      userId,
      date: { $gte: today, $lt: tomorrow }
    }).sort({ date: -1 });

    // Get all cash drawer operations from today
    const cashDrawerOperations = await CashDrawer.find({
      userId,
      date: { $gte: today, $lt: tomorrow }
    }).sort({ date: -1 });

    // Calculate total metrics
    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const profitToday = totalSales - totalExpenses;
    
    // Count total items sold
    const itemsSold = sales.reduce((sum, sale) => {
      return sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);

    // Get most popular items
    const itemMap = new Map();
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const key = item.itemId.toString();
        if (itemMap.has(key)) {
          itemMap.set(key, {
            name: item.name,
            quantity: itemMap.get(key).quantity + item.quantity,
            revenue: itemMap.get(key).revenue + (item.price * item.quantity)
          });
        } else {
          itemMap.set(key, {
            name: item.name,
            quantity: item.quantity,
            revenue: item.price * item.quantity
          });
        }
      });
    });

    const popularItems = Array.from(itemMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Calculate hourly sales
    const hourlySales = Array(24).fill(0);
    sales.forEach(sale => {
      const hour = new Date(sale.date).getHours();
      hourlySales[hour] += sale.total;
    });

    // Cash drawer summary
    const cashDrawerSummary = {
      openingBalance: 0,
      closingBalance: 0,
      totalAdded: 0,
      totalRemoved: 0
    };

    cashDrawerOperations.forEach(op => {
      if (op.operation === 'initialization') {
        cashDrawerSummary.openingBalance = op.amount;
      } else if (op.operation === 'close') {
        cashDrawerSummary.closingBalance = op.balance;
      } else if (op.operation === 'add') {
        cashDrawerSummary.totalAdded += op.amount;
      } else if (op.operation === 'remove' || op.operation === 'expense') {
        cashDrawerSummary.totalRemoved += op.amount;
      }
    });

    // Ensure we have the latest closing balance
    const latestCashDrawer = await CashDrawer.findOne({ userId }).sort({ date: -1 });
    if (latestCashDrawer) {
      cashDrawerSummary.currentBalance = latestCashDrawer.balance;
    }

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalSales,
          totalExpenses,
          profitToday,
          itemsSold,
          cashDrawerSummary
        },
        hourlySales,
        popularItems,
        sales,
        expenses,
        cashDrawerOperations
      }
    });
  } catch (error) {
    console.error('Error fetching today data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching today data',
      error: error.message
    });
  }
});

// Export data as CSV
router.get('/export', verifyToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const userId = req.user.id;

    // Get all sales from today
    const sales = await Sales.find({
      userId,
      date: { $gte: today, $lt: tomorrow }
    }).sort({ date: -1 });

    // Get all expenses from today
    const expenses = await Expense.find({
      userId,
      date: { $gte: today, $lt: tomorrow }
    }).sort({ date: -1 });

    // Format for CSV
    let csvContent = 'Type,Time,Reference,Amount,Details\n';
    
    // Add sales
    sales.forEach(sale => {
      const time = new Date(sale.date).toLocaleTimeString();
      const details = `Receipt #${sale.receiptNumber}, Items: ${sale.items.length}, Customer: ${sale.customerName || 'N/A'}`;
      csvContent += `Sale,${time},${sale._id},${sale.total},${details}\n`;
      
      // Add sale items as separate entries
      sale.items.forEach(item => {
        csvContent += `SaleItem,${time},${sale._id},${item.price * item.quantity},${item.name} x ${item.quantity}\n`;
      });
    });
    
    // Add expenses
    expenses.forEach(expense => {
      const time = new Date(expense.date).toLocaleTimeString();
      csvContent += `Expense,${time},${expense.expenseId},${expense.amount},${expense.category}: ${expense.description}\n`;
    });

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=today-report-${today.toISOString().split('T')[0]}.csv`);

    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error exporting today data:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting today data',
      error: error.message
    });
  }
});

module.exports = router;

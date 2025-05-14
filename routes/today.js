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

// Helper function to escape CSV values properly
const escapeCSV = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  // If value contains commas, quotes, or newlines, wrap in quotes and escape any quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

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

    // Create item sales summary
    const itemSummary = new Map();
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const key = `${item.itemId}_${item.name}`;
        if (itemSummary.has(key)) {
          const existing = itemSummary.get(key);
          existing.quantity += item.quantity;
          existing.revenue += item.price * item.quantity;
          existing.sales += 1;
        } else {
          itemSummary.set(key, {
            id: item.itemId,
            name: item.name,
            sku: item.sku || 'N/A',
            quantity: item.quantity,
            revenue: item.price * item.quantity,
            price: item.price,
            sales: 1
          });
        }
      });
    });

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
      totalRemoved: 0,
      currentBalance: 0
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

    // Get latest cash drawer balance
    const latestCashDrawer = await CashDrawer.findOne({ userId }).sort({ date: -1 });
    if (latestCashDrawer) {
      cashDrawerSummary.currentBalance = latestCashDrawer.balance;
    }

    // Calculate expense categories
    const expenseCategories = {};
    expenses.forEach(expense => {
      if (!expenseCategories[expense.category]) {
        expenseCategories[expense.category] = 0;
      }
      expenseCategories[expense.category] += expense.amount;
    });

    // Format as CSV with multiple sections
    const rows = [];
    
    // 1. SUMMARY SECTION
    rows.push(['DAILY SUMMARY REPORT', '', '', '', '']);
    rows.push(['Date', today.toISOString().split('T')[0], '', '', '']);
    rows.push(['', '', '', '', '']);
    
    rows.push(['KEY METRICS', '', '', '', '']);
    rows.push(['Total Sales', totalSales.toFixed(2), '', '', '']);
    rows.push(['Total Expenses', totalExpenses.toFixed(2), '', '', '']);
    rows.push(['Net Profit', profitToday.toFixed(2), '', '', '']);
    rows.push(['Items Sold', itemsSold, '', '', '']);
    rows.push(['Transactions', sales.length, '', '', '']);
    rows.push(['Expense Records', expenses.length, '', '', '']);
    rows.push(['', '', '', '', '']);
    
    // 2. CASH DRAWER SECTION
    rows.push(['CASH DRAWER SUMMARY', '', '', '', '']);
    rows.push(['Opening Balance', cashDrawerSummary.openingBalance.toFixed(2), '', '', '']);
    rows.push(['Total Added', cashDrawerSummary.totalAdded.toFixed(2), '', '', '']);
    rows.push(['Total Removed', cashDrawerSummary.totalRemoved.toFixed(2), '', '', '']);
    rows.push(['Current Balance', cashDrawerSummary.currentBalance.toFixed(2), '', '', '']);
    rows.push(['', '', '', '', '']);
    
    // 3. SALES BY HOUR SECTION
    rows.push(['HOURLY SALES', '', '', '', '']);
    for (let i = 0; i < 24; i++) {
      if (hourlySales[i] > 0) {
        const hourStr = i < 10 ? `0${i}:00` : `${i}:00`;
        rows.push([hourStr, hourlySales[i].toFixed(2), '', '', '']);
      }
    }
    rows.push(['', '', '', '', '']);
    
    // 4. ITEM SALES SUMMARY SECTION
    rows.push(['ITEM SALES SUMMARY', '', '', '', '']);
    rows.push(['Item Name', 'SKU', 'Quantity Sold', 'Unit Price', 'Total Revenue']);
    
    // Sort items by quantity sold (highest first)
    const sortedItems = Array.from(itemSummary.values())
      .sort((a, b) => b.quantity - a.quantity);
    
    sortedItems.forEach(item => {
      rows.push([
        item.name,
        item.sku,
        item.quantity.toString(),
        item.price.toFixed(2),
        item.revenue.toFixed(2)
      ]);
    });
    rows.push(['', '', '', '', '']);
    
    // 5. EXPENSE CATEGORIES SECTION
    rows.push(['EXPENSE BREAKDOWN', '', '', '', '']);
    rows.push(['Category', 'Amount', '', '', '']);
    
    Object.entries(expenseCategories)
      .sort((a, b) => b[1] - a[1]) // Sort by amount (highest first)
      .forEach(([category, amount]) => {
        rows.push([category, amount.toFixed(2), '', '', '']);
      });
    rows.push(['', '', '', '', '']);
    
    // 6. DETAILED TRANSACTIONS SECTION
    rows.push(['DETAILED TRANSACTIONS', '', '', '', '']);
    rows.push(['Type', 'Time', 'Reference', 'Amount ($)', 'Details']);
    
    // Add sales
    sales.forEach(sale => {
      const time = new Date(sale.date).toLocaleTimeString();
      const details = `Items: ${sale.items.length}, Customer: ${sale.customerName || 'N/A'}`;
      
      // Add sale as a row
      rows.push([
        'Sale',
        time,
        sale.receiptNumber,
        sale.total.toFixed(2),
        details
      ]);
      
      // Add sale items as separate entries
      sale.items.forEach(item => {
        const itemTotal = (item.price * item.quantity).toFixed(2);
        rows.push([
          ' - Item',
          time,
          item.sku || 'N/A',
          itemTotal,
          `${item.name} x ${item.quantity} @ $${item.price.toFixed(2)}`
        ]);
      });
    });
    
    // Add expenses
    expenses.forEach(expense => {
      const time = new Date(expense.date).toLocaleTimeString();
      rows.push([
        'Expense',
        time,
        expense.expenseId,
        expense.amount.toFixed(2),
        `${expense.category}: ${expense.description || 'N/A'}`
      ]);
    });
    
    // Add cash drawer operations
    cashDrawerOperations.forEach(op => {
      const time = new Date(op.date).toLocaleTimeString();
      rows.push([
        'Cash Op',
        time,
        op.operation,
        op.amount.toFixed(2),
        `Previous: $${op.previousBalance.toFixed(2)}, New: $${op.balance.toFixed(2)}, Notes: ${op.notes || 'N/A'}`
      ]);
    });

    // Format as CSV with proper escaping
    let csvContent = '';
    rows.forEach(row => {
      csvContent += row.map(value => escapeCSV(value)).join(',') + '\r\n';
    });

    // Add BOM for better Excel compatibility with UTF-8
    const BOM = '\uFEFF';
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=today-detailed-report-${today.toISOString().split('T')[0]}.csv`);

    // Send with BOM
    res.status(200).send(BOM + csvContent);
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

const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const Sales = require('../models/Sales');
const Inventory = require('../models/Inventory');
const CashDrawer = require('../models/CashDrawer');
const Expense = require('../models/Expense');
const Supplier = require('../models/Supplier');
const mongoose = require('mongoose');

// Helper function to parse date range
const parseDateRange = (req) => {
  const { startDate, endDate } = req.query;
  const query = {};
  
  if (startDate && endDate) {
    query.date = {
      $gte: new Date(startDate),
      $lte: new Date(`${endDate}T23:59:59.999Z`)
    };
  }
  
  return query;
};

// Helper to group data by time interval
const groupByTimeInterval = (data, interval) => {
  // Implementation depends on specific requirements
  return data;
};

// Get Sales Report
router.get('/sales', verifyToken, async (req, res) => {
  try {
    const dateQuery = parseDateRange(req);
    
    // Add user filtering
    dateQuery.userId = req.user.id;
    
    const sales = await Sales.find(dateQuery)
      .sort({ date: -1 });
    
    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalItems = sales.reduce((sum, sale) => {
      return sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);
    
    res.json({
      success: true,
      data: sales,
      summary: {
        totalSales: totalSales.toFixed(2),
        totalTransactions: sales.length,
        totalItems,
        averageTransaction: sales.length ? (totalSales / sales.length).toFixed(2) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Sales by Category
router.get('/sales/category', verifyToken, async (req, res) => {
  try {
    const dateQuery = parseDateRange(req);
    dateQuery.userId = req.user.id;
    
    const sales = await Sales.find(dateQuery);
    
    // Create a map to aggregate sales by category
    const categoryMap = {};
    let totalSales = 0;
    
    // First collect all item IDs to fetch inventory items in bulk
    const itemIds = [];
    sales.forEach(sale => {
      sale.items.forEach(item => {
        itemIds.push(item.itemId);
      });
    });
    
    // Fetch inventory items in one query
    const inventoryItems = await Inventory.find({ _id: { $in: itemIds } });
    const inventoryMap = {};
    inventoryItems.forEach(item => {
      inventoryMap[item._id.toString()] = item;
    });
    
    // Now process sales with inventory data
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const inventoryItem = inventoryMap[item.itemId.toString()];
        const category = inventoryItem ? inventoryItem.category : 'Uncategorized';
        const amount = item.price * item.quantity;
        
        if (!categoryMap[category]) {
          categoryMap[category] = 0;
        }
        
        categoryMap[category] += amount;
        totalSales += amount;
      });
    });
    
    // Convert map to array and add percentage
    const categories = Object.keys(categoryMap).map(category => ({
      category,
      sales: categoryMap[category].toFixed(2),
      percentage: (categoryMap[category] / totalSales * 100).toFixed(2)
    }));
    
    // Sort by sales amount descending
    categories.sort((a, b) => b.sales - a.sales);
    
    res.json({
      success: true,
      data: categories,
      summary: {
        totalSales: totalSales.toFixed(2),
        categoryCount: categories.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Sales Trends
router.get('/sales/trends', verifyToken, async (req, res) => {
  try {
    const dateQuery = parseDateRange(req);
    const interval = req.query.interval || 'day';
    dateQuery.userId = req.user.id;
    
    const sales = await Sales.find(dateQuery)
      .sort({ date: 1 });
    
    // Group by specified interval (day, week, month)
    const trends = groupByTimeInterval(sales, interval);
    
    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Inventory Report
router.get('/inventory', verifyToken, async (req, res) => {
  try {
    const inventory = await Inventory.find({ userId: req.user.id })
      .sort({ name: 1 });
    
    const totalItems = inventory.length;
    const totalValue = inventory.reduce((sum, item) => sum + (item.stock * item.price), 0);
    const lowStockItems = inventory.filter(item => item.status === 'Low Stock').length;
    const outOfStockItems = inventory.filter(item => item.status === 'Out of Stock').length;
    
    res.json({
      success: true,
      data: inventory,
      summary: {
        totalItems,
        totalValue: totalValue.toFixed(2),
        lowStockItems,
        outOfStockItems
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Low Stock Items
router.get('/inventory/low-stock', verifyToken, async (req, res) => {
  try {
    const lowStockItems = await Inventory.find({
      userId: req.user.id,
      $or: [{ status: 'Low Stock' }, { status: 'Out of Stock' }]
    }).sort({ stock: 1 });
    
    res.json({
      success: true,
      data: lowStockItems,
      summary: {
        lowStockCount: lowStockItems.filter(item => item.status === 'Low Stock').length,
        outOfStockCount: lowStockItems.filter(item => item.status === 'Out of Stock').length,
        totalCount: lowStockItems.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Inventory by Category
router.get('/inventory/category', verifyToken, async (req, res) => {
  try {
    const inventory = await Inventory.find({ userId: req.user.id });
    
    // Aggregate inventory by category
    const categoryMap = {};
    let totalValue = 0;
    
    inventory.forEach(item => {
      const category = item.category;
      const value = item.stock * item.price;
      
      if (!categoryMap[category]) {
        categoryMap[category] = {
          count: 0,
          value: 0
        };
      }
      
      categoryMap[category].count += 1;
      categoryMap[category].value += value;
      totalValue += value;
    });
    
    // Convert map to array and add percentage
    const categories = Object.keys(categoryMap).map(category => ({
      category,
      count: categoryMap[category].count,
      value: categoryMap[category].value.toFixed(2),
      percentage: (categoryMap[category].value / totalValue * 100).toFixed(2)
    }));
    
    // Sort by value descending
    categories.sort((a, b) => b.value - a.value);
    
    res.json({
      success: true,
      data: categories,
      summary: {
        totalValue: totalValue.toFixed(2),
        categoryCount: categories.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Financial Summary
router.get('/financial/summary', verifyToken, async (req, res) => {
  try {
    const dateQuery = parseDateRange(req);
    dateQuery.userId = req.user.id;
    
    // Get sales data
    const sales = await Sales.find(dateQuery);
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    
    // Get expense data
    const expenses = await Expense.find(dateQuery);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Calculate profit
    const profit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue * 100) : 0;
    
    // Get cash drawer data
    const cashDrawer = await CashDrawer.find(dateQuery)
      .sort({ date: -1 })
      .limit(1);
    
    const currentBalance = cashDrawer.length > 0 ? cashDrawer[0].balance : 0;
    
    res.json({
      success: true,
      data: {
        revenue: totalRevenue.toFixed(2),
        expenses: totalExpenses.toFixed(2),
        profit: profit.toFixed(2),
        profitMargin: profitMargin.toFixed(2),
        currentBalance: currentBalance.toFixed(2)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Expenses by Category
router.get('/expenses/category', verifyToken, async (req, res) => {
  try {
    const dateQuery = parseDateRange(req);
    dateQuery.userId = req.user.id;
    
    const expenses = await Expense.find(dateQuery);
    
    // Aggregate expenses by category
    const categoryMap = {};
    let totalExpenses = 0;
    
    expenses.forEach(expense => {
      const category = expense.category;
      const amount = expense.amount;
      
      if (!categoryMap[category]) {
        categoryMap[category] = 0;
      }
      
      categoryMap[category] += amount;
      totalExpenses += amount;
    });
    
    // Convert map to array and add percentage
    const categories = Object.keys(categoryMap).map(category => ({
      category,
      amount: categoryMap[category].toFixed(2),
      percentage: (categoryMap[category] / totalExpenses * 100).toFixed(2)
    }));
    
    // Sort by amount descending
    categories.sort((a, b) => b.amount - a.amount);
    
    res.json({
      success: true,
      data: categories,
      summary: {
        totalExpenses: totalExpenses.toFixed(2),
        categoryCount: categories.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Supplier Report
router.get('/suppliers', verifyToken, async (req, res) => {
  try {
    const suppliers = await Supplier.find();
    
    // Get all inventory items related to suppliers in one query
    const inventory = await Inventory.find({ 
      supplier: { $in: suppliers.map(s => s._id) } 
    });
    
    // Create a map for quick lookup
    const inventoryBySupplier = {};
    inventory.forEach(item => {
      const supplierId = item.supplier.toString();
      if (!inventoryBySupplier[supplierId]) {
        inventoryBySupplier[supplierId] = [];
      }
      inventoryBySupplier[supplierId].push(item);
    });
    
    // Process supplier data with inventory details
    const supplierData = suppliers.map(supplier => {
      const supplierItems = inventoryBySupplier[supplier._id.toString()] || [];
      
      const totalItems = supplierItems.length;
      const totalValue = supplierItems.reduce((sum, item) => 
        sum + (item.stock * (item.purchasePrice || item.price)), 0);
      
      return {
        _id: supplier._id,
        name: supplier.name,
        contact: supplier.contact,
        email: supplier.email,
        phone: supplier.phone,
        status: supplier.status,
        totalItems,
        totalValue: totalValue.toFixed(2),
        lastOrder: supplier.lastOrder
      };
    });
    
    res.json({
      success: true,
      data: supplierData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Cash Drawer Transactions
router.get('/cash-drawer', verifyToken, async (req, res) => {
  try {
    const dateQuery = parseDateRange(req);
    dateQuery.userId = req.user.id;
    
    const cashDrawerTransactions = await CashDrawer.find(dateQuery)
      .sort({ date: -1 });
    
    // Calculate period opening and closing balances
    let openingBalance = 0;
    let closingBalance = 0;
    
    if (cashDrawerTransactions.length > 0) {
      // Find the first balance before the period
      const previousTransaction = await CashDrawer.findOne({
        userId: req.user.id,
        date: { $lt: new Date(req.query.startDate) }
      }).sort({ date: -1 });
      
      openingBalance = previousTransaction ? previousTransaction.balance : 0;
      closingBalance = cashDrawerTransactions[0].balance;
    }
    
    // Calculate total sales, expenses, and net change
    const totalSales = cashDrawerTransactions
      .filter(transaction => transaction.operation === 'sale')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
      
    const totalExpenses = cashDrawerTransactions
      .filter(transaction => transaction.operation === 'expense')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
      
    const netChange = openingBalance - closingBalance;
    
    res.json({
      success: true,
      data: cashDrawerTransactions,
      summary: {
        openingBalance,
        closingBalance,
        totalSales,
        totalExpenses,
        netChange
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Expense Transactions
router.get('/expenses/transactions', verifyToken, async (req, res) => {
  try {
    const dateQuery = parseDateRange(req);
    dateQuery.userId = req.user.id;
    
    const expenses = await Expense.find(dateQuery)
      .sort({ date: -1 });
    
    // Calculate total by category and payment method
    const categoryTotals = {};
    const paymentMethodTotals = {};
    let totalAmount = 0;
    
    expenses.forEach(expense => {
      // Aggregate by category
      if (!categoryTotals[expense.category]) {
        categoryTotals[expense.category] = 0;
      }
      categoryTotals[expense.category] += expense.amount;
      
      // Aggregate by payment method
      if (!paymentMethodTotals[expense.paymentMethod]) {
        paymentMethodTotals[expense.paymentMethod] = 0;
      }
      paymentMethodTotals[expense.paymentMethod] += expense.amount;
      
      // Track total
      totalAmount += expense.amount;
    });
    
    // Calculate percentage for each category
    const categorySummary = Object.keys(categoryTotals).map(category => ({
      category,
      amount: categoryTotals[category],
      percentage: (categoryTotals[category] / totalAmount * 100).toFixed(2)
    }));
    
    // Calculate percentage for each payment method
    const paymentMethodSummary = Object.keys(paymentMethodTotals).map(method => ({
      method,
      amount: paymentMethodTotals[method],
      percentage: (paymentMethodTotals[method] / totalAmount * 100).toFixed(2)
    }));
    
    res.json({
      success: true,
      data: expenses,
      summary: {
        totalAmount,
        categorySummary,
        paymentMethodSummary
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

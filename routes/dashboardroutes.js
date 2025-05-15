const express = require('express');
const router = express.Router();
const CashDrawer = require('../models/CashDrawer');
const Inventory = require('../models/Inventory');
const Expense = require('../models/Expense');
const Sales = require('../models/Sales');
const Supplier = require('../models/Supplier');
const User = require('../models/User');
const mongoose = require('mongoose');
const {verifyToken} = require('../middleware/auth');

// Helper function to safely convert userId to ObjectId
const toObjectId = (id) => {
  try {
    return new mongoose.Types.ObjectId(id);
  } catch (error) {
    console.error('Invalid ObjectId:', id, error);
    return id; // Return the original ID if conversion fails
  }
};

/**
 * Generate sample data for testing
 * This route is for development only and should be removed in production
 */
router.post('/generate-sample-data', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjectId = toObjectId(userId);
    const today = new Date();
    
    // Generate inventory items if none exist
    const inventoryCount = await Inventory.countDocuments({ userId: userObjectId });
    if (inventoryCount === 0) {
      const categories = ['Groceries', 'Electronics', 'Clothing', 'Home Goods', 'Beverages'];
      const sampleInventory = [];
      
      for (let i = 0; i < 20; i++) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const price = parseFloat((Math.random() * 100 + 5).toFixed(2));
        const stock = Math.floor(Math.random() * 100);
        const status = stock === 0 ? 'Out of Stock' : stock < 10 ? 'Low Stock' : 'In Stock';
        
        sampleInventory.push({
          name: `Sample Item ${i+1}`,
          sku: `SKU${1000 + i}`,
          category,
          price,
          purchasePrice: price * 0.6,
          stock,
          status,
          reorderLevel: 10,
          userId: userObjectId
        });
      }
      
      await Inventory.insertMany(sampleInventory);
    }
    
    // Generate sales data if none exist
    const salesCount = await Sales.countDocuments({ userId: userObjectId });
    if (salesCount === 0) {
      const inventoryItems = await Inventory.find({ userId: userObjectId });
      if (inventoryItems.length > 0) {
        const sampleSales = [];
        
        // Generate sales for the last 30 days
        for (let i = 0; i < 30; i++) {
          const saleDate = new Date();
          saleDate.setDate(today.getDate() - i);
          saleDate.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60), 0, 0);
          
          // Generate 1-3 sales per day
          const salesPerDay = Math.floor(Math.random() * 3) + 1;
          
          for (let j = 0; j < salesPerDay; j++) {
            // Select 1-5 random items for this sale
            const itemCount = Math.floor(Math.random() * 5) + 1;
            const saleItems = [];
            let subtotal = 0;
            
            for (let k = 0; k < itemCount; k++) {
              const randomItem = inventoryItems[Math.floor(Math.random() * inventoryItems.length)];
              const quantity = Math.floor(Math.random() * 3) + 1;
              const price = randomItem.price;
              
              saleItems.push({
                itemId: randomItem._id,
                name: randomItem.name,
                sku: randomItem.sku,
                quantity,
                price
              });
              
              subtotal += price * quantity;
            }
            
            const discount = Math.random() > 0.7 ? parseFloat((subtotal * 0.1).toFixed(2)) : 0;
            const total = subtotal - discount;
            const cashAmount = parseFloat((Math.ceil(total / 5) * 5).toFixed(2));
            const change = parseFloat((cashAmount - total).toFixed(2));
            
            sampleSales.push({
              receiptNumber: 1000 + salesCount + sampleSales.length,
              items: saleItems,
              subtotal,
              discount,
              total,
              cashAmount,
              change,
              customerName: Math.random() > 0.5 ? `Customer ${Math.floor(Math.random() * 100)}` : '',
              userId: userObjectId,
              date: saleDate
            });
          }
        }
        
        await Sales.insertMany(sampleSales);
      }
    }
    
    // Generate expense data if none exist
    const expenseCount = await Expense.countDocuments({ userId: userObjectId });
    if (expenseCount === 0) {
      const categories = ['Rent', 'Utilities', 'Salaries', 'Inventory Purchase', 'Maintenance', 'Marketing'];
      const sampleExpenses = [];
      
      // Generate expenses for the last 30 days
      for (let i = 0; i < 30; i++) {
        const expenseDate = new Date();
        expenseDate.setDate(today.getDate() - i);
        
        // 0-2 expenses per day
        const expensesPerDay = Math.floor(Math.random() * 3);
        
        for (let j = 0; j < expensesPerDay; j++) {
          const category = categories[Math.floor(Math.random() * categories.length)];
          const amount = parseFloat((Math.random() * 200 + 10).toFixed(2));
          
          sampleExpenses.push({
            expenseId: `EXP-${1000 + expenseCount + sampleExpenses.length}`,
            category,
            description: `Sample ${category} expense`,
            amount,
            paymentMethod: Math.random() > 0.5 ? 'Cash' : 'Credit Card',
            status: 'Paid',
            date: expenseDate,
            userId: userObjectId
          });
        }
      }
      
      await Expense.insertMany(sampleExpenses);
    }
    
    // Generate cash drawer operations if none exist
    const cashDrawerCount = await CashDrawer.countDocuments({ userId: userObjectId });
    if (cashDrawerCount === 0) {
      const sampleOperations = [];
      let balance = 1000; // Starting balance
      
      // Initialize the cash drawer
      sampleOperations.push({
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30),
        previousBalance: 0,
        amount: balance,
        balance,
        operation: 'initialization',
        notes: 'Initial cash drawer setup',
        userId: userObjectId
      });
      
      // Generate operations for the last 30 days
      for (let i = 29; i >= 0; i--) {
        const operationDate = new Date();
        operationDate.setDate(today.getDate() - i);
        
        // Add daily operations (0-2 per day)
        const operationsPerDay = Math.floor(Math.random() * 3);
        
        for (let j = 0; j < operationsPerDay; j++) {
          const isAdd = Math.random() > 0.4;
          const amount = parseFloat((Math.random() * 100 + 20).toFixed(2));
          const previousBalance = balance;
          
          if (isAdd) {
            balance += amount;
            sampleOperations.push({
              date: operationDate,
              previousBalance,
              amount,
              balance,
              operation: 'add',
              notes: 'Cash added to drawer',
              userId: userObjectId
            });
          } else {
            balance -= amount;
            sampleOperations.push({
              date: operationDate,
              previousBalance,
              amount,
              balance,
              operation: 'remove',
              notes: 'Cash removed from drawer',
              userId: userObjectId
            });
          }
        }
      }
      
      await CashDrawer.insertMany(sampleOperations);
    }
    
    res.json({
      success: true,
      message: 'Sample data generated successfully',
      counts: {
        inventory: await Inventory.countDocuments({ userId: userObjectId }),
        sales: await Sales.countDocuments({ userId: userObjectId }),
        expenses: await Expense.countDocuments({ userId: userObjectId }),
        cashDrawer: await CashDrawer.countDocuments({ userId: userObjectId })
      }
    });
  } catch (error) {
    console.error('Error generating sample data:', error);
    res.status(500).json({ message: 'Error generating sample data', error: error.message });
  }
});

/**
 * Get Dashboard Summary
 * Fetches all the key metrics for the dashboard
 */
router.get('/summary', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjectId = toObjectId(userId);
    
    // Create proper date objects for today
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    // Create proper date objects for current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    console.log('Date ranges:', {
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString(),
      startOfMonth: startOfMonth.toISOString(),
      endOfMonth: endOfMonth.toISOString(),
    });
    
    // Today's sales
    const todaySales = await Sales.aggregate([
      { $match: { 
        userId: userObjectId, 
        date: { $gte: startOfDay, $lte: endOfDay } 
      }},
      { $group: { 
        _id: null, 
        total: { $sum: "$total" }, 
        count: { $sum: 1 } 
      }}
    ]);
    
    // Today's expenses
    const todayExpenses = await Expense.aggregate([
      { $match: { 
        userId: userObjectId, 
        date: { $gte: startOfDay, $lte: endOfDay } 
      }},
      { $group: { 
        _id: null, 
        total: { $sum: "$amount" }, 
        count: { $sum: 1 } 
      }}
    ]);
    
    // Monthly sales
    const monthlySales = await Sales.aggregate([
      { $match: { 
        userId: userObjectId, 
        date: { $gte: startOfMonth, $lte: endOfMonth } 
      }},
      { $group: { 
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, 
        total: { $sum: "$total" }, 
        count: { $sum: 1 } 
      }},
      { $sort: { _id: 1 } }
    ]);
    
    // Monthly expenses
    const monthlyExpenses = await Expense.aggregate([
      { $match: { 
        userId: userObjectId, 
        date: { $gte: startOfMonth, $lte: endOfMonth } 
      }},
      { $group: { 
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, 
        total: { $sum: "$amount" }, 
        count: { $sum: 1 } 
      }},
      { $sort: { _id: 1 } }
    ]);
    
    // Inventory status
    const inventoryStatus = await Inventory.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { 
        _id: "$status", 
        count: { $sum: 1 }
      }}
    ]);

    // Low stock items
    const lowStockItems = await Inventory.find({ 
      userId: userObjectId,
      status: 'Low Stock'
    }).sort({ stock: 1 }).limit(5);

    // Latest cash drawer operations
    const cashDrawerOperations = await CashDrawer.find({ userId: userObjectId })
      .sort({ date: -1 })
      .limit(5);
    
    // Latest sales
    const latestSales = await Sales.find({ userId: userObjectId })
      .sort({ date: -1 })
      .limit(5);
    
    // Total inventory value
    const inventoryValue = await Inventory.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { 
        _id: null, 
        totalValue: { $sum: { $multiply: ["$price", "$stock"] } },
        totalItems: { $sum: 1 }
      }}
    ]);

    // Check if we have any data, if not suggest generating sample data
    const hasData = 
      todaySales.length > 0 || 
      monthlySales.length > 0 || 
      inventoryStatus.length > 0 || 
      lowStockItems.length > 0 || 
      cashDrawerOperations.length > 0 || 
      latestSales.length > 0;

    // Return dashboard data
    res.json({
      todaySales: todaySales[0] || { total: 0, count: 0 },
      todayExpenses: todayExpenses[0] || { total: 0, count: 0 },
      monthlySales,
      monthlyExpenses,
      inventoryStatus,
      lowStockItems,
      cashDrawerOperations,
      latestSales,
      inventoryValue: inventoryValue[0] || { totalValue: 0, totalItems: 0 },
      hasData
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ message: 'Error fetching dashboard data', error: error.message });
  }
});

/**
 * Get recent sales by category
 */
router.get('/sales-by-category', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjectId = toObjectId(userId);
    const days = parseInt(req.query.days) || 30;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    console.log(`Fetching sales by category for userId: ${userId}, startDate: ${startDate.toISOString()}`);
    
    // Get sales with inventory items
    const salesWithItems = await Sales.find({
      userId: userObjectId,
      date: { $gte: startDate }
    }).populate({
      path: 'items.itemId',
      model: 'Inventory',
      select: 'category'
    });
    
    console.log(`Found ${salesWithItems.length} sales with items`);
    
    // If no sales data found, return empty array
    if (salesWithItems.length === 0) {
      return res.json([]);
    }

    // Process sales to get totals by category
    const categoryTotals = {};
    
    salesWithItems.forEach(sale => {
      sale.items.forEach(item => {
        if (item.itemId && item.itemId.category) {
          const category = item.itemId.category;
          const itemTotal = item.price * item.quantity;
          
          if (!categoryTotals[category]) {
            categoryTotals[category] = 0;
          }
          
          categoryTotals[category] += itemTotal;
        }
      });
    });
    
    // Convert to array for frontend
    const salesByCategory = Object.entries(categoryTotals).map(([category, total]) => ({
      category,
      total
    }));
    
    res.json(salesByCategory);
  } catch (error) {
    console.error('Error fetching sales by category:', error);
    res.status(500).json({ message: 'Error fetching sales by category', error: error.message });
  }
});

/**
 * Get cash drawer balance history
 */
router.get('/cash-balance-history', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjectId = toObjectId(userId);
    const days = parseInt(req.query.days) || 14;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    console.log(`Fetching cash balance history for userId: ${userId}, startDate: ${startDate.toISOString()}`);
    
    // Get daily balances
    const balances = await CashDrawer.aggregate([
      { 
        $match: { 
          userId: userObjectId, 
          date: { $gte: startDate } 
        } 
      },
      {
        $sort: { date: 1 }
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            day: { $dayOfMonth: "$date" }
          },
          lastBalance: { $last: "$balance" },
          date: { $last: "$date" }
        }
      },
      {
        $sort: { date: 1 }
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$date"
            }
          },
          balance: "$lastBalance"
        }
      }
    ]);
    
    console.log(`Found ${balances.length} days of cash balance data`);
    
    // If no balances found, provide some sample data for better UX
    if (balances.length === 0) {
      const sampleBalances = [];
      let balance = 1000;
      
      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Add some randomness to sample data
        const change = Math.random() > 0.5 ? 
          Math.random() * 100 : 
          -Math.random() * 50;
          
        balance += change;
        if (balance < 0) balance = 100; // Ensure no negative balances
        
        sampleBalances.push({
          date: date.toISOString().split('T')[0],
          balance: parseFloat(balance.toFixed(2))
        });
      }
      
      console.log('Returning sample cash balance data');
      return res.json(sampleBalances);
    }
    
    res.json(balances);
  } catch (error) {
    console.error('Error fetching cash balance history:', error);
    res.status(500).json({ message: 'Error fetching cash balance history', error: error.message });
  }
});

/**
 * Get expense breakdown by category
 */
router.get('/expenses-by-category', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjectId = toObjectId(userId);
    const days = parseInt(req.query.days) || 30;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    console.log(`Fetching expenses by category for userId: ${userId}, startDate: ${startDate.toISOString()}`);
    
    const expensesByCategory = await Expense.aggregate([
      {
        $match: {
          userId: userObjectId,
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" }
        }
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          total: 1
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);
    
    console.log(`Found ${expensesByCategory.length} expense categories`);
    
    res.json(expensesByCategory);
  } catch (error) {
    console.error('Error fetching expenses by category:', error);
    res.status(500).json({ message: 'Error fetching expenses by category', error: error.message });
  }
});

/**
 * Get sales summary for a period
 */
router.get('/sales-summary', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjectId = toObjectId(userId);
    const days = parseInt(req.query.days) || 30;
    
    // Calculate the start date
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - days);
    
    console.log(`Fetching sales summary for userId: ${userId}, days: ${days}, startDate: ${startDate.toISOString()}`);
    
    // Aggregate sales for the period
    const salesSummary = await Sales.aggregate([
      { 
        $match: { 
          userId: userObjectId, 
          date: { $gte: startDate, $lte: now } 
        } 
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: "$total" }, 
          count: { $sum: 1 } 
        } 
      }
    ]);
    
    // Return the summary or empty object if no sales
    res.json(salesSummary.length > 0 ? salesSummary[0] : { total: 0, count: 0 });
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    res.status(500).json({ message: 'Error fetching sales summary', error: error.message });
  }
});

/**
 * Get expenses summary for a period
 */
router.get('/expenses-summary', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjectId = toObjectId(userId);
    const days = parseInt(req.query.days) || 30;
    
    // Calculate the start date
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - days);
    
    console.log(`Fetching expenses summary for userId: ${userId}, days: ${days}, startDate: ${startDate.toISOString()}`);
    
    // Aggregate expenses for the period
    const expensesSummary = await Expense.aggregate([
      { 
        $match: { 
          userId: userObjectId, 
          date: { $gte: startDate, $lte: now } 
        } 
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: "$amount" }, 
          count: { $sum: 1 } 
        } 
      }
    ]);
    
    // Return the summary or empty object if no expenses
    res.json(expensesSummary.length > 0 ? expensesSummary[0] : { total: 0, count: 0 });
  } catch (error) {
    console.error('Error fetching expenses summary:', error);
    res.status(500).json({ message: 'Error fetching expenses summary', error: error.message });
  }
});

/**
 * Get net purchase amount for inventory
 */
router.get('/net-purchase-amount', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjectId = toObjectId(userId);
    
    console.log(`Fetching net purchase amount for userId: ${userId}`);
    
    // Calculate the total purchase value for all inventory items
    // This assumes you have a field called purchasePrice in your Inventory model
    const netPurchase = await Inventory.aggregate([
      { 
        $match: { 
          userId: userObjectId 
        } 
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: { $multiply: ["$purchasePrice", "$stock"] } },
          count: { $sum: 1 }
        } 
      }
    ]);
    
    // Return the summary or empty object if no inventory
    res.json(netPurchase.length > 0 ? netPurchase[0] : { total: 0, count: 0 });
  } catch (error) {
    console.error('Error fetching net purchase amount:', error);
    res.status(500).json({ message: 'Error fetching net purchase amount', error: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const Sales = require('../models/Sales');
const { verifyToken } = require('../middleware/auth');

/**
 * @route   GET /api/reports/sales
 * @desc    Get sales data for reports
 * @access  Private
 */
router.get('/sales', verifyToken, async (req, res) => {
  try {
    const { timeframe, startDate, endDate } = req.query;
    const userId = req.user.id;
    
    let start, end;
    
    // Set date range based on timeframe
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      end = new Date();
      
      switch (timeframe) {
        case 'daily':
          // Last 7 days
          start = new Date(end);
          start.setDate(end.getDate() - 7);
          break;
        case 'weekly':
          // Last 4 weeks
          start = new Date(end);
          start.setDate(end.getDate() - 28);
          break;
        case 'monthly':
          // Last 6 months
          start = new Date(end);
          start.setMonth(end.getMonth() - 6);
          break;
        case 'yearly':
          // Last year
          start = new Date(end);
          start.setFullYear(end.getFullYear() - 1);
          break;
        default:
          // Default to last 30 days
          start = new Date(end);
          start.setDate(end.getDate() - 30);
      }
    }
    
    // Find all sales within date range
    const sales = await Sales.find({
      userId,
      date: { $gte: start, $lte: end }
    }).sort({ date: 1 });
    
    // Group sales data by date for chart
    const groupedData = {};
    let totalSales = 0;
    let totalProfit = 0;
    let totalTransactions = 0;
    let totalItems = 0;
    
    sales.forEach(sale => {
      // Format date based on timeframe
      let dateKey;
      
      if (timeframe === 'yearly') {
        dateKey = new Date(sale.date).toLocaleString('default', { month: 'short' });
      } else {
        dateKey = new Date(sale.date).toLocaleDateString();
      }
      
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = {
          sales: 0,
          profit: 0,
          transactions: 0
        };
      }
      
      // Calculate approximate profit (30% of sales as a placeholder)
      // In a real system, you would calculate based on cost vs. sale price
      const saleProfit = sale.total * 0.3;
      
      // Update daily data
      groupedData[dateKey].sales += sale.total;
      groupedData[dateKey].profit += saleProfit;
      groupedData[dateKey].transactions += 1;
      
      // Update totals
      totalSales += sale.total;
      totalProfit += saleProfit;
      totalTransactions += 1;
      
      // Count items
      totalItems += sale.items.reduce((sum, item) => sum + item.quantity, 0);
    });
    
    // Convert to array format for chart
    const chartData = Object.keys(groupedData).map(date => ({
      name: date,
      sales: Math.round(groupedData[date].sales * 100) / 100,
      profit: Math.round(groupedData[date].profit * 100) / 100,
      transactions: groupedData[date].transactions
    }));
    
    // Calculate averages
    const averageSale = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
    
    res.json({
      chartData,
      summary: {
        totalSales,
        averageSale,
        totalTransactions,
        profitMargin
      }
    });
  } catch (error) {
    console.error('Error fetching sales report data:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/reports/inventory-value
 * @desc    Get inventory value trend
 * @access  Private
 */
router.get('/inventory-value', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // For a real system, you would track inventory value history in a separate collection
    // For this implementation, we'll return current value and simulate past values
    
    // Get current inventory value
    const items = await Inventory.find({ userId });
    const currentValue = items.reduce((sum, item) => sum + (item.price * item.stock), 0);
    
    // Generate simulated historical data (in a real system, this would come from a database)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    
    // Create data for the last 6 months
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      
      // Simulate some variation in inventory value (±10% from current)
      const variation = 0.9 + (Math.random() * 0.2);
      const value = i === 0 
        ? currentValue 
        : Math.round(currentValue * (0.85 + (i * 0.03)) * variation);
      
      chartData.push({
        name: months[monthIndex],
        value
      });
    }
    
    res.json({ chartData });
  } catch (error) {
    console.error('Error fetching inventory value data:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/reports/categories
 * @desc    Get sales by category
 * @access  Private
 */
router.get('/categories', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { timeframe } = req.query;
    
    // Set date range based on timeframe
    const end = new Date();
    let start;
    
    switch (timeframe) {
      case 'daily':
        // Last 7 days
        start = new Date(end);
        start.setDate(end.getDate() - 7);
        break;
      case 'weekly':
        // Last 4 weeks
        start = new Date(end);
        start.setDate(end.getDate() - 28);
        break;
      case 'monthly':
        // Last 6 months
        start = new Date(end);
        start.setMonth(end.getMonth() - 6);
        break;
      case 'yearly':
        // Last year
        start = new Date(end);
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        // Default to last 30 days
        start = new Date(end);
        start.setDate(end.getDate() - 30);
    }
    
    // Find all sales within date range
    const sales = await Sales.find({
      userId,
      date: { $gte: start, $lte: end }
    });
    
    // We need to fetch all inventory items to get their categories
    const inventoryItems = await Inventory.find({ userId });
    const itemCategories = {};
    
    // Create a lookup of item id to category
    inventoryItems.forEach(item => {
      itemCategories[item._id.toString()] = item.category;
    });
    
    // Group sales by category
    const categorySales = {};
    let totalSales = 0;
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const itemId = item.itemId.toString();
        const category = itemCategories[itemId] || 'Uncategorized';
        const itemTotal = item.price * item.quantity;
        
        if (!categorySales[category]) {
          categorySales[category] = 0;
        }
        
        categorySales[category] += itemTotal;
        totalSales += itemTotal;
      });
    });
    
    // Convert to array format for chart and calculate percentages
    const chartData = Object.keys(categorySales).map(category => ({
      name: category,
      value: Math.round((categorySales[category] / totalSales) * 100)
    }));
    
    // Sort by value (highest first)
    chartData.sort((a, b) => b.value - a.value);
    
    // Limit to top 5 categories + "Other"
    if (chartData.length > 6) {
      const topCategories = chartData.slice(0, 5);
      const otherValue = chartData.slice(5).reduce((sum, item) => sum + item.value, 0);
      topCategories.push({ name: 'Other', value: otherValue });
      res.json({ chartData: topCategories });
    } else {
      res.json({ chartData });
    }
  } catch (error) {
    console.error('Error fetching category data:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/reports/top-selling
 * @desc    Get top selling items
 * @access  Private
 */
router.get('/top-selling', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { timeframe = 'monthly', limit = 5 } = req.query;
    
    // Set date range based on timeframe
    const end = new Date();
    let start;
    
    switch (timeframe) {
      case 'daily':
        // Last day
        start = new Date(end);
        start.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        // Last 7 days
        start = new Date(end);
        start.setDate(end.getDate() - 7);
        break;
      case 'monthly':
        // Last 30 days
        start = new Date(end);
        start.setDate(end.getDate() - 30);
        break;
      case 'yearly':
        // Last 365 days
        start = new Date(end);
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        // Default to last 30 days
        start = new Date(end);
        start.setDate(end.getDate() - 30);
    }
    
    // Find all sales within date range
    const sales = await Sales.find({
      userId,
      date: { $gte: start, $lte: end }
    }).populate('items.itemId', 'name sku');
    
    // Aggregate item sales
    const itemSales = {};
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const itemId = item.itemId ? item.itemId._id.toString() : item.itemId;
        const name = item.itemId ? item.itemId.name : item.name;
        const sku = item.itemId ? item.itemId.sku : item.sku;
        
        if (!itemId) return;
        
        if (!itemSales[itemId]) {
          itemSales[itemId] = {
            _id: itemId,
            name,
            sku,
            sold: 0,
            revenue: 0
          };
        }
        
        itemSales[itemId].sold += item.quantity;
        itemSales[itemId].revenue += item.price * item.quantity;
      });
    });
    
    // Convert to array and sort by revenue
    let topItems = Object.values(itemSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, parseInt(limit));
    
    res.json(topItems);
  } catch (error) {
    console.error('Error fetching top selling items:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 
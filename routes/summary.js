const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const Sales = require('../models/Sales');
const { verifyToken } = require('../middleware/auth');

// Get summary of inventory performance
router.get('/inventory-performance', verifyToken, async (req, res) => {
  try {
    const { id: userId } = req.user; // Changed from req.user.userId to req.user.id to match auth middleware

    console.log('Fetching inventory performance for user:', userId);

    // Get all inventory items
    const inventoryItems = await Inventory.find({ userId }).lean();
    console.log(`Found ${inventoryItems.length} inventory items`);
    
    // Get all sales
    const sales = await Sales.find({ userId }).lean();
    console.log(`Found ${sales.length} sales records`);
    
    // Debug log for a sample inventory item and sale if available
    if (inventoryItems.length > 0) {
      console.log('Sample inventory item:', JSON.stringify(inventoryItems[0]));
    }
    if (sales.length > 0) {
      console.log('Sample sale record:', JSON.stringify(sales[0]));
    }
    
    // Aggregate sales data by item
    const salesByItem = {};
    sales.forEach(sale => {
      if (!sale.items || !Array.isArray(sale.items)) {
        console.warn('Sale missing items array:', sale._id);
        return;
      }
      
      sale.items.forEach(item => {
        // Convert itemId to string for consistent comparison
        const itemIdStr = item.itemId ? item.itemId.toString() : null;
        if (!itemIdStr) {
          console.warn('Sale item missing itemId:', item);
          return;
        }
        
        if (!salesByItem[itemIdStr]) {
          salesByItem[itemIdStr] = {
            quantity: 0,
            revenue: 0
          };
        }
        salesByItem[itemIdStr].quantity += item.quantity || 0;
        salesByItem[itemIdStr].revenue += (item.price || 0) * (item.quantity || 0);
      });
    });
    
    console.log('Sales by item calculated for', Object.keys(salesByItem).length, 'items');
    
    // Calculate performance metrics for each item
    const performanceData = inventoryItems.map(item => {
      // Convert item._id to string for consistent comparison with salesByItem keys
      const itemIdStr = item._id.toString();
      const salesData = salesByItem[itemIdStr] || { quantity: 0, revenue: 0 };
      
      const purchasePrice = item.purchasePrice || 0;
      const salesQuantity = salesData.quantity || 0;
      const revenue = salesData.revenue || 0;
      
      // Calculate cost of sold items
      const costOfSoldItems = purchasePrice * salesQuantity;
      
      // Calculate profit
      const profit = revenue - costOfSoldItems;
      
      // Calculate profit margin
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
      
      // Calculate total inventory cost (cost of current stock + cost of sold items)
      const totalCost = purchasePrice * (item.stock || 0) + costOfSoldItems;
      
      return {
        _id: item._id,
        name: item.name || 'Unknown Item',
        sku: item.sku || '',
        category: item.category || 'Uncategorized',
        currentStock: item.stock || 0,
        price: item.price || 0,
        purchasePrice: purchasePrice,
        salesQuantity: salesQuantity,
        revenue: revenue,
        cost: totalCost,
        profit: profit,
        profitMargin: profitMargin,
        status: item.status || 'Unknown'
      };
    });
    
    // Categorize items by sales performance
    const totalItems = performanceData.length;
    if (totalItems === 0) {
      console.log('No items found. Returning empty response.');
      return res.json({
        mostSelling: [],
        mediumSelling: [],
        lowSelling: [],
        notSelling: [],
        summary: {
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          averageProfitMargin: 0
        }
      });
    }
    
    // Sort by sales quantity
    performanceData.sort((a, b) => b.salesQuantity - a.salesQuantity);
    
    // Calculate percentiles
    const topPercentile = Math.ceil(totalItems * 0.25);
    const mediumPercentile = Math.ceil(totalItems * 0.5);
    const lowPercentile = Math.ceil(totalItems * 0.75);
    
    // Categorize items
    const mostSelling = performanceData.slice(0, topPercentile);
    const mediumSelling = performanceData.slice(topPercentile, mediumPercentile);
    const lowSelling = performanceData.slice(mediumPercentile, lowPercentile);
    const notSelling = performanceData.slice(lowPercentile);
    
    // Calculate summary metrics
    const totalRevenue = performanceData.reduce((sum, item) => sum + item.revenue, 0);
    const totalCost = performanceData.reduce((sum, item) => sum + (item.purchasePrice * item.salesQuantity), 0);
    const totalProfit = performanceData.reduce((sum, item) => sum + item.profit, 0);
    
    // Only include items with sales in average profit margin calculation
    const itemsWithSales = performanceData.filter(item => item.salesQuantity > 0);
    const averageProfitMargin = itemsWithSales.length > 0 
      ? itemsWithSales.reduce((sum, item) => sum + item.profitMargin, 0) / itemsWithSales.length 
      : 0;
    
    const response = {
      mostSelling,
      mediumSelling,
      lowSelling,
      notSelling,
      summary: {
        totalRevenue,
        totalCost,
        totalProfit,
        averageProfitMargin
      }
    };
    
    console.log('Summary metrics calculated:', response.summary);
    
    res.json(response);
  } catch (error) {
    console.error('Error getting inventory performance:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get monthly stock analysis data
router.get('/monthly-stock', verifyToken, async (req, res) => {
  try {
    const { id: userId } = req.user;

    console.log('Fetching monthly stock analysis for user:', userId);

    // Get inventory items
    const inventoryItems = await Inventory.find({ userId }).lean();
    
    // Get all sales to analyze historical stock changes
    const sales = await Sales.find({ userId }).lean();
    
    // Get current date to determine month range
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    // Create array of last 6 months (including current month)
    const monthsData = [];
    for (let i = 0; i < 6; i++) {
      const monthDate = new Date(currentDate);
      monthDate.setMonth(currentDate.getMonth() - i);
      
      const monthName = monthDate.toLocaleString('default', { month: 'long' });
      const year = monthDate.getFullYear();
      
      monthsData.push({
        monthName,
        year,
        month: monthDate.getMonth(),
        fullDate: monthDate,
        totalStock: 0,
        totalHistoricalStock: 0, // Add total historical stock tracking
        totalSold: 0, // Add total sold tracking
        stockByCategory: {},
        historicalStockByCategory: {}, // Add historical stock by category
        itemsStock: {} // Add tracking for individual items
      });
    }
    
    // Current stock is what we have now
    const currentStock = inventoryItems.reduce((sum, item) => sum + (item.stock || 0), 0);
    monthsData[0].totalStock = currentStock;
    
    // Get total sold items from all sales
    const totalSoldItems = sales.reduce((total, sale) => {
      if (!sale.items || !Array.isArray(sale.items)) return total;
      
      return total + sale.items.reduce((subtotal, item) => {
        return subtotal + (item.quantity || 0);
      }, 0);
    }, 0);
    
    // Calculate total historical stock for current month (current + sold)
    monthsData[0].totalSold = totalSoldItems;
    monthsData[0].totalHistoricalStock = currentStock + totalSoldItems;

    // Group current stock by category and individual items
    inventoryItems.forEach(item => {
      const category = item.category || 'Uncategorized';
      const itemId = item._id.toString();
      
      // Add to category totals
      if (!monthsData[0].stockByCategory[category]) {
        monthsData[0].stockByCategory[category] = 0;
        monthsData[0].historicalStockByCategory[category] = 0;
      }
      monthsData[0].stockByCategory[category] += (item.stock || 0);
      
      // Add individual item data
      monthsData[0].itemsStock[itemId] = {
        id: itemId,
        name: item.name || 'Unknown Item',
        sku: item.sku || '',
        category: category,
        stock: item.stock || 0,
        price: item.price || 0,
        purchasePrice: item.purchasePrice || 0,
        soldQuantity: 0, // Will be updated based on sales
        historicalStock: item.stock || 0 // Will be updated to include sold items
      };
    });
    
    // Calculate item sold quantities and update historical stock
    sales.forEach(sale => {
      if (!sale.items || !Array.isArray(sale.items)) return;
      
      sale.items.forEach(saleItem => {
        const itemIdStr = saleItem.itemId ? saleItem.itemId.toString() : null;
        if (!itemIdStr) return;
        
        const quantity = saleItem.quantity || 0;
        
        // Update sold quantity for first month (current month)
        if (monthsData[0].itemsStock[itemIdStr]) {
          monthsData[0].itemsStock[itemIdStr].soldQuantity += quantity;
          monthsData[0].itemsStock[itemIdStr].historicalStock += quantity;
          
          // Update category historical totals
          const category = monthsData[0].itemsStock[itemIdStr].category;
          monthsData[0].historicalStockByCategory[category] = 
            (monthsData[0].historicalStockByCategory[category] || 0) + quantity;
        }
      });
    });
    
    // Calculate estimated stock for previous months by adding sold quantities
    // For each previous month, add the items sold in that period to estimate
    // what the stock would have been
    sales.forEach(sale => {
      const saleDate = new Date(sale.date);
      
      // Skip future sales or sales older than our tracking period
      if (!saleDate || saleDate > currentDate || saleDate < monthsData[monthsData.length - 1].fullDate) {
        return;
      }
      
      // Find which month this sale belongs to
      const monthData = monthsData.find(m => 
        m.month === saleDate.getMonth() && m.year === saleDate.getFullYear()
      );
      
      if (monthData && Array.isArray(sale.items)) {
        // Process each item in the sale
        sale.items.forEach(saleItem => {
          const itemIdStr = saleItem.itemId ? saleItem.itemId.toString() : null;
          if (!itemIdStr) return;
          
          const inventoryItem = inventoryItems.find(i => 
            i._id.toString() === itemIdStr
          );
          
          if (inventoryItem) {
            const category = inventoryItem.category || 'Uncategorized';
            const quantity = saleItem.quantity || 0;
            
            // Update all months preceding this sale
            for (let i = 0; i < monthsData.length; i++) {
              const checkMonth = monthsData[i];
              
              // If the month is before or equal to the sale month, add the quantity
              // to account for items that were in stock before being sold
              if (new Date(checkMonth.year, checkMonth.month) <= new Date(monthData.year, monthData.month)) {
                if (i > 0) { // Skip current month as it's already accounted for
                  // Update month totals
                  checkMonth.totalStock += quantity;
                  checkMonth.totalSold = (checkMonth.totalSold || 0) + (i === monthsData.indexOf(monthData) ? quantity : 0);
                  checkMonth.totalHistoricalStock = checkMonth.totalStock + checkMonth.totalSold;
                  
                  // Update category totals
                  if (!checkMonth.stockByCategory[category]) {
                    checkMonth.stockByCategory[category] = 0;
                    checkMonth.historicalStockByCategory[category] = 0;
                  }
                  checkMonth.stockByCategory[category] += quantity;
                  
                  // If this sale happened during this month, update historical category data
                  if (i === monthsData.indexOf(monthData)) {
                    checkMonth.historicalStockByCategory[category] = 
                      (checkMonth.historicalStockByCategory[category] || 0) + quantity;
                  }
                  
                  // Update individual item data
                  if (!checkMonth.itemsStock[itemIdStr]) {
                    checkMonth.itemsStock[itemIdStr] = {
                      id: itemIdStr,
                      name: inventoryItem.name || 'Unknown Item',
                      sku: inventoryItem.sku || '',
                      category: category,
                      stock: 0,
                      price: inventoryItem.price || 0,
                      purchasePrice: inventoryItem.purchasePrice || 0,
                      soldQuantity: 0,
                      historicalStock: 0
                    };
                  }
                  checkMonth.itemsStock[itemIdStr].stock += quantity;
                  
                  // If this sale happened during this month, update the sold quantity
                  if (i === monthsData.indexOf(monthData)) {
                    checkMonth.itemsStock[itemIdStr].soldQuantity += quantity;
                  }
                  
                  // Update historical stock to be current stock + sold quantity
                  checkMonth.itemsStock[itemIdStr].historicalStock = 
                    checkMonth.itemsStock[itemIdStr].stock + checkMonth.itemsStock[itemIdStr].soldQuantity;
                }
              }
            }
          }
        });
      }
    });
    
    // Prepare response for frontend
    const monthlyStockData = monthsData.map(month => {
      // Convert stockByCategory object to array for easier handling in frontend
      const categoryData = Object.entries(month.stockByCategory).map(([name, value]) => ({
        name,
        value
      }));
      
      // Convert historicalStockByCategory object to array
      const historicalCategoryData = Object.entries(month.historicalStockByCategory).map(([name, value]) => ({
        name, 
        value: value + (month.stockByCategory[name] || 0) // Add current stock to historical (sold) stock
      }));
      
      // Convert itemsStock object to array
      const itemsData = Object.values(month.itemsStock);
      
      return {
        month: month.monthName,
        year: month.year,
        totalStock: month.totalStock,
        totalSold: month.totalSold || 0,
        totalHistoricalStock: month.totalHistoricalStock || month.totalStock + (month.totalSold || 0),
        stockByCategory: categoryData,
        historicalStockByCategory: historicalCategoryData,
        itemsStock: itemsData
      };
    });
    
    // Get top 10 items by current stock quantity for quick access
    const topItems = monthlyStockData[0].itemsStock
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 10)
      .map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        currentStock: item.stock,
        soldQuantity: item.soldQuantity,
        historicalStock: item.historicalStock
      }));
    
    res.json({
      monthlyStockData,
      topItems,
      // Add summary data
      summary: {
        currentMonthStock: monthlyStockData[0].totalStock,
        currentMonthHistoricalStock: monthlyStockData[0].totalHistoricalStock,
        currentMonthSold: monthlyStockData[0].totalSold,
        previousMonthStock: monthlyStockData[1]?.totalStock || 0,
        percentChange: monthlyStockData[1]?.totalStock 
          ? ((monthlyStockData[0].totalStock - monthlyStockData[1].totalStock) / monthlyStockData[1].totalStock * 100)
          : 0,
        historicalPercentChange: monthlyStockData[1]?.totalHistoricalStock
          ? ((monthlyStockData[0].totalHistoricalStock - monthlyStockData[1].totalHistoricalStock) / monthlyStockData[1].totalHistoricalStock * 100)
          : 0
      }
    });
    
  } catch (error) {
    console.error('Error getting monthly stock analysis:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

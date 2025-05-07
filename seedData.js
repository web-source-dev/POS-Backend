const mongoose = require('mongoose');
const User = require('./models/User');
const Inventory = require('./models/Inventory');
const Supplier = require('./models/Supplier');
const Sales = require('./models/Sales');
const Expense = require('./models/Expense');
const CashDrawer = require('./models/CashDrawer');
const Settings = require('./models/Settings');
require('dotenv').config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

// Seed data function
const seedData = async () => {
  try {
    console.log('Starting to seed data...');

    // Clear existing data (optional - comment out if you don't want to clear data)
    await Promise.all([
      Inventory.deleteMany({}),
      Supplier.deleteMany({}),
      Sales.deleteMany({}),
      Expense.deleteMany({}),
      CashDrawer.deleteMany({}),
      Settings.deleteMany({})
    ]);
    console.log('Cleared existing data');

    // Find existing user or create one if none exists
    let user = await User.findOne({});
    if (!user) {
      user = await User.create({
        username: 'admin',
        email: 'admin@autoparts.com',
        password: 'admin123',
        role: 'admin'
      });
      console.log('Created new user:', user.username);
    } else {
      console.log('Using existing user:', user.username);
    }

    // Create business settings
    const existingSettings = await Settings.findOne({});
    if (!existingSettings) {
      await Settings.create({
        business: {
          name: 'AutoParts Plus',
          taxId: 'AP-12345678',
          address: '123 Auto Drive, Mechanicsville, NY 10001',
          phone: '(555) 123-4567',
          email: 'info@autopartsplus.com',
          website: 'www.autopartsplus.com',
          businessHours: 'Mon-Fri: 8am-6pm, Sat: 9am-4pm, Sun: Closed'
        },
        pos: {
          receiptHeader: 'AutoParts Plus - Quality Parts, Fair Prices',
          receiptFooter: 'Thank you for your business! All returns must be made within 30 days with receipt.'
        },
        hardware: {
          printer: {
            model: 'Epson TM-T88VI',
            connectionType: 'usb',
            enabled: true
          }
        },
        updatedBy: user._id
      });
      console.log('Created business settings');
    } else {
      console.log('Settings already exist, skipping...');
    }

    // Create suppliers
    const suppliers = [
      {
        name: 'OEM Auto Parts Inc.',
        contact: 'John Smith',
        email: 'john@oemautoparts.com',
        phone: '(555) 111-2222',
        address: '456 Manufacturing Blvd, Detroit, MI 48201',
        paymentTerms: 'Net 30',
        status: 'Active',
        totalOrders: 24
      },
      {
        name: 'Precision Parts Supply',
        contact: 'Maria Rodriguez',
        email: 'maria@precisionparts.com',
        phone: '(555) 222-3333',
        address: '789 Component St, Chicago, IL 60007',
        paymentTerms: 'Net 45',
        status: 'Active',
        totalOrders: 16
      },
      {
        name: 'Global Auto Suppliers',
        contact: 'David Chen',
        email: 'david@globalauto.com',
        phone: '(555) 333-4444',
        address: '101 International Way, Los Angeles, CA 90012',
        paymentTerms: 'Net 60',
        status: 'Active',
        totalOrders: 31
      },
      {
        name: 'Aftermarket Kings',
        contact: 'Sarah Johnson',
        email: 'sarah@aftermarketkings.com',
        phone: '(555) 444-5555',
        address: '222 Custom Road, Houston, TX 77002',
        paymentTerms: 'COD',
        status: 'Active',
        totalOrders: 19
      },
      {
        name: 'Budget Auto Parts',
        contact: 'Mike Wilson',
        email: 'mike@budgetauto.com',
        phone: '(555) 555-6666',
        address: '333 Discount Drive, Phoenix, AZ 85001',
        paymentTerms: 'Net 15',
        status: 'On Hold',
        totalOrders: 7
      },
      {
        name: 'European Parts Specialists',
        contact: 'Emma Thompson',
        email: 'emma@europeanparts.com',
        phone: '(555) 666-7777',
        address: '444 Import Avenue, Miami, FL 33101',
        paymentTerms: 'Net 30',
        status: 'Active',
        totalOrders: 22
      },
      {
        name: 'Truck Parts Warehouse',
        contact: 'Robert Johnson',
        email: 'robert@truckparts.com',
        phone: '(555) 777-8888',
        address: '555 Heavy Duty Blvd, Dallas, TX 75201',
        paymentTerms: 'Net 45',
        status: 'Active',
        totalOrders: 28
      }
    ];

    const createdSuppliers = [];
    for (const supplierData of suppliers) {
      // Check if supplier exists by email
      const existingSupplier = await Supplier.findOne({ email: supplierData.email });
      if (!existingSupplier) {
        const supplier = await Supplier.create({
          ...supplierData,
          lastOrder: supplierData.name === 'Precision Parts Supply' || supplierData.name === 'OEM Auto Parts Inc.' 
            ? new Date() // Today for some suppliers
            : new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000)
        });
        createdSuppliers.push(supplier);
      } else {
        createdSuppliers.push(existingSupplier);
      }
    }
    console.log(`Created/Found ${createdSuppliers.length} suppliers`);

    // Create inventory items
    const inventoryItems = [
      {
        name: 'Air Filter',
        sku: 'AF-1001',
        category: 'Filters',
        price: 14.99,
        stock: 45,
        description: 'High-quality air filter for most sedan models',
        reorderLevel: 10
      },
      {
        name: 'Oil Filter',
        sku: 'OF-2002',
        category: 'Filters',
        price: 8.99,
        stock: 62,
        description: 'Premium oil filter with anti-drain back valve',
        reorderLevel: 15
      },
      {
        name: 'Brake Pads (Front)',
        sku: 'BP-3003',
        category: 'Brakes',
        price: 39.99,
        stock: 23,
        description: 'Ceramic front brake pads - fits most domestic models',
        reorderLevel: 8
      },
      {
        name: 'Brake Pads (Rear)',
        sku: 'BP-3004',
        category: 'Brakes',
        price: 34.99,
        stock: 0, // Out of stock
        description: 'Ceramic rear brake pads - fits most domestic models',
        reorderLevel: 8
      },
      {
        name: 'Brake Rotor',
        sku: 'BR-3005',
        category: 'Brakes',
        price: 29.99,
        stock: 12,
        description: 'Standard replacement brake rotor',
        reorderLevel: 5
      },
      {
        name: 'Spark Plugs (Set of 4)',
        sku: 'SP-4001',
        category: 'Ignition',
        price: 24.99,
        stock: 35,
        description: 'Platinum spark plugs for improved performance',
        reorderLevel: 10
      },
      {
        name: 'Ignition Coil',
        sku: 'IC-4002',
        category: 'Ignition',
        price: 49.99,
        stock: 15,
        description: 'Direct replacement ignition coil',
        reorderLevel: 5
      },
      {
        name: 'Wiper Blades',
        sku: 'WB-5001',
        category: 'Accessories',
        price: 19.99,
        stock: 42,
        description: 'All-season wiper blades (20" pair)',
        reorderLevel: 12
      },
      {
        name: 'Motor Oil - 5W30 (1 qt)',
        sku: 'MO-6001',
        category: 'Fluids',
        price: 6.99,
        stock: 75,
        description: 'Synthetic blend motor oil - 5W30 weight',
        reorderLevel: 20
      },
      {
        name: 'Motor Oil - 10W30 (1 qt)',
        sku: 'MO-6002',
        category: 'Fluids',
        price: 6.99,
        stock: 68,
        description: 'Synthetic blend motor oil - 10W30 weight',
        reorderLevel: 20
      },
      {
        name: 'Transmission Fluid (1 qt)',
        sku: 'TF-6003',
        category: 'Fluids',
        price: 9.99,
        stock: 0, // Out of stock
        description: 'Automatic transmission fluid',
        reorderLevel: 12
      },
      {
        name: 'Alternator',
        sku: 'AL-7001',
        category: 'Electrical',
        price: 129.99,
        stock: 0, // Out of stock
        description: 'Remanufactured alternator for most domestic vehicles',
        reorderLevel: 3
      },
      {
        name: 'Battery',
        sku: 'BA-7002',
        category: 'Electrical',
        price: 89.99,
        stock: 14,
        description: '12V automotive battery, 600 CCA',
        reorderLevel: 5
      },
      {
        name: 'Headlight Bulb',
        sku: 'HL-7003',
        category: 'Electrical',
        price: 12.99,
        stock: 4, // Low stock
        description: 'Standard replacement halogen headlight bulb',
        reorderLevel: 8
      },
      {
        name: 'Radiator',
        sku: 'RA-8001',
        category: 'Cooling',
        price: 119.99,
        stock: 6,
        description: 'Aluminum radiator for standard sedans',
        reorderLevel: 2
      },
      {
        name: 'Radiator Hose',
        sku: 'RH-8002',
        category: 'Cooling',
        price: 18.99,
        stock: 3, // Low stock
        description: 'Upper radiator hose - universal fit',
        reorderLevel: 7
      },
      {
        name: 'Thermostat',
        sku: 'TS-8003',
        category: 'Cooling',
        price: 9.99,
        stock: 31,
        description: 'Engine thermostat - 195°F',
        reorderLevel: 10
      },
      {
        name: 'Fuel Pump',
        sku: 'FP-9001',
        category: 'Fuel System',
        price: 79.99,
        stock: 0, // Out of stock
        description: 'Electric fuel pump assembly',
        reorderLevel: 4
      },
      {
        name: 'Fuel Filter',
        sku: 'FF-9002',
        category: 'Fuel System',
        price: 14.99,
        stock: 27,
        description: 'In-line fuel filter for most vehicles',
        reorderLevel: 8
      },
      {
        name: 'Oxygen Sensor',
        sku: 'OS-9003',
        category: 'Fuel System',
        price: 39.99,
        stock: 16,
        description: 'Upstream oxygen sensor (O2 sensor)',
        reorderLevel: 5
      },
      {
        name: 'Serpentine Belt',
        sku: 'SB-1010',
        category: 'Belts & Hoses',
        price: 22.99,
        stock: 18,
        description: 'Standard serpentine belt - multi-vehicle fit',
        reorderLevel: 6
      },
      {
        name: 'Timing Belt Kit',
        sku: 'TB-1011',
        category: 'Belts & Hoses',
        price: 89.99,
        stock: 5, // Low stock
        description: 'Complete timing belt kit with tensioners and water pump',
        reorderLevel: 4
      },
      {
        name: 'Power Steering Fluid',
        sku: 'PSF-6004',
        category: 'Fluids',
        price: 8.99,
        stock: 42,
        description: 'Universal power steering fluid',
        reorderLevel: 10
      },
      {
        name: 'Brake Fluid DOT 3',
        sku: 'BF-6005',
        category: 'Fluids',
        price: 7.99,
        stock: 36,
        description: 'DOT 3 brake fluid for most vehicles',
        reorderLevel: 15
      },
      {
        name: 'Wheel Bearing',
        sku: 'WB-2010',
        category: 'Chassis',
        price: 45.99,
        stock: 12,
        description: 'Front wheel bearing assembly',
        reorderLevel: 5
      }
    ];

    const createdItems = [];
    for (const itemData of inventoryItems) {
      // Check if item exists by SKU
      const existingItem = await Inventory.findOne({ sku: itemData.sku });
      if (!existingItem) {
        const item = await Inventory.create({
          ...itemData,
          userId: user._id
        });
        createdItems.push(item);
      } else {
        createdItems.push(existingItem);
      }
    }
    console.log(`Created/Found ${createdItems.length} inventory items`);

    // Initialize cash drawer if it doesn't exist
    const lastCashDrawer = await CashDrawer.findOne({ userId: user._id }).sort({ date: -1 });
    let currentBalance = 0;
    
    if (!lastCashDrawer) {
      // Initialize cash drawer with $200
      const initialization = await CashDrawer.create({
        userId: user._id,
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        previousBalance: 0,
        amount: 200,
        balance: 200,
        operation: 'initialization',
        notes: 'Initial cash drawer setup'
      });
      currentBalance = 200;
      console.log('Initialized cash drawer with $200');
    } else {
      currentBalance = lastCashDrawer.balance;
      console.log(`Using existing cash drawer with balance: $${currentBalance}`);
    }

    // Generate random dates within the last 30 days
    const getRandomDate = (daysAgo = 30) => {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
      return date;
    };

    // Create expenses with more detail
    const expenseCategories = [
      {
        name: 'Rent',
        descriptions: ['Monthly store rent', 'Warehouse space rental', 'Storage facility payment']
      },
      {
        name: 'Utilities',
        descriptions: ['Electricity bill', 'Water and sewage', 'Internet and phone service', 'Garbage collection'] 
      },
      {
        name: 'Salaries',
        descriptions: ['Staff payroll', 'Sales associate wages', 'Manager salary', 'Part-time employee wages']
      },
      {
        name: 'Supplies',
        descriptions: ['Office supplies', 'Cleaning supplies', 'Packaging materials', 'Store supplies']
      },
      {
        name: 'Marketing',
        descriptions: ['Local newspaper ad', 'Online advertising', 'Promotional flyers', 'Loyalty program costs']
      },
      {
        name: 'Insurance',
        descriptions: ['Business liability insurance', 'Property insurance', 'Vehicle insurance', 'Workers compensation']
      },
      {
        name: 'Maintenance',
        descriptions: ['Store repairs', 'Equipment maintenance', 'Software subscription', 'Security system upkeep']
      },
      {
        name: 'Vehicle',
        descriptions: ['Delivery van maintenance', 'Fuel costs', 'Vehicle registration', 'Fleet insurance']
      },
      {
        name: 'Professional Fees',
        descriptions: ['Accounting services', 'Legal consultation', 'IT support', 'Bookkeeping services']
      }
    ];
    
    const expenses = [];
    
    // Create historical expenses (last 30 days)
    for (let i = 0; i < 15; i++) {
      const categoryObject = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
      const amount = parseFloat((Math.random() * 200 + 50).toFixed(2));
      const description = categoryObject.descriptions[Math.floor(Math.random() * categoryObject.descriptions.length)];
      const date = getRandomDate();
      
      // Create expense record
      const expense = await Expense.create({
        category: categoryObject.name,
        description,
        amount,
        paymentMethod: Math.random() > 0.3 ? 'Cash' : 'Credit Card',
        status: 'Paid',
        date,
        userId: user._id
      });
      
      // Create cash drawer entry if paid in cash
      if (expense.paymentMethod === 'Cash') {
        currentBalance -= amount;
        await CashDrawer.create({
          userId: user._id,
          date,
          previousBalance: currentBalance + amount,
          amount: -amount,
          balance: currentBalance,
          operation: 'expense',
          reference: expense._id,
          notes: `Expense: ${categoryObject.name} - ${description}`
        });
      }
      
      expenses.push(expense);
    }
    
    // Create today's expenses
    const todayExpenses = [
      {
        category: 'Utilities',
        description: 'Electricity bill for current month',
        amount: 256.78,
        paymentMethod: 'Credit Card'
      },
      {
        category: 'Supplies',
        description: 'Receipt paper and shop supplies',
        amount: 43.25,
        paymentMethod: 'Cash'
      },
      {
        category: 'Marketing',
        description: 'Social media advertising',
        amount: 75.50,
        paymentMethod: 'Credit Card'
      }
    ];
    
    for (const expenseData of todayExpenses) {
      const todayExpense = await Expense.create({
        ...expenseData,
        status: 'Paid',
        date: new Date(),
        userId: user._id
      });
      
      // Create cash drawer entry if paid in cash
      if (todayExpense.paymentMethod === 'Cash') {
        currentBalance -= todayExpense.amount;
        await CashDrawer.create({
          userId: user._id,
          date: new Date(),
          previousBalance: currentBalance + todayExpense.amount,
          amount: -todayExpense.amount,
          balance: currentBalance,
          operation: 'expense',
          reference: todayExpense._id,
          notes: `Expense: ${todayExpense.category} - ${todayExpense.description}`
        });
      }
      
      expenses.push(todayExpense);
    }
    
    console.log(`Created ${expenses.length} expenses`);

    // Create sales
    const sales = [];
    
    // Create historical sales (last 30 days)
    for (let i = 0; i < 25; i++) {
      // Random number of items in this sale (1-5)
      const numItems = Math.floor(Math.random() * 5) + 1;
      const saleItems = [];
      let subtotal = 0;
      
      // Add random items to the sale
      for (let j = 0; j < numItems; j++) {
        const item = createdItems[Math.floor(Math.random() * createdItems.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        
        // Skip if the item is already out of stock or would go below 0
        if (item.stock < quantity) continue;
        
        saleItems.push({
          itemId: item._id,
          name: item.name,
          sku: item.sku,
          quantity,
          price: item.price
        });
        
        subtotal += item.price * quantity;
        
        // Update inventory quantity
        await Inventory.findByIdAndUpdate(item._id, {
          $inc: { stock: -quantity }
        });
      }
      
      // Skip if no items were added (all were out of stock)
      if (saleItems.length === 0) continue;
      
      // Apply random discount (0-10%)
      const discountPercent = Math.floor(Math.random() * 11);
      const discount = parseFloat((subtotal * (discountPercent / 100)).toFixed(2));
      const total = parseFloat((subtotal - discount).toFixed(2));
      
      // Calculate cash amount and change
      const cashAmount = parseFloat((Math.ceil(total / 5) * 5).toFixed(2)); // Round up to nearest $5
      const change = parseFloat((cashAmount - total).toFixed(2));
      
      const saleDate = getRandomDate();
      
      // Create sale record
      const sale = await Sales.create({
        items: saleItems,
        subtotal,
        discount,
        total,
        cashAmount,
        change,
        customerName: Math.random() > 0.7 ? ['John Doe', 'Jane Smith', 'Bob Johnson', 'Maria Garcia', 'Alex Chen', 'Tom Wilson', 'Linda Baker'][Math.floor(Math.random() * 7)] : '',
        userId: user._id,
        date: saleDate
      });
      
      // Add to cash drawer
      currentBalance += total;
      await CashDrawer.create({
        userId: user._id,
        date: saleDate,
        previousBalance: currentBalance - total,
        amount: total,
        balance: currentBalance,
        operation: 'sale',
        reference: sale._id,
        notes: `Sale: ${saleItems.length} items`
      });
      
      sales.push(sale);
    }
    
    // Create today's sales
    const customerNames = ['Michael Brown', 'Amanda Williams', 'Kevin Thomas', 'Patricia Davis', 'James Rodriguez', 'Elizabeth Taylor'];
    
    // Morning sales (3-4 transactions)
    const numMorningSales = Math.floor(Math.random() * 2) + 3;
    
    for (let i = 0; i < numMorningSales; i++) {
      const saleItems = [];
      let subtotal = 0;
      
      // Set specific items for today's sales
      const todayItems = [
        createdItems.find(item => item.sku === 'OF-2002'), // Oil Filter
        createdItems.find(item => item.sku === 'MO-6001'), // Motor Oil - 5W30
        createdItems.find(item => item.sku === 'SP-4001'), // Spark Plugs
        createdItems.find(item => item.sku === 'WB-5001'), // Wiper Blades
        createdItems.find(item => item.sku === 'FF-9002')  // Fuel Filter
      ].filter(item => item && item.stock > 0);
      
      // Add 1-3 items from today's common items
      const numItemsToAdd = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < numItemsToAdd; j++) {
        if (j >= todayItems.length) break;
        
        const item = todayItems[j];
        const quantity = Math.floor(Math.random() * 2) + 1;
        
        if (item.stock < quantity) continue;
        
        saleItems.push({
          itemId: item._id,
          name: item.name,
          sku: item.sku,
          quantity,
          price: item.price
        });
        
        subtotal += item.price * quantity;
        
        // Update inventory quantity
        await Inventory.findByIdAndUpdate(item._id, {
          $inc: { stock: -quantity }
        });
      }
      
      if (saleItems.length === 0) continue;
      
      // Apply discount (0-5%)
      const discountPercent = Math.floor(Math.random() * 6);
      const discount = parseFloat((subtotal * (discountPercent / 100)).toFixed(2));
      const total = parseFloat((subtotal - discount).toFixed(2));
      
      // Calculate cash amount and change
      const cashAmount = parseFloat((Math.ceil(total / 5) * 5).toFixed(2));
      const change = parseFloat((cashAmount - total).toFixed(2));
      
      // Create morning sale record - set time between 8am-12pm
      const todayMorning = new Date();
      todayMorning.setHours(8 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60), 0, 0);
      
      const sale = await Sales.create({
        items: saleItems,
        subtotal,
        discount,
        total,
        cashAmount,
        change,
        customerName: customerNames[Math.floor(Math.random() * customerNames.length)],
        userId: user._id,
        date: todayMorning
      });
      
      // Add to cash drawer
      currentBalance += total;
      await CashDrawer.create({
        userId: user._id,
        date: todayMorning,
        previousBalance: currentBalance - total,
        amount: total,
        balance: currentBalance,
        operation: 'sale',
        reference: sale._id,
        notes: `Sale: ${saleItems.length} items`
      });
      
      sales.push(sale);
    }
    
    // Afternoon sales (2-3 transactions)
    const numAfternoonSales = Math.floor(Math.random() * 2) + 2;
    
    for (let i = 0; i < numAfternoonSales; i++) {
      const saleItems = [];
      let subtotal = 0;
      
      // Try to include at least one high-value item for afternoon sales
      const highValueItems = createdItems.filter(item => 
        item.price > 50 && item.stock > 0
      );
      
      if (highValueItems.length > 0) {
        const highValueItem = highValueItems[Math.floor(Math.random() * highValueItems.length)];
        saleItems.push({
          itemId: highValueItem._id,
          name: highValueItem.name,
          sku: highValueItem.sku,
          quantity: 1,
          price: highValueItem.price
        });
        
        subtotal += highValueItem.price;
        
        // Update inventory quantity
        await Inventory.findByIdAndUpdate(highValueItem._id, {
          $inc: { stock: -1 }
        });
      }
      
      // Add 1-2 more random items
      const randomItems = createdItems.filter(item => 
        item.stock > 0 && 
        !saleItems.some(saleItem => saleItem.itemId.toString() === item._id.toString())
      );
      
      const additionalItems = Math.floor(Math.random() * 2) + 1;
      for (let j = 0; j < additionalItems; j++) {
        if (randomItems.length === 0) break;
        
        const randomIndex = Math.floor(Math.random() * randomItems.length);
        const item = randomItems[randomIndex];
        const quantity = Math.floor(Math.random() * 2) + 1;
        
        if (item.stock < quantity) continue;
        
        saleItems.push({
          itemId: item._id,
          name: item.name,
          sku: item.sku,
          quantity,
          price: item.price
        });
        
        subtotal += item.price * quantity;
        
        // Update inventory quantity
        await Inventory.findByIdAndUpdate(item._id, {
          $inc: { stock: -quantity }
        });
        
        // Remove this item from randomItems
        randomItems.splice(randomIndex, 1);
      }
      
      if (saleItems.length === 0) continue;
      
      // Afternoon sales might have slightly higher discounts (0-8%)
      const discountPercent = Math.floor(Math.random() * 9);
      const discount = parseFloat((subtotal * (discountPercent / 100)).toFixed(2));
      const total = parseFloat((subtotal - discount).toFixed(2));
      
      // Calculate cash amount and change
      const cashAmount = parseFloat((Math.ceil(total / 5) * 5).toFixed(2));
      const change = parseFloat((cashAmount - total).toFixed(2));
      
      // Create afternoon sale record - set time between 1pm-5pm
      const todayAfternoon = new Date();
      todayAfternoon.setHours(13 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60), 0, 0);
      
      const sale = await Sales.create({
        items: saleItems,
        subtotal,
        discount,
        total,
        cashAmount,
        change,
        customerName: Math.random() > 0.3 ? customerNames[Math.floor(Math.random() * customerNames.length)] : '',
        userId: user._id,
        date: todayAfternoon
      });
      
      // Add to cash drawer
      currentBalance += total;
      await CashDrawer.create({
        userId: user._id,
        date: todayAfternoon,
        previousBalance: currentBalance - total,
        amount: total,
        balance: currentBalance,
        operation: 'sale',
        reference: sale._id,
        notes: `Sale: ${saleItems.length} items`
      });
      
      sales.push(sale);
    }
    
    console.log(`Created ${sales.length} sales`);

    // Add cash drawer operations
    // Historical cash counts
    const countDates = [
      new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ];
    
    for (const date of countDates) {
      await CashDrawer.create({
        userId: user._id,
        date,
        previousBalance: currentBalance,
        amount: 0,
        balance: currentBalance,
        operation: 'count',
        notes: 'Weekly cash count'
      });
    }
    
    // Morning cash add
    const morningCashAdd = await CashDrawer.create({
      userId: user._id,
      date: new Date(new Date().setHours(8, 15, 0, 0)),
      previousBalance: currentBalance,
      amount: 100,
      balance: currentBalance + 100,
      operation: 'add',
      notes: 'Morning cash addition'
    });
    currentBalance += 100;
    
    // Mid-day count
    const middayCashCount = await CashDrawer.create({
      userId: user._id,
      date: new Date(new Date().setHours(12, 30, 0, 0)),
      previousBalance: currentBalance,
      amount: 0,
      balance: currentBalance,
      operation: 'count',
      notes: 'Mid-day cash verification'
    });
    
    console.log(`Added cash drawer operations`);

    // Update inventory status one more time to ensure consistency
    console.log('Updating inventory status based on stock levels...');
    const allInventory = await Inventory.find({});
    for (const item of allInventory) {
      if (item.stock <= 0) {
        await Inventory.findByIdAndUpdate(item._id, {
          status: 'Out of Stock'
        });
      } else if (item.stock <= item.reorderLevel) {
        await Inventory.findByIdAndUpdate(item._id, {
          status: 'Low Stock'
        });
      } else {
        await Inventory.findByIdAndUpdate(item._id, {
          status: 'In Stock'
        });
      }
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

// Run the seed function
seedData(); 
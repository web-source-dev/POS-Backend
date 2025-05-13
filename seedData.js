const mongoose = require('mongoose');
const User = require('./models/User');
const Inventory = require('./models/Inventory');
const Supplier = require('./models/Supplier');
const Sales = require('./models/Sales');
const Expense = require('./models/Expense');
const CashDrawer = require('./models/CashDrawer');
const Settings = require('./models/Settings');
const TaxSettings = require('./models/TaxSettings');
const Tax = require('./models/Tax');
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
      Settings.deleteMany({}),
      TaxSettings.deleteMany({}),
      Tax.deleteMany({})
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
        barcode: '7891234500123',
        category: 'Filters',
        subcategory: 'Engine Filters',
        brand: 'FilterPro',
        supplierName: 'OEM Auto Parts Inc.', // Store name for lookup
        price: 14.99,
        purchasePrice: 9.50,
        stock: 45,
        description: 'High-quality air filter for most sedan models',
        status: 'In Stock',
        reorderLevel: 10,
        location: 'Aisle 3, Shelf B',
        unitOfMeasure: 'each',
        weight: 0.5,
        dimensions: {
          length: 25,
          width: 20,
          height: 3
        },
        tags: ['filter', 'engine', 'maintenance'],
        taxRate: 17
      },
      {
        name: 'Oil Filter',
        sku: 'OF-2002',
        barcode: '7891234500124',
        category: 'Filters',
        subcategory: 'Engine Filters',
        brand: 'FilterPro',
        supplierName: 'OEM Auto Parts Inc.', // Store name for lookup
        price: 8.99,
        purchasePrice: 5.25,
        stock: 62,
        description: 'Premium oil filter with anti-drain back valve',
        status: 'In Stock',
        reorderLevel: 15,
        location: 'Aisle 3, Shelf A',
        unitOfMeasure: 'each',
        weight: 0.3,
        dimensions: {
          length: 10,
          width: 10,
          height: 12
        },
        tags: ['filter', 'engine', 'oil', 'maintenance'],
        taxRate: 17
      },
      {
        name: 'Brake Pads (Front)',
        sku: 'BP-3003',
        barcode: '7891234500125',
        category: 'Brakes',
        subcategory: 'Brake Pads',
        subcategory2: 'Front',
        brand: 'StopRight',
        supplierName: 'Precision Parts Supply', // Store name for lookup
        price: 39.99,
        purchasePrice: 25.50,
        stock: 23,
        description: 'Ceramic front brake pads - fits most domestic models',
        status: 'In Stock',
        reorderLevel: 8,
        location: 'Aisle 5, Shelf C',
        unitOfMeasure: 'pair',
        weight: 1.2,
        dimensions: {
          length: 15,
          width: 12,
          height: 4
        },
        tags: ['brakes', 'safety', 'ceramic'],
        taxRate: 17
      },
      {
        name: 'Brake Pads (Rear)',
        sku: 'BP-3004',
        barcode: '7891234500126',
        category: 'Brakes',
        subcategory: 'Brake Pads',
        subcategory2: 'Rear',
        brand: 'StopRight',
        supplierName: 'Precision Parts Supply', // Store name for lookup
        price: 34.99,
        purchasePrice: 22.75,
        stock: 0, // Out of stock
        description: 'Ceramic rear brake pads - fits most domestic models',
        status: 'Out of Stock',
        reorderLevel: 8,
        location: 'Aisle 5, Shelf C',
        unitOfMeasure: 'pair',
        weight: 1.0,
        dimensions: {
          length: 14,
          width: 10,
          height: 4
        },
        tags: ['brakes', 'safety', 'ceramic'],
        taxRate: 17
      },
      {
        name: 'Brake Rotor',
        sku: 'BR-3005',
        barcode: '7891234500127',
        category: 'Brakes',
        subcategory: 'Rotors',
        brand: 'StopRight',
        supplierName: 'Precision Parts Supply', // Store name for lookup
        price: 29.99,
        purchasePrice: 18.25,
        stock: 12,
        description: 'Standard replacement brake rotor',
        status: 'In Stock',
        reorderLevel: 5,
        location: 'Aisle 5, Shelf D',
        unitOfMeasure: 'each',
        weight: 5.2,
        dimensions: {
          length: 30,
          width: 30,
          height: 5
        },
        tags: ['brakes', 'rotors', 'safety'],
        taxRate: 17
      },
      {
        name: 'Spark Plugs (Set of 4)',
        sku: 'SP-4001',
        barcode: '7891234500128',
        category: 'Ignition',
        subcategory: 'Spark Plugs',
        brand: 'FireStarter',
        supplierName: 'Global Auto Suppliers', // Store name for lookup
        price: 24.99,
        purchasePrice: 14.75,
        stock: 35,
        description: 'Platinum spark plugs for improved performance',
        status: 'In Stock',
        reorderLevel: 10,
        location: 'Aisle 2, Shelf A',
        unitOfMeasure: 'set',
        weight: 0.4,
        dimensions: {
          length: 10,
          width: 10,
          height: 5
        },
        tags: ['ignition', 'engine', 'performance'],
        taxRate: 17
      },
      {
        name: 'Ignition Coil',
        sku: 'IC-4002',
        barcode: '7891234500129',
        category: 'Ignition',
        subcategory: 'Coils',
        brand: 'PowerSpark',
        supplierName: 'Global Auto Suppliers', // Store name for lookup
        price: 49.99,
        purchasePrice: 32.50,
        stock: 15,
        description: 'Direct replacement ignition coil',
        status: 'In Stock',
        reorderLevel: 5,
        location: 'Aisle 2, Shelf B',
        unitOfMeasure: 'each',
        weight: 0.6,
        dimensions: {
          length: 8,
          width: 6,
          height: 10
        },
        tags: ['ignition', 'engine', 'electrical'],
        taxRate: 17
      },
      {
        name: 'Wiper Blades',
        sku: 'WB-5001',
        barcode: '7891234500130',
        category: 'Accessories',
        subcategory: 'Wipers',
        brand: 'ClearView',
        supplierName: 'Aftermarket Kings', // Store name for lookup
        price: 19.99,
        purchasePrice: 11.25,
        stock: 42,
        description: 'All-season wiper blades (20" pair)',
        status: 'In Stock',
        reorderLevel: 12,
        location: 'Aisle 1, Shelf C',
        unitOfMeasure: 'pair',
        weight: 0.8,
        dimensions: {
          length: 50,
          width: 3,
          height: 2
        },
        tags: ['wipers', 'visibility', 'safety'],
        taxRate: 17
      },
      {
        name: 'Motor Oil - 5W30 (1 qt)',
        sku: 'MO-6001',
        barcode: '7891234500131',
        category: 'Fluids',
        subcategory: 'Engine Oil',
        brand: 'LubeMax',
        supplierName: 'OEM Auto Parts Inc.', // Store name for lookup
        price: 6.99,
        purchasePrice: 4.25,
        stock: 75,
        description: 'Synthetic blend motor oil - 5W30 weight',
        status: 'In Stock',
        reorderLevel: 20,
        location: 'Aisle 4, Shelf A',
        unitOfMeasure: 'quart',
        weight: 0.95,
        dimensions: {
          length: 10,
          width: 7,
          height: 18
        },
        tags: ['oil', 'engine', 'maintenance'],
        taxRate: 17
      },
      {
        name: 'Motor Oil - 10W30 (1 qt)',
        sku: 'MO-6002',
        barcode: '7891234500132',
        category: 'Fluids',
        subcategory: 'Engine Oil',
        brand: 'LubeMax',
        supplierName: 'OEM Auto Parts Inc.', // Store name for lookup
        price: 6.99,
        purchasePrice: 4.25,
        stock: 68,
        description: 'Synthetic blend motor oil - 10W30 weight',
        status: 'In Stock',
        reorderLevel: 20,
        location: 'Aisle 4, Shelf A',
        unitOfMeasure: 'quart',
        weight: 0.95,
        dimensions: {
          length: 10,
          width: 7,
          height: 18
        },
        tags: ['oil', 'engine', 'maintenance'],
        taxRate: 17
      },
      {
        name: 'Transmission Fluid (1 qt)',
        sku: 'TF-6003',
        barcode: '7891234500133',
        category: 'Fluids',
        subcategory: 'Transmission',
        brand: 'LubeMax',
        supplierName: 'OEM Auto Parts Inc.', // Store name for lookup
        price: 9.99,
        purchasePrice: 6.50,
        stock: 0, // Out of stock
        description: 'Automatic transmission fluid',
        status: 'Out of Stock',
        reorderLevel: 12,
        location: 'Aisle 4, Shelf B',
        unitOfMeasure: 'quart',
        weight: 0.95,
        dimensions: {
          length: 10,
          width: 7,
          height: 18
        },
        tags: ['transmission', 'fluid', 'maintenance'],
        taxRate: 17
      },
      {
        name: 'Alternator',
        sku: 'AL-7001',
        barcode: '7891234500134',
        category: 'Electrical',
        subcategory: 'Charging System',
        brand: 'PowerGen',
        supplierName: 'Global Auto Suppliers', // Store name for lookup
        price: 129.99,
        purchasePrice: 85.50,
        stock: 0, // Out of stock
        description: 'Remanufactured alternator for most domestic vehicles',
        status: 'Out of Stock',
        reorderLevel: 3,
        location: 'Aisle 6, Shelf A',
        unitOfMeasure: 'each',
        weight: 4.8,
        dimensions: {
          length: 20,
          width: 15,
          height: 15
        },
        tags: ['electrical', 'charging', 'engine'],
        taxRate: 17
      },
      {
        name: 'Battery',
        sku: 'BA-7002',
        barcode: '7891234500135',
        category: 'Electrical',
        subcategory: 'Batteries',
        brand: 'PowerCell',
        supplierName: 'Global Auto Suppliers', // Store name for lookup
        price: 89.99,
        purchasePrice: 59.75,
        stock: 14,
        description: '12V automotive battery, 600 CCA',
        status: 'In Stock',
        reorderLevel: 5,
        location: 'Aisle 6, Shelf B',
        unitOfMeasure: 'each',
        weight: 18.5,
        dimensions: {
          length: 25,
          width: 17,
          height: 20
        },
        tags: ['electrical', 'battery', 'starting'],
        taxRate: 17
      },
      {
        name: 'Headlight Bulb',
        sku: 'HL-7003',
        barcode: '7891234500136',
        category: 'Electrical',
        subcategory: 'Lighting',
        brand: 'BrightBeam',
        supplierName: 'Aftermarket Kings', // Store name for lookup
        price: 12.99,
        purchasePrice: 7.50,
        stock: 4, // Low stock
        description: 'Standard replacement halogen headlight bulb',
        status: 'Low Stock',
        reorderLevel: 8,
        location: 'Aisle 6, Shelf D',
        unitOfMeasure: 'each',
        weight: 0.1,
        dimensions: {
          length: 5,
          width: 5,
          height: 10
        },
        tags: ['electrical', 'lighting', 'visibility'],
        taxRate: 17
      },
      {
        name: 'Radiator',
        sku: 'RA-8001',
        barcode: '7891234500137',
        category: 'Cooling',
        subcategory: 'Radiators',
        brand: 'CoolFlow',
        supplierName: 'Precision Parts Supply', // Store name for lookup
        price: 119.99,
        purchasePrice: 78.50,
        stock: 6,
        description: 'Aluminum radiator for standard sedans',
        status: 'In Stock',
        reorderLevel: 2,
        location: 'Aisle 7, Shelf A',
        unitOfMeasure: 'each',
        weight: 7.2,
        dimensions: {
          length: 65,
          width: 45,
          height: 5
        },
        tags: ['cooling', 'engine', 'radiator'],
        taxRate: 17
      },
      {
        name: 'Radiator Hose',
        sku: 'RH-8002',
        barcode: '7891234500138',
        category: 'Cooling',
        subcategory: 'Hoses',
        brand: 'FlexTube',
        supplierName: 'Precision Parts Supply', // Store name for lookup
        price: 18.99,
        purchasePrice: 10.75,
        stock: 3, // Low stock
        description: 'Upper radiator hose - universal fit',
        status: 'Low Stock',
        reorderLevel: 7,
        location: 'Aisle 7, Shelf B',
        unitOfMeasure: 'each',
        weight: 0.5,
        dimensions: {
          length: 40,
          width: 5,
          height: 5
        },
        tags: ['cooling', 'hose', 'rubber'],
        taxRate: 17
      },
      {
        name: 'Thermostat',
        sku: 'TS-8003',
        barcode: '7891234500139',
        category: 'Cooling',
        subcategory: 'Temperature Control',
        brand: 'TempMaster',
        supplierName: 'OEM Auto Parts Inc.', // Store name for lookup
        price: 9.99,
        purchasePrice: 5.25,
        stock: 31,
        description: 'Engine thermostat - 195°F',
        status: 'In Stock',
        reorderLevel: 10,
        location: 'Aisle 7, Shelf C',
        unitOfMeasure: 'each',
        weight: 0.2,
        dimensions: {
          length: 7,
          width: 7,
          height: 3
        },
        tags: ['cooling', 'temperature', 'engine'],
        taxRate: 17
      },
      {
        name: 'Fuel Pump',
        sku: 'FP-9001',
        barcode: '7891234500140',
        category: 'Fuel System',
        subcategory: 'Pumps',
        brand: 'FlowForce',
        supplierName: 'Global Auto Suppliers', // Store name for lookup
        price: 79.99,
        purchasePrice: 52.50,
        stock: 0, // Out of stock
        description: 'Electric fuel pump assembly',
        status: 'Out of Stock',
        reorderLevel: 4,
        location: 'Aisle 8, Shelf A',
        unitOfMeasure: 'each',
        weight: 1.8,
        dimensions: {
          length: 15,
          width: 10,
          height: 10
        },
        tags: ['fuel', 'pump', 'electrical'],
        taxRate: 17
      },
      {
        name: 'Fuel Filter',
        sku: 'FF-9002',
        barcode: '7891234500141',
        category: 'Fuel System',
        subcategory: 'Filters',
        brand: 'FilterPro',
        supplierName: 'OEM Auto Parts Inc.', // Store name for lookup
        price: 14.99,
        purchasePrice: 8.75,
        stock: 27,
        description: 'In-line fuel filter for most vehicles',
        status: 'In Stock',
        reorderLevel: 8,
        location: 'Aisle 8, Shelf B',
        unitOfMeasure: 'each',
        weight: 0.3,
        dimensions: {
          length: 12,
          width: 5,
          height: 5
        },
        tags: ['fuel', 'filter', 'maintenance'],
        taxRate: 17
      },
      {
        name: 'Oxygen Sensor',
        sku: 'OS-9003',
        barcode: '7891234500142',
        category: 'Fuel System',
        subcategory: 'Sensors',
        brand: 'SensorTech',
        supplierName: 'Precision Parts Supply', // Store name for lookup
        price: 39.99,
        purchasePrice: 25.50,
        stock: 16,
        description: 'Upstream oxygen sensor (O2 sensor)',
        status: 'In Stock',
        reorderLevel: 5,
        location: 'Aisle 8, Shelf C',
        unitOfMeasure: 'each',
        weight: 0.3,
        dimensions: {
          length: 10,
          width: 3,
          height: 3
        },
        tags: ['emissions', 'sensor', 'fuel'],
        taxRate: 17
      },
      {
        name: 'Serpentine Belt',
        sku: 'SB-1010',
        barcode: '7891234500143',
        category: 'Belts & Hoses',
        subcategory: 'Belts',
        brand: 'DuraDrive',
        supplierName: 'Truck Parts Warehouse', // Store name for lookup
        price: 22.99,
        purchasePrice: 14.50,
        stock: 18,
        description: 'Standard serpentine belt - multi-vehicle fit',
        status: 'In Stock',
        reorderLevel: 6,
        location: 'Aisle 9, Shelf A',
        unitOfMeasure: 'each',
        weight: 0.5,
        dimensions: {
          length: 30,
          width: 2,
          height: 1
        },
        tags: ['belt', 'engine', 'drive'],
        taxRate: 17
      },
      {
        name: 'Timing Belt Kit',
        sku: 'TB-1011',
        barcode: '7891234500144',
        category: 'Belts & Hoses',
        subcategory: 'Timing Components',
        brand: 'DuraDrive',
        supplierName: 'Truck Parts Warehouse', // Store name for lookup
        price: 89.99,
        purchasePrice: 60.25,
        stock: 5, // Low stock
        description: 'Complete timing belt kit with tensioners and water pump',
        status: 'Low Stock',
        reorderLevel: 4,
        location: 'Aisle 9, Shelf B',
        unitOfMeasure: 'kit',
        weight: 2.5,
        dimensions: {
          length: 30,
          width: 25,
          height: 10
        },
        tags: ['timing', 'belt', 'maintenance'],
        taxRate: 17
      },
      {
        name: 'Power Steering Fluid',
        sku: 'PSF-6004',
        barcode: '7891234500145',
        category: 'Fluids',
        subcategory: 'Steering',
        brand: 'LubeMax',
        supplierName: 'OEM Auto Parts Inc.', // Store name for lookup
        price: 8.99,
        purchasePrice: 5.25,
        stock: 42,
        description: 'Universal power steering fluid',
        status: 'In Stock',
        reorderLevel: 10,
        location: 'Aisle 4, Shelf C',
        unitOfMeasure: 'quart',
        weight: 0.95,
        dimensions: {
          length: 10,
          width: 7,
          height: 18
        },
        tags: ['steering', 'fluid', 'hydraulic'],
        taxRate: 17
      },
      {
        name: 'Brake Fluid DOT 3',
        sku: 'BF-6005',
        barcode: '7891234500146',
        category: 'Fluids',
        subcategory: 'Brake Fluid',
        brand: 'BrakeMaster',
        supplierName: 'Precision Parts Supply', // Store name for lookup
        price: 7.99,
        purchasePrice: 4.50,
        stock: 36,
        description: 'DOT 3 brake fluid for most vehicles',
        status: 'In Stock',
        reorderLevel: 15,
        location: 'Aisle 4, Shelf D',
        unitOfMeasure: 'pint',
        weight: 0.5,
        dimensions: {
          length: 8,
          width: 6,
          height: 15
        },
        tags: ['brakes', 'fluid', 'hydraulic'],
        taxRate: 17
      },
      {
        name: 'Wheel Bearing',
        sku: 'WB-2010',
        barcode: '7891234500147',
        category: 'Chassis',
        subcategory: 'Wheel Components',
        brand: 'RollerPro',
        supplierName: 'European Parts Specialists', // Store name for lookup
        price: 45.99,
        purchasePrice: 30.25,
        stock: 12,
        description: 'Front wheel bearing assembly',
        status: 'In Stock',
        reorderLevel: 5,
        location: 'Aisle 10, Shelf A',
        unitOfMeasure: 'each',
        weight: 1.2,
        dimensions: {
          length: 12,
          width: 12,
          height: 4
        },
        tags: ['wheel', 'bearing', 'suspension'],
        taxRate: 17
      },
      {
        name: 'Shock Absorber',
        sku: 'SA-2011',
        barcode: '7891234500148',
        category: 'Suspension',
        subcategory: 'Shocks',
        brand: 'RideSoft',
        supplierName: 'European Parts Specialists', // Store name for lookup
        price: 59.99,
        purchasePrice: 38.50,
        stock: 8,
        description: 'Front shock absorber - fits most mid-size sedans',
        status: 'In Stock',
        reorderLevel: 4,
        location: 'Aisle 10, Shelf B',
        unitOfMeasure: 'each',
        weight: 2.8,
        dimensions: {
          length: 50,
          width: 10,
          height: 10
        },
        tags: ['suspension', 'shock', 'handling'],
        taxRate: 17
      },
      {
        name: 'Air Conditioning Compressor',
        sku: 'AC-3001',
        barcode: '7891234500149',
        category: 'Climate Control',
        subcategory: 'A/C Components',
        brand: 'CoolTech',
        supplierName: 'Global Auto Suppliers', // Store name for lookup
        price: 199.99,
        purchasePrice: 135.50,
        stock: 6,
        description: 'Remanufactured A/C compressor for domestic vehicles',
        status: 'In Stock',
        reorderLevel: 3,
        location: 'Aisle 11, Shelf A',
        unitOfMeasure: 'each',
        weight: 8.5,
        dimensions: {
          length: 20,
          width: 18,
          height: 15
        },
        tags: ['ac', 'climate', 'comfort'],
        taxRate: 17
      }
    ];

    const createdItems = [];
    for (const itemData of inventoryItems) {
      // Check if item exists by SKU
      const existingItem = await Inventory.findOne({ sku: itemData.sku });
      if (!existingItem) {
        // Find the supplier by name and get its ID
        const supplierName = itemData.supplierName;
        const supplier = createdSuppliers.find(s => s.name === supplierName);
        
        // Create a new object without supplierName but with the supplier ID
        const newItemData = { ...itemData };
        delete newItemData.supplierName;
        newItemData.supplier = supplier ? supplier._id : null;
        
        const item = await Inventory.create({
          ...newItemData,
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

    // Create tax settings if they don't exist
    const existingTaxSettings = await TaxSettings.findOne({ userId: user._id });
    if (!existingTaxSettings) {
      await TaxSettings.create({
        userId: user._id,
        businessType: 'Sole Proprietor',
        taxIdentificationNumber: 'TIN-12345678',
        nationalTaxNumber: 'NTN-87654321',
        salesTaxEnabled: true,
        salesTaxRate: 17, // Standard GST rate in Pakistan
        salesTaxIncludedInPrice: false,
        incomeTaxEnabled: true,
        useDefaultTaxSlabs: true,
        customTaxSlabs: [
          {
            minIncome: 0,
            maxIncome: 600000,
            fixedAmount: 0,
            rate: 0,
            description: 'No tax up to Rs. 600,000'
          },
          {
            minIncome: 600001,
            maxIncome: 1200000,
            fixedAmount: 0,
            rate: 5,
            description: '5% of amount exceeding Rs. 600,000'
          },
          {
            minIncome: 1200001,
            maxIncome: 2400000,
            fixedAmount: 30000,
            rate: 10,
            description: 'Rs. 30,000 + 10% of amount exceeding Rs. 1,200,000'
          },
          {
            minIncome: 2400001,
            maxIncome: 3600000,
            fixedAmount: 150000,
            rate: 15,
            description: 'Rs. 150,000 + 15% of amount exceeding Rs. 2,400,000'
          },
          {
            minIncome: 3600001,
            maxIncome: 6000000,
            fixedAmount: 330000,
            rate: 20,
            description: 'Rs. 330,000 + 20% of amount exceeding Rs. 3,600,000'
          }
        ],
        zakatEnabled: true,
        zakatCalculationType: 'Automatic',
        zakatRate: 2.5,
        zakatExemptCategories: ['Business Assets', 'Tools of Trade'],
        taxFilingPeriods: {
          incomeTax: 'Annually',
          salesTax: 'Monthly',
          zakat: 'Annually'
        },
        enableTaxReminders: true,
        reminderDays: 7
      });
      console.log('Created tax settings');
    } else {
      console.log('Tax settings already exist, skipping...');
    }

    // Create sample tax records
    const taxTypes = ['Income Tax', 'Sales Tax', 'Zakat'];
    const taxStatuses = ['Paid', 'Pending', 'Partially Paid'];
    const paymentMethods = ['Bank Transfer', 'Check', 'Online'];
    
    // Create a few tax entries
    const taxes = [];
    
    // Create one Income Tax entry for the previous year
    const lastYearStart = new Date();
    lastYearStart.setFullYear(lastYearStart.getFullYear() - 1, 0, 1); // Jan 1st last year
    
    const lastYearEnd = new Date();
    lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1, 11, 31); // Dec 31st last year
    
    const incomeTax = await Tax.create({
      userId: user._id,
      type: 'Income Tax',
      taxableAmount: 3250000, // 3.25 million PKR annual income
      taxRate: 15,
      taxAmount: 277500, // Calculated based on tax slabs
      description: 'Annual income tax filing',
      paymentStatus: 'Paid',
      paidAmount: 277500,
      paymentDate: new Date(lastYearEnd.getTime() + 75 * 24 * 60 * 60 * 1000), // 75 days after year end
      paymentMethod: 'Bank Transfer',
      taxPeriod: {
        startDate: lastYearStart,
        endDate: lastYearEnd
      },
      reference: 'ITX-2022-001',
      isManualEntry: false,
      isFinalAssessment: true
    });
    taxes.push(incomeTax);
    
    // Create quarterly Sales Tax entries
    for (let i = 0; i < 3; i++) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3 * (i + 1));
      startDate.setDate(1);
      
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 3);
      endDate.setDate(0);
      
      const taxAmount = 45000 + Math.floor(Math.random() * 15000);
      const status = i === 0 ? 'Pending' : 'Paid';
      
      const salesTax = await Tax.create({
        userId: user._id,
        type: 'Sales Tax',
        taxableAmount: taxAmount * 100 / 17, // Reverse calculate from 17% GST
        taxRate: 17,
        taxAmount: taxAmount,
        description: `Quarterly sales tax filing Q${4-i}`,
        paymentStatus: status,
        paidAmount: status === 'Paid' ? taxAmount : 0,
        paymentDate: status === 'Paid' ? new Date(endDate.getTime() + 15 * 24 * 60 * 60 * 1000) : null,
        paymentMethod: status === 'Paid' ? paymentMethods[Math.floor(Math.random() * paymentMethods.length)] : null,
        taxPeriod: {
          startDate,
          endDate
        },
        reference: `STX-${startDate.getFullYear()}-Q${4-i}`,
        isManualEntry: false,
        isFinalAssessment: true
      });
      taxes.push(salesTax);
    }
    
    // Create a Zakat entry
    const zakatStartDate = new Date();
    zakatStartDate.setMonth(0, 1); // January 1st current year
    
    const zakatEndDate = new Date();
    zakatEndDate.setMonth(11, 31); // December 31st current year
    
    const zakat = await Tax.create({
      userId: user._id,
      type: 'Zakat',
      taxableAmount: 1500000, // 1.5 million PKR in eligible assets
      taxRate: 2.5,
      taxAmount: 37500, // 2.5% of 1.5 million
      description: 'Annual Zakat payment on business assets',
      paymentStatus: 'Partially Paid',
      paidAmount: 20000,
      paymentDate: null,
      paymentMethod: null,
      taxPeriod: {
        startDate: zakatStartDate,
        endDate: zakatEndDate
      },
      reference: `ZKT-${zakatStartDate.getFullYear()}-001`,
      isManualEntry: true,
      isFinalAssessment: false
    });
    taxes.push(zakat);
    
    console.log(`Created ${taxes.length} tax records`);

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
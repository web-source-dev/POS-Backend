const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  subcategory2: {
    type: String,
    trim: true
  },
  categoryPath: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  vehicleName: {
    type: String,
    trim: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  purchasePrice: {
    type: Number,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['In Stock', 'Low Stock', 'Out of Stock'],
    default: 'In Stock'
  },
  reorderLevel: {
    type: Number,
    default: 5
  },
  location: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String,
    trim: true
  },
  expiryDate: {
    type: Date
  },
  unitOfMeasure: {
    type: String,
    default: 'each',
    trim: true
  },
  measureValue: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  taxRate: {
    type: Number,
    default: 0,
    min: 0
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add a virtual field for profit margin
inventorySchema.virtual('profitMargin').get(function() {
  if (!this.purchasePrice || this.purchasePrice === 0) return null;
  return ((this.price - this.purchasePrice) / this.price) * 100;
});

// Add a virtual field for inventory value
inventorySchema.virtual('inventoryValue').get(function() {
  return this.stock * this.price;
});

// Pre-save hook to update status based on stock level and generate categoryPath
inventorySchema.pre('save', function(next) {
  if (this.isModified('stock')) {
    if (this.stock <= 0) {
      this.status = 'Out of Stock';
    } else if (this.stock <= this.reorderLevel) {
      this.status = 'Low Stock';
    } else {
      this.status = 'In Stock';
    }
  }
  
  // Generate the categoryPath string
  const pathParts = [this.category];
  if (this.subcategory) pathParts.push(this.subcategory);
  if (this.subcategory2) pathParts.push(this.subcategory2);
  this.categoryPath = pathParts.join(' > ');
  
  this.updatedAt = Date.now();
  next();
});

// Set toJSON to include virtuals
inventorySchema.set('toJSON', { virtuals: true });
inventorySchema.set('toObject', { virtuals: true });

const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = Inventory; 
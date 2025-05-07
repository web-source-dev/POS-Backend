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
  price: {
    type: Number,
    required: true,
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

// Pre-save hook to update status based on stock level
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
  
  this.updatedAt = Date.now();
  next();
});

const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = Inventory; 
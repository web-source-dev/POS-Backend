const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  sku: {
    type: String
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
});

const salesSchema = new mongoose.Schema({
  receiptNumber: {
    type: String,
    required: true,
    default: '#000001'
  },
  receiptNumberValue: {
    type: Number,
    required: true,
    default: 1
  },
  items: [saleItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  cashAmount: {
    type: Number,
    required: true,
    min: 0
  },
  change: {
    type: Number,
    required: true,
    min: 0
  },
  customerName: {
    type: String,
    default: ''
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  printed: {
    type: Boolean,
    default: false
  }
});

// Static method to get the next receipt number for a specific user
salesSchema.statics.getNextReceiptNumber = async function(userId) {
  if (!userId) {
    throw new Error('User ID is required to generate receipt number');
  }
  
  const lastSale = await this.findOne({ userId: userId }).sort({ receiptNumberValue: -1 });
  const nextNumberValue = lastSale ? lastSale.receiptNumberValue + 1 : 1;
  const formattedNumber = `#${String(nextNumberValue).padStart(6, '0')}`;
  
  return {
    receiptNumber: formattedNumber,
    receiptNumberValue: nextNumberValue
  };
};

const Sales = mongoose.model('Sales', salesSchema);

module.exports = Sales; 
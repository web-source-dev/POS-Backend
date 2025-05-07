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
  }
});

const Sales = mongoose.model('Sales', salesSchema);

module.exports = Sales; 
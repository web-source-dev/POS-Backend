const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  expenseId: {
    type: String,
    unique: true,
    default: function() {
      return 'EXP-' + new mongoose.Types.ObjectId().toString().substr(-8).toUpperCase();
    }
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    default: 'Cash',
    enum: ['Cash', 'Credit Card', 'Bank Transfer', 'Check', 'Other']
  },
  status: {
    type: String,
    default: 'Paid',
    enum: ['Paid', 'Pending', 'Cancelled']
  },
  date: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense; 
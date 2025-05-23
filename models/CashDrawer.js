const mongoose = require('mongoose');

const cashDrawerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  previousBalance: {
    type: Number,
    required: true,
    default: 0
  },
  amount: {
    type: Number,
    required: true,
    default: 0
  },
  balance: {
    type: Number,
    required: true
  },
  operation: {
    type: String,
    required: true,
    enum: ['add', 'remove', 'count', 'sale', 'expense', 'initialization', 'close']
  },
  reference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reference',
    default: null
  },
  notes: {
    type: String,
    default: ''
  }
});

// Define indexes for efficient querying
cashDrawerSchema.index({ userId: 1, date: -1 }, { background: true });
cashDrawerSchema.index({ date: -1 });
cashDrawerSchema.index({ userId: 1, operation: 1 });

// Pre-save hook to ensure balance is calculated correctly
cashDrawerSchema.pre('save', function(next) {
  // For safety, ensure balance is always calculated based on previousBalance and amount
  if (this.operation === 'add' || this.operation === 'sale' || this.operation === 'initialization') {
    // For operations that add money, add the amount to previous balance
    this.balance = this.previousBalance + this.amount;
  } else if (this.operation === 'remove' || this.operation === 'expense') {
    // For operations that remove money, subtract the amount from previous balance
    this.balance = this.previousBalance - this.amount;
  } else if (this.operation === 'count') {
    // For count operations, balance is directly set to amount (count result)
    this.balance = this.amount;
  }
  next();
});

const CashDrawer = mongoose.model('CashDrawer', cashDrawerSchema);

// Only execute this function if there's a specific need to clean up old indexes
// Not during standard application startup
const setupIndexes = async () => {
  try {
    console.log('Starting CashDrawer index management...');
    // Use a timeout promise to avoid long-running operations
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Index operation timed out')), 30000);
    });
    
    // The main index operation
    const indexOperation = async () => {
      const collection = CashDrawer.collection;
      const indexes = await collection.indexes();
      
      // Find any unique index on userId
      const uniqueUserIdIndex = indexes.find(
        index => index.key.userId === 1 && index.unique === true
      );
      
      if (uniqueUserIdIndex) {
        console.log('Dropping unique userId index from CashDrawer collection...');
        await collection.dropIndex(uniqueUserIdIndex.name);
        console.log('Successfully dropped unique userId index');
      } else {
        console.log('No unique userId index found, no need to drop');
      }
      
      return 'Index operation completed successfully';
    };
    
    // Race the operations
    const result = await Promise.race([indexOperation(), timeoutPromise]);
    console.log(result);
  } catch (error) {
    console.error('Error managing CashDrawer indexes:', error);
    // Operation failed but this shouldn't block application startup
  }
};

// We don't call setupIndexes() automatically here
// Instead it should be called after mongoose connection is established

module.exports = CashDrawer; 
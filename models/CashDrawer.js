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

// Explicitly remove any unique constraint that might exist on userId
// Create index on userId and date for efficient queries, but NOT a unique index
cashDrawerSchema.index({ date: -1 });
cashDrawerSchema.index({ userId: 1, date: -1 }, { unique: false });

const CashDrawer = mongoose.model('CashDrawer', cashDrawerSchema);

// Function to ensure indexes are correctly set up
const setupIndexes = async () => {
  try {
    // Drop any existing unique index on userId if it exists
    const collection = CashDrawer.collection;
    const indexes = await collection.indexes();
    
    // Find any unique index on userId
    const uniqueUserIdIndex = indexes.find(
      index => index.key.userId === 1 && index.unique === true
    );
    
    if (uniqueUserIdIndex) {
      console.log('Dropping unique userId index from CashDrawer collection...');
      await collection.dropIndex('userId_1');
      console.log('Successfully dropped unique userId index');
    }
  } catch (error) {
    console.error('Error managing CashDrawer indexes:', error);
  }
};

// Execute the index setup
setupIndexes();

module.exports = CashDrawer; 
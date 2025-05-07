const mongoose = require('mongoose');

const taxSettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // General tax settings
  businessType: {
    type: String,
    enum: ['Sole Proprietor', 'Partnership', 'Private Limited', 'Public Limited', 'Other'],
    default: 'Sole Proprietor'
  },
  taxIdentificationNumber: {
    type: String,
    trim: true
  },
  nationalTaxNumber: {
    type: String,
    trim: true
  },
  
  // Sales tax settings
  salesTaxEnabled: {
    type: Boolean,
    default: true
  },
  salesTaxRate: {
    type: Number,
    default: 17, // Default GST in Pakistan
    min: 0,
    max: 100
  },
  salesTaxIncludedInPrice: {
    type: Boolean,
    default: false
  },
  
  // Income tax settings
  incomeTaxEnabled: {
    type: Boolean,
    default: true
  },
  useDefaultTaxSlabs: {
    type: Boolean,
    default: true
  },
  customTaxSlabs: [{
    minIncome: Number,
    maxIncome: Number,
    fixedAmount: Number,
    rate: Number,
    description: String
  }],
  
  // Zakat settings
  zakatEnabled: {
    type: Boolean,
    default: true
  },
  zakatCalculationType: {
    type: String,
    enum: ['Automatic', 'Manual'],
    default: 'Automatic'
  },
  zakatRate: {
    type: Number,
    default: 2.5, // Standard Zakat rate of 2.5%
    min: 0,
    max: 100
  },
  zakatExemptCategories: {
    type: [String],
    default: []
  },
  
  // Tax filing periods
  taxFilingPeriods: {
    incomeTax: {
      type: String,
      enum: ['Monthly', 'Quarterly', 'Annually'],
      default: 'Annually'
    },
    salesTax: {
      type: String,
      enum: ['Monthly', 'Quarterly', 'Annually'],
      default: 'Monthly'
    },
    zakat: {
      type: String,
      enum: ['Annually', 'Custom'],
      default: 'Annually'
    }
  },
  
  // Tax reminders
  enableTaxReminders: {
    type: Boolean,
    default: true
  },
  reminderDays: {
    type: Number,
    default: 7,
    min: 1,
    max: 30
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

// Add a pre-save hook to update the 'updatedAt' field
taxSettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const TaxSettings = mongoose.model('TaxSettings', taxSettingsSchema);

module.exports = TaxSettings; 
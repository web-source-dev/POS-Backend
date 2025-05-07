const mongoose = require('mongoose');

const taxSchema = new mongoose.Schema({
  taxId: {
    type: String,
    unique: true,
    default: function() {
      return 'TAX-' + new mongoose.Types.ObjectId().toString().substr(-8).toUpperCase();
    }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Income Tax', 'Sales Tax', 'Zakat', 'Custom Tax', 'Advance Tax'],
    default: 'Income Tax'
  },
  taxableAmount: {
    type: Number,
    required: true,
    min: 0
  },
  taxRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  taxAmount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Pending', 'Partially Paid', 'Exempt'],
    default: 'Pending'
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  paymentDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'Check', 'Online', 'Other'],
    default: 'Cash'
  },
  taxPeriod: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  reference: {
    type: String,
    trim: true
  },
  attachments: [{
    name: String,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isManualEntry: {
    type: Boolean,
    default: false
  },
  isFinalAssessment: {
    type: Boolean,
    default: false
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
taxSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to calculate tax based on Pakistani income tax slabs
taxSchema.statics.calculateIncomeTax = function(annualIncome) {
  // Pakistani Income Tax Slabs (simplified version)
  if (annualIncome <= 600000) {
    return 0; // No tax
  } else if (annualIncome <= 1200000) {
    return 0.05 * (annualIncome - 600000); // 5% of amount exceeding Rs. 600,000
  } else if (annualIncome <= 2400000) {
    return 30000 + 0.10 * (annualIncome - 1200000); // Rs. 30,000 + 10% of amount exceeding Rs. 1,200,000
  } else if (annualIncome <= 3600000) {
    return 150000 + 0.15 * (annualIncome - 2400000); // Rs. 150,000 + 15% of amount exceeding Rs. 2,400,000
  } else if (annualIncome <= 6000000) {
    return 330000 + 0.20 * (annualIncome - 3600000); // Rs. 330,000 + 20% of amount exceeding Rs. 3,600,000
  } else if (annualIncome <= 12000000) {
    return 810000 + 0.25 * (annualIncome - 6000000); // Rs. 810,000 + 25% of amount exceeding Rs. 6,000,000
  } else {
    return 2310000 + 0.30 * (annualIncome - 12000000); // Rs. 2,310,000 + 30% of amount exceeding Rs. 12,000,000
  }
};

// Static method to calculate Zakat (Islamic wealth tax)
taxSchema.statics.calculateZakat = function(netAssets) {
  // Zakat is typically 2.5% of assets held for one lunar year above the nisab threshold
  // Nisab is approximately the value of 87.48 grams of gold or 612.36 grams of silver
  const zakatRate = 0.025; // 2.5%
  
  // This is a simplified calculation
  return netAssets * zakatRate;
};

const Tax = mongoose.model('Tax', taxSchema);

module.exports = Tax; 
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  business: {
    name: { type: String, default: '' },
    taxId: { type: String, default: '' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    website: { type: String, default: '' },
    businessHours: { type: String, default: '' }
  },
  pos: {
    receiptHeader: { type: String, default: '' },
    receiptFooter: { type: String, default: '' },
    logo: { type: String, default: '' },
  },
  // Store which organization/store these settings belong to if multi-tenant system
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: false
  },
  // For audit purposes
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  // Use timestamps to track changes
}, { timestamps: true });

// We'll have only one settings document by default
// But the schema supports multiple settings documents for multi-tenant systems
const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings; 
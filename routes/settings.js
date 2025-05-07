const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { verifyToken, isAdmin } = require('../middleware/auth');

/**
 * @route   GET /api/settings
 * @desc    Get system settings
 * @access  Private
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    // Find settings or create default settings if none exist
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await new Settings().save();
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/settings/business
 * @desc    Update business settings
 * @access  Private (Admin)
 */
router.put('/business', verifyToken, async (req, res) => {
  try {
    const { name, taxId, address, phone, email, website, businessHours } = req.body;
    
    // Find settings or create default if none exist
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }
    
    // Update business settings
    settings.business = {
      name: name || settings.business.name,
      taxId: taxId || settings.business.taxId,
      address: address || settings.business.address,
      phone: phone || settings.business.phone,
      email: email || settings.business.email,
      website: website || settings.business.website,
      businessHours: businessHours || settings.business.businessHours
    };
    
    // Set updatedBy to current user
    settings.updatedBy = req.user.id;
    
    // Save settings
    await settings.save();
    
    res.json({ message: 'Business settings updated', settings });
  } catch (error) {
    console.error('Error updating business settings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/settings/pos
 * @desc    Update POS settings
 * @access  Private (Admin)
 */
router.put('/pos', verifyToken, async (req, res) => {
  try {
    const { receiptHeader, receiptFooter } = req.body;
    
    // Find settings or create default if none exist
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }
    
    // Update POS settings
    settings.pos = {
      receiptHeader: receiptHeader || settings.pos.receiptHeader,
      receiptFooter: receiptFooter || settings.pos.receiptFooter
    };
    
    // Set updatedBy to current user
    settings.updatedBy = req.user.id;
    
    // Save settings
    await settings.save();
    
    res.json({ message: 'POS settings updated', settings });
  } catch (error) {
    console.error('Error updating POS settings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/settings/hardware
 * @desc    Update hardware settings
 * @access  Private (Admin)
 */
router.put('/hardware', verifyToken, async (req, res) => {
  try {
    const { model, connectionType, enabled } = req.body;
    
    // Find settings or create default if none exist
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }
    
    // Update hardware printer settings
    settings.hardware.printer = {
      model: model || settings.hardware.printer.model,
      connectionType: connectionType || settings.hardware.printer.connectionType,
      enabled: enabled !== undefined ? enabled : settings.hardware.printer.enabled
    };
    
    // Set updatedBy to current user
    settings.updatedBy = req.user.id;
    
    // Save settings
    await settings.save();
    
    res.json({ message: 'Hardware settings updated', settings });
  } catch (error) {
    console.error('Error updating hardware settings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 
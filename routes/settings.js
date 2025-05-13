const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/logos');
    // Ensure the directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and original extension
    const ext = path.extname(file.originalname);
    const uniqueFilename = `logo_${Date.now()}${ext}`;
    cb(null, uniqueFilename);
  }
});

// File filter to only allow image files
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Set up multer upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: fileFilter
});

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
    
    // Update POS settings while preserving logo
    settings.pos = {
      receiptHeader: receiptHeader !== undefined ? receiptHeader : settings.pos.receiptHeader,
      receiptFooter: receiptFooter !== undefined ? receiptFooter : settings.pos.receiptFooter,
      logo: settings.pos.logo // Preserve existing logo
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
 * @route   POST /api/settings/logo
 * @desc    Upload receipt logo
 * @access  Private (Admin)
 */
router.post('/logo', verifyToken, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Find settings or create default if none exist
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    // If there's an existing logo, delete it
    if (settings.pos.logo) {
      const oldLogoPath = settings.pos.logo.replace(
        /^.*\/uploads\/logos\//,
        path.join(__dirname, '../uploads/logos/')
      );
      
      // Delete if file exists
      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }

    // Generate URL for the uploaded logo
    const logoUrl = `/uploads/logos/${req.file.filename}`;
    
    // Update settings with new logo path
    settings.pos = {
      ...settings.pos,
      logo: logoUrl
    };
    
    // Set updatedBy to current user
    settings.updatedBy = req.user.id;
    
    // Save settings
    await settings.save();
    
    res.json({ message: 'Logo uploaded successfully', logoUrl });
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   DELETE /api/settings/logo
 * @desc    Delete receipt logo
 * @access  Private (Admin)
 */
router.delete('/logo', verifyToken, async (req, res) => {
  try {
    // Find settings
    let settings = await Settings.findOne();
    if (!settings || !settings.pos.logo) {
      return res.status(404).json({ message: 'No logo found' });
    }

    // Get logo path
    const logoPath = settings.pos.logo.replace(
      /^.*\/uploads\/logos\//,
      path.join(__dirname, '../uploads/logos/')
    );
    
    // Delete file if exists
    if (fs.existsSync(logoPath)) {
      fs.unlinkSync(logoPath);
    }

    // Remove logo path from settings
    settings.pos.logo = '';
    
    // Set updatedBy to current user
    settings.updatedBy = req.user.id;
    
    // Save settings
    await settings.save();
    
    res.json({ message: 'Logo deleted successfully' });
  } catch (error) {
    console.error('Error deleting logo:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 
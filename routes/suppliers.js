const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const { verifyToken, isAdmin } = require('../middleware/auth');

// @route   GET /api/suppliers
// @desc    Get all suppliers
// @access  Private
router.get('/', verifyToken, async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    res.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/suppliers/:id
// @desc    Get supplier by ID
// @access  Private
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    
    res.json(supplier);
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/suppliers
// @desc    Create a new supplier
// @access  Private
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, contact, email, phone, address, paymentTerms } = req.body;
    
    // Check if supplier with same email already exists
    const existingSupplier = await Supplier.findOne({ email });
    if (existingSupplier) {
      return res.status(400).json({ message: 'Supplier with this email already exists' });
    }
    
    const newSupplier = new Supplier({
      name,
      contact,
      email,
      phone,
      address,
      paymentTerms: paymentTerms || 'Net 30',
      status: 'Active',
      lastOrder: null,
      totalOrders: 0
    });
    
    const supplier = await newSupplier.save();
    res.status(201).json(supplier);
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/suppliers/:id
// @desc    Update supplier
// @access  Private
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, contact, email, phone, address, paymentTerms, status } = req.body;
    
    // Check if supplier exists
    let supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    
    // Check if updating to an email that already exists (for another supplier)
    if (email && email !== supplier.email) {
      const existingSupplier = await Supplier.findOne({ email });
      if (existingSupplier && existingSupplier._id.toString() !== req.params.id) {
        return res.status(400).json({ message: 'Another supplier with this email already exists' });
      }
    }
    
    // Update fields
    const updatedFields = {};
    if (name) updatedFields.name = name;
    if (contact) updatedFields.contact = contact;
    if (email) updatedFields.email = email;
    if (phone) updatedFields.phone = phone;
    if (address) updatedFields.address = address;
    if (paymentTerms) updatedFields.paymentTerms = paymentTerms;
    if (status) updatedFields.status = status;
    
    // Update the supplier
    supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { $set: updatedFields },
      { new: true }
    );
    
    res.json(supplier);
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/suppliers/:id
// @desc    Delete supplier
// @access  Private (Admin only)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    
    await Supplier.findByIdAndDelete(req.params.id);
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PATCH /api/suppliers/:id/status
// @desc    Update supplier status (Active, Inactive, On Hold)
// @access  Private
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    // Validate status
    if (!status || !['Active', 'Inactive', 'On Hold'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    
    // Find and update the supplier
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    );
    
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    
    res.json(supplier);
  } catch (error) {
    console.error('Error updating supplier status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 
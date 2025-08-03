const express = require('express');
const router = express.Router();
const User = require('../models/User');

/**
 * GET /api/emergency-contacts/:userId
 * Get all emergency contacts for a user
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const contacts = user.getActiveEmergencyContacts();
    
    res.json({
      success: true,
      contacts: contacts.map(contact => ({
        id: contact._id,
        name: contact.name,
        phone: contact.phone,
        relationship: contact.relationship,
        isPrimary: contact.isPrimary,
        createdAt: contact.createdAt
      }))
    });
    
  } catch (error) {
    console.error('Error getting emergency contacts:', error);
    res.status(500).json({ error: 'Failed to get emergency contacts' });
  }
});

/**
 * POST /api/emergency-contacts/:userId
 * Add a new emergency contact
 */
router.post('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, phone, relationship, isPrimary } = req.body;
    
    if (!name || !phone || !relationship) {
      return res.status(400).json({ error: 'Name, phone, and relationship are required' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Validate phone format (basic validation)
    const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)\.]{7,}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }
    
    await user.addEmergencyContact({
      name,
      phone,
      relationship,
      isPrimary: isPrimary || false
    });
    
    const contacts = user.getActiveEmergencyContacts();
    
    res.json({
      success: true,
      message: 'Emergency contact added successfully',
      contacts: contacts.map(contact => ({
        id: contact._id,
        name: contact.name,
        phone: contact.phone,
        relationship: contact.relationship,
        isPrimary: contact.isPrimary,
        createdAt: contact.createdAt
      }))
    });
    
  } catch (error) {
    console.error('Error adding emergency contact:', error);
    res.status(500).json({ error: 'Failed to add emergency contact' });
  }
});

/**
 * PUT /api/emergency-contacts/:userId/:contactId
 * Update an emergency contact
 */
router.put('/:userId/:contactId', async (req, res) => {
  try {
    const { userId, contactId } = req.params;
    const updateData = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Validate phone format if phone is being updated
    if (updateData.phone) {
      const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)\.]{7,}$/;
      if (!phoneRegex.test(updateData.phone.replace(/\s/g, ''))) {
        return res.status(400).json({ error: 'Invalid phone number format' });
      }
    }
    
    await user.updateEmergencyContact(contactId, updateData);
    
    const contacts = user.getActiveEmergencyContacts();
    
    res.json({
      success: true,
      message: 'Emergency contact updated successfully',
      contacts: contacts.map(contact => ({
        id: contact._id,
        name: contact.name,
        phone: contact.phone,
        relationship: contact.relationship,
        isPrimary: contact.isPrimary,
        createdAt: contact.createdAt
      }))
    });
    
  } catch (error) {
    console.error('Error updating emergency contact:', error);
    if (error.message === 'Emergency contact not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update emergency contact' });
  }
});

/**
 * DELETE /api/emergency-contacts/:userId/:contactId
 * Delete an emergency contact
 */
router.delete('/:userId/:contactId', async (req, res) => {
  try {
    const { userId, contactId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await user.removeEmergencyContact(contactId);
    
    const contacts = user.getActiveEmergencyContacts();
    
    res.json({
      success: true,
      message: 'Emergency contact deleted successfully',
      contacts: contacts.map(contact => ({
        id: contact._id,
        name: contact.name,
        phone: contact.phone,
        relationship: contact.relationship,
        isPrimary: contact.isPrimary,
        createdAt: contact.createdAt
      }))
    });
    
  } catch (error) {
    console.error('Error deleting emergency contact:', error);
    if (error.message === 'Emergency contact not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete emergency contact' });
  }
});

/**
 * GET /api/emergency-contacts/:userId/primary
 * Get the primary emergency contact for a user
 */
router.get('/:userId/primary', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const primaryContact = user.getPrimaryEmergencyContact();
    
    if (!primaryContact) {
      return res.json({
        success: true,
        primaryContact: null
      });
    }
    
    res.json({
      success: true,
      primaryContact: {
        id: primaryContact._id,
        name: primaryContact.name,
        phone: primaryContact.phone,
        relationship: primaryContact.relationship,
        isPrimary: primaryContact.isPrimary,
        createdAt: primaryContact.createdAt
      }
    });
    
  } catch (error) {
    console.error('Error getting primary emergency contact:', error);
    res.status(500).json({ error: 'Failed to get primary emergency contact' });
  }
});

module.exports = router;
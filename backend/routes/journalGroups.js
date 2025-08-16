const express = require('express');
const router = express.Router();
const JournalGroup = require('../models/JournalGroup');
const User = require('../models/User');

// =============================================================================
// JOURNAL GROUP MANAGEMENT ROUTES
// =============================================================================

// Get user's groups (groups they're a member of)
router.get('/groups', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }
    
    const groups = await JournalGroup.find({
      'members.userId': userId,
      'members.isActive': true
    })
    .populate('createdBy', 'username profileImage')
    .sort({ updatedAt: -1 })
    .exec();
    
    // Add user's role to each group
    const groupsWithRole = groups.map(group => {
      const member = group.members.find(m => 
        m.userId.toString() === userId && m.isActive
      );
      return {
        ...group.toObject(),
        userRole: member ? member.role : null
      };
    });
    
    res.json({
      success: true,
      groups: groupsWithRole
    });
    
  } catch (error) {
    console.error('Error fetching user groups:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch groups' });
  }
});

// Create new group
router.post('/groups', async (req, res) => {
  try {
    const { 
      name, 
      description, 
      privacy = 'invite_only', 
      tags = [],
      settings = {},
      createdBy 
    } = req.body;
    
    if (!name || !createdBy) {
      return res.status(400).json({ 
        success: false, 
        error: 'Group name and creator are required' 
      });
    }
    
    const group = new JournalGroup({
      name: name.trim(),
      description: description?.trim(),
      createdBy,
      privacy,
      tags,
      settings: {
        allowMemberInvites: settings.allowMemberInvites !== false,
        requireApprovalForPosts: settings.requireApprovalForPosts === true,
        allowAudioSharing: settings.allowAudioSharing !== false
      },
      members: [{
        userId: createdBy,
        role: 'admin',
        isActive: true
      }],
      memberCount: 1
    });
    
    await group.save();
    
    const populatedGroup = await JournalGroup.findById(group._id)
      .populate('createdBy', 'username profileImage')
      .exec();
    
    res.json({
      success: true,
      message: 'Group created successfully',
      group: {
        ...populatedGroup.toObject(),
        userRole: 'admin'
      }
    });
    
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ success: false, error: 'Failed to create group' });
  }
});

// Get group details
router.get('/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.query;
    
    const group = await JournalGroup.findById(groupId)
      .populate('createdBy', 'username profileImage')
      .populate('members.userId', 'username profileImage')
      .exec();
    
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }
    
    // Check if user is member (for privacy)
    const isMember = group.isMember(userId);
    const userRole = isMember ? group.members.find(m => 
      m.userId._id.toString() === userId && m.isActive
    )?.role : null;
    
    // Filter sensitive information for non-members
    if (!isMember && group.privacy !== 'open') {
      return res.json({
        success: true,
        group: {
          _id: group._id,
          name: group.name,
          description: group.description,
          privacy: group.privacy,
          memberCount: group.memberCount,
          createdAt: group.createdAt,
          isMember: false
        }
      });
    }
    
    res.json({
      success: true,
      group: {
        ...group.toObject(),
        userRole,
        isMember
      }
    });
    
  } catch (error) {
    console.error('Error fetching group details:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch group details' });
  }
});

// Update group
router.put('/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId, name, description, tags, settings } = req.body;
    
    const group = await JournalGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }
    
    // Check if user is admin
    if (!group.isAdmin(userId)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Only group admins can update group settings' 
      });
    }
    
    // Update fields
    if (name) group.name = name.trim();
    if (description !== undefined) group.description = description?.trim();
    if (tags) group.tags = tags;
    if (settings) {
      group.settings = { ...group.settings, ...settings };
    }
    
    await group.save();
    
    const updatedGroup = await JournalGroup.findById(groupId)
      .populate('createdBy', 'username profileImage')
      .exec();
    
    res.json({
      success: true,
      message: 'Group updated successfully',
      group: updatedGroup
    });
    
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ success: false, error: 'Failed to update group' });
  }
});

// Delete group
router.delete('/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    
    const group = await JournalGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }
    
    // Check if user is the creator
    if (group.createdBy.toString() !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Only the group creator can delete the group' 
      });
    }
    
    await JournalGroup.findByIdAndDelete(groupId);
    
    res.json({
      success: true,
      message: 'Group deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ success: false, error: 'Failed to delete group' });
  }
});

// Invite user to group
router.post('/groups/:groupId/invite', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId, inviteUserId, role = 'member' } = req.body;
    
    const group = await JournalGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }
    
    // Check permissions
    const canInvite = group.isAdmin(userId) || 
                     (group.settings.allowMemberInvites && group.isMember(userId));
    
    if (!canInvite) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to invite members to this group' 
      });
    }
    
    // Check if user exists
    const invitedUser = await User.findById(inviteUserId);
    if (!invitedUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Add member to group
    await group.addMember(inviteUserId, role);
    
    res.json({
      success: true,
      message: `${invitedUser.username} has been added to the group`,
      memberCount: group.memberCount
    });
    
  } catch (error) {
    console.error('Error inviting user to group:', error);
    res.status(500).json({ success: false, error: 'Failed to invite user' });
  }
});

// Join group (for open groups)
router.post('/groups/:groupId/join', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    
    const group = await JournalGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }
    
    // Check if group allows joining
    if (group.privacy !== 'open') {
      return res.status(403).json({ 
        success: false, 
        error: 'This group requires an invitation to join' 
      });
    }
    
    // Check if already a member
    if (group.isMember(userId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Already a member of this group' 
      });
    }
    
    await group.addMember(userId, 'member');
    
    res.json({
      success: true,
      message: 'Successfully joined the group',
      memberCount: group.memberCount
    });
    
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ success: false, error: 'Failed to join group' });
  }
});

// Leave group
router.delete('/groups/:groupId/leave', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    
    const group = await JournalGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }
    
    // Check if user is member
    if (!group.isMember(userId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Not a member of this group' 
      });
    }
    
    // Prevent creator from leaving if they're the only admin
    const admins = group.members.filter(m => m.isActive && m.role === 'admin');
    if (group.createdBy.toString() === userId && admins.length === 1) {
      return res.status(400).json({ 
        success: false, 
        error: 'Group creator must assign another admin before leaving' 
      });
    }
    
    await group.removeMember(userId);
    
    res.json({
      success: true,
      message: 'Successfully left the group',
      memberCount: group.memberCount
    });
    
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ success: false, error: 'Failed to leave group' });
  }
});

// Search for public groups
router.get('/search', async (req, res) => {
  try {
    const { query, userId, page = 1, limit = 20 } = req.query;
    
    let searchFilter = { privacy: 'open' };
    
    if (query) {
      searchFilter.$text = { $search: query };
    }
    
    const groups = await JournalGroup.find(searchFilter)
      .populate('createdBy', 'username profileImage')
      .sort({ memberCount: -1, updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    // Add membership status for each group
    const groupsWithStatus = groups.map(group => ({
      ...group.toObject(),
      isMember: group.isMember(userId)
    }));
    
    const totalCount = await JournalGroup.countDocuments(searchFilter);
    
    res.json({
      success: true,
      groups: groupsWithStatus,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalGroups: totalCount,
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      }
    });
    
  } catch (error) {
    console.error('Error searching groups:', error);
    res.status(500).json({ success: false, error: 'Failed to search groups' });
  }
});

module.exports = router;
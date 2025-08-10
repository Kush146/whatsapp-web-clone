const express = require('express');
const router = express.Router();
const Message = require('../models/messageModel');

/**
 * Create a message
 * Body: { wa_id, message, status? }
 */
router.post('/', async (req, res) => {
  try {
    const { wa_id, message, status = 'sent' } = req.body;
    if (!wa_id || !message) {
      return res.status(400).json({ error: 'wa_id and message are required' });
    }
    const doc = await Message.create({ wa_id, message, status });
    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error saving message' });
  }
});

/**
 * Update message status by Mongo _id
 * Body: { status }
 * Params: :id  (MongoDB _id)
 */
router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });

    const updated = await Message.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Message not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error updating message status' });
  }
});

/**
 * Get ALL messages (oldest -> newest)
 */
router.get('/', async (req, res) => {
  try {
    const msgs = await Message.find().sort({ timestamp: 1 });
    res.json(msgs);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

/**
 * Get conversations grouped by wa_id (for sidebar)
 * Returns: [{ _id: wa_id, lastMessage, lastStatus, lastTime }]
 */
// GET conversations grouped by wa_id (for sidebar)
router.get('/conversations', async (req, res) => {
  try {
    const convos = await Message.aggregate([
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$wa_id",
          name: { $first: "$name" },           // <-- include name
          lastMessage: { $first: "$message" },
          lastStatus: { $first: "$status" },
          lastTime: { $first: "$timestamp" }
        }
      },
      { $sort: { lastTime: -1 } }
    ]);
    res.json(convos);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error fetching conversations' });
  }
});


/**
 * Get all messages for a specific wa_id (chat thread)
 * Params: ?wa_id=xxxx
 */
router.get('/by-user', async (req, res) => {
  try {
    const { wa_id } = req.query;
    if (!wa_id) return res.status(400).json({ error: 'wa_id is required' });

    const msgs = await Message.find({ wa_id }).sort({ timestamp: 1 });
    res.json(msgs);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error fetching user messages' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Message.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Message not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error deleting message' });
  }
});

module.exports = router;

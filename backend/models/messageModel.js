// backend/models/messageModel.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    // Who the conversation is with
    wa_id: { type: String, required: true, index: true }, // user phone / WA id
    name: { type: String },                               // optional contact name

    // IDs from webhook payloads so we can update statuses later
    msg_id: { type: String, unique: true, sparse: true, index: true }, // messages[i].id
    meta_msg_id: { type: String, index: true },                        // some payloads use this

    // Message content/meta
    direction: { type: String, enum: ['inbound', 'outbound'], default: 'inbound' },
    type: { type: String, default: 'text' },            // text/image/etc
    message: { type: String },                          // text body (if any)
    raw: { type: Object },                              // store original payload for reference

    // Status & timestamps
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'unknown'],
      default: 'sent',
      index: true
    },
    statusTimestamps: {
      sent: Date,
      delivered: Date,
      read: Date
    },

    // When it happened
    timestamp: { type: Date, default: Date.now }
  },
  {
    collection: 'processed_messages', // <- required collection name
    timestamps: false
  }
);

module.exports = mongoose.model('Message', messageSchema);

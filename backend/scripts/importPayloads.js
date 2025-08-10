// backend/scripts/importPayloads.js
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Message = require('../models/messageModel');

const dir = process.argv[2];
if (!dir) {
  console.error('❌ Provide a directory with JSON payloads.\nExample: node scripts/importPayloads.js "D:\\fullstack\\Whatsapp\\payloads"');
  process.exit(1);
}

(async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI missing in .env');
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected');

    const files = fs.readdirSync(dir)
      .filter(f => f.toLowerCase().endsWith('.json'))
      .map(f => path.join(dir, f));

    if (!files.length) {
      console.log('⚠️ No .json files found in', dir);
      process.exit(0);
    }

    let inserted = 0, updated = 0;

    for (const file of files) {
      let payload;
      try {
        payload = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        console.warn('⚠️ Skipping invalid JSON:', file);
        continue;
      }

      const packets = extractPackets(payload);
      let fileMsgCount = 0;
      let fileStatusCount = 0;

      for (const pkt of packets) {
        const msgs = Array.isArray(pkt.messages) ? pkt.messages : [];
        const stats = Array.isArray(pkt.statuses) ? pkt.statuses : [];
        fileMsgCount += msgs.length;
        fileStatusCount += stats.length;

        // Insert / upsert messages
        for (const m of msgs) {
          const doc = await buildMessageDoc(pkt, m);
          if (!doc) {
            console.log(`   ⏭️  Skipped a message (missing wa_id or id) in ${path.basename(file)}`);
            continue;
          }

          const filter = msgIdFilter(doc);
          // True upsert; upsertedCount/upsertedId tell us if it was newly inserted
          const res = await Message.updateOne(filter, { $setOnInsert: doc }, { upsert: true });
          if (res.upsertedCount && res.upsertedId) {
            inserted += 1;
          }
        }

        // Apply status updates
        for (const s of stats) {
          const statusId = s.id || s.message_id || s.meta_msg_id;
          if (!statusId) continue;

          const newStatus = normalizeStatus(s.status);
          const when = toDate(s.timestamp) || new Date();
          const update = { $set: { status: newStatus } };
          if (['sent','delivered','read'].includes(newStatus)) {
            update.$set[`statusTimestamps.${newStatus}`] = when;
          }

          const res = await Message.findOneAndUpdate(
            { $or: [{ msg_id: statusId }, { meta_msg_id: statusId }] },
            update,
            { new: true }
          );
          if (res) updated += 1;
        }
      }

      console.log(`• Processed ${path.basename(file)}  (messages: ${fileMsgCount}, statuses: ${fileStatusCount})`);
    }

    console.log(`\n✅ Done. Inserted: ${inserted}, Updated (status): ${updated}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Import failed:', err);
    process.exit(1);
  }
})();

/** Helpers **/

// Your files come as metaData.entry[].changes[].value (plus we also support entry[].changes[].value)
function extractPackets(payload) {
  // Case A: payload.metaData.entry
  if (payload?.metaData?.entry?.length) {
    const out = [];
    for (const e of payload.metaData.entry) {
      if (!e.changes) continue;
      for (const ch of e.changes) if (ch.value) out.push(ch.value);
    }
    return out;
  }
  // Case B: standard Meta format payload.entry
  if (payload?.entry?.length) {
    const out = [];
    for (const e of payload.entry) {
      if (!e.changes) continue;
      for (const ch of e.changes) if (ch.value) out.push(ch.value);
    }
    return out;
  }
  // Case C: already value-like
  return [payload];
}

function normalizeStatus(s) {
  const t = String(s || '').toLowerCase();
  if (t.includes('read')) return 'read';
  if (t.includes('deliver')) return 'delivered';
  if (t.includes('sent')) return 'sent';
  return 'unknown';
}

function toDate(ts) {
  if (!ts) return null;
  const n = Number(ts);
  if (!Number.isNaN(n)) return new Date(n < 1e12 ? n * 1000 : n);
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}

function msgIdFilter(doc) {
  const ors = [];
  if (doc.msg_id) ors.push({ msg_id: doc.msg_id });
  if (doc.meta_msg_id) ors.push({ meta_msg_id: doc.meta_msg_id });
  return ors.length ? { $or: ors } : { wa_id: doc.wa_id, message: doc.message, timestamp: doc.timestamp };
}

async function buildMessageDoc(pkt, m) {
  // pkt is the "value" object (contacts/messages/statuses live here)
  const contactWa = pkt?.contacts?.[0]?.wa_id || null;
  const wa_id = contactWa || m.from || null;
  if (!wa_id) return null;

  const name =
    pkt?.contacts?.[0]?.profile?.name ||
    pkt?.contacts?.[0]?.name ||
    undefined;

  const msg_id = m.id || m.message_id;
  const meta_msg_id = m.meta_msg_id || m.context?.id;
  if (!msg_id && !meta_msg_id) return null;

  const text = m.text?.body ?? m.message?.text?.body ?? m.caption ?? '';
  const timestamp = toDate(m.timestamp) || new Date();
  const type = m.type || (m.text ? 'text' : 'unknown');

  // Direction: if message.from equals the contact wa_id => inbound (user->us), else outbound (us->user)
  const direction = (contactWa && m.from && String(m.from) === String(contactWa))
    ? 'inbound'
    : 'outbound';

  return {
    wa_id: String(wa_id),
    name,
    msg_id,
    meta_msg_id,
    direction,
    type,
    message: text,
    raw: m,
    status: 'sent',
    statusTimestamps: { sent: timestamp },
    timestamp
  };
}

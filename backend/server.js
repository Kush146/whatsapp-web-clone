const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://whatsapp-web-clone-beta-ivory.vercel.app',                 // current prod
    'https://whatsapp-web-clone-git-main-kushs-projects-190f8a86.vercel.app', // optional alias
    'https://whatsapp-web-clone-bzfd6sjp0-kushs-projects-190f8a86.vercel.app' // optional alias
  ],
  methods: ['GET','POST','PUT','DELETE'],
  credentials: true
}));

app.use(bodyParser.json());

// MongoDB connection (modern call – no deprecated options)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log('MongoDB connection error:', err));

// Routes
const messageRoutes = require('./routes/messageRoutes');
console.log('typeof messageRoutes =', typeof messageRoutes);
app.use('/api/messages', messageRoutes);

// Health & root
app.get('/health', (req, res) => res.json({ ok: true }));   // <-- make sure this exists
app.get('/', (req, res) => res.redirect('/health'));        // <-- redirect works now

app.listen(port, () => {
  console.log(`✅ Server running at: http://localhost:${port}`);
});

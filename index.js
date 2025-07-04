// index.js (modular version)
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());

// ✅ CORS setup
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.includes('wixsite.com') || origin.includes('editor.wix.com')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// ✅ Mount modular routes
const googleRouter = require('./routes/google');
const appleRouter = require('./routes/apple');
app.use('/google', googleRouter); // POST /google/generate-pass
app.use('/apple', appleRouter);   // POST /apple/generate-apple-pass

// ✅ Health check
app.get('/', (req, res) => {
  res.send('✅ Wallet Pass Generator is running');
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

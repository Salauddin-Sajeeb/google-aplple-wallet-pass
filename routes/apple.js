// routes/apple.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const PKPass = require('passkit-generator');

dotenv.config();
const router = express.Router();

router.post('/generate-apple-pass', async (req, res) => {
  const { name, surname, email, accessLevel } = req.body;

  if (!name || !surname || !email || !accessLevel) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const pass = await PKPass.from({
      model: path.join(__dirname, '../templates/event-pass.json'),
      certificates: {
        wwdr: fs.readFileSync('certs/AppleWWDRCA.cer'),
        signerCert: fs.readFileSync('certs/BiteLoyalClub.pem'),
        signerKey: {
          keyFile: fs.readFileSync('certs/BiteLoyalClub.p12'),
          passphrase: process.env.P12_PASSWORD
        }
      }
    });

    pass.loadImagesFrom(path.join(__dirname, '../assets'));

    pass.primaryFields.add({
      key: 'access',
      label: 'Access Level',
      value: accessLevel
    });

    pass.secondaryFields.add({
      key: 'name',
      label: 'Name',
      value: `${name} ${surname}`
    });

    pass.secondaryFields.add({
      key: 'email',
      label: 'Email',
      value: email
    });

    const buffer = await pass.asBuffer();
    res
      .set('Content-Type', 'application/vnd.apple.pkpass')
      .set('Content-Disposition', `attachment; filename=${surname}_pass.pkpass`)
      .send(buffer);

  } catch (error) {
    console.error('❌ Apple Wallet error:', error);
    res.status(500).json({ error: 'Failed to generate Apple pass', details: error.message });
  }
});

module.exports = router;

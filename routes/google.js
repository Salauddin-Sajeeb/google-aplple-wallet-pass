// routes/google.js
const express = require('express');
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const key = require('../config/wallet-service.json');

dotenv.config();
const router = express.Router();

const issuerId = process.env.ISSUER_ID;

const auth = new google.auth.GoogleAuth({
  credentials: key,
  scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
});

router.post('/generate-pass', async (req, res) => {
  const { name, surname, email, points } = req.body;

  if (!name || !surname || !email || !points) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const client = await auth.getClient();
    const wallet = google.walletobjects({ version: 'v1', auth: client });

    const userId = email.replace(/[^a-zA-Z0-9]/g, '_');
    const objectId = `${issuerId}.${userId}_eventpass`;
    const classId = `${issuerId}.sample_event_class`;

    // Create class if not exists
    try {
      await wallet.eventticketclass.get({ resourceId: classId });
    } catch (error) {
      if (error.code === 404) {
        await wallet.eventticketclass.insert({
          requestBody: {
            id: classId,
            issuerName: "Your Brand",
            eventName: {
              defaultValue: {
                language: "en-US",
                value: "My Sample Event"
              }
            },
            venue: {
              name: {
                defaultValue: {
                  language: "en-US",
                  value: "Online Venue"
                }
              },
              address: {
                defaultValue: {
                  language: "en-US",
                  value: "123 Cloud Blvd"
                }
              }
            },
            reviewStatus: "UNDER_REVIEW"
          }
        });
      } else {
        throw error;
      }
    }

    // Insert object
    try {
      await wallet.eventticketobject.insert({
        requestBody: {
          id: objectId,
          classId,
          state: "ACTIVE",
          barcode: {
            type: "QR_CODE",
            value: email
          },
          ticketHolderName: `${name} ${surname}`,
          ticketNumber: `POINTS-${points}`,
          textModulesData: [
            { header: "Full Name", body: `${name} ${surname}` },
            { header: "Email", body: email },
            { header: "Points Earned", body: `${points} Points` }
          ]
        }
      });
    } catch (error) {
      if (error.code !== 409) {
        return res.status(500).json({ error: 'Failed to insert pass object', details: error.message });
      }
    }

    // Generate Wallet URL
    const jwtPayload = {
      iss: key.client_email,
      aud: 'google',
      typ: 'savetowallet',
      payload: {
        eventTicketObjects: [{ id: objectId }]
      }
    };

    const token = jwt.sign(jwtPayload, key.private_key, {
      algorithm: 'RS256'
    });

    const walletUrl = `https://pay.google.com/gp/v/save/${token}`;
    return res.status(200).json({ walletUrl });

  } catch (error) {
    console.error('❌ Google Wallet Error:', error);
    return res.status(500).json({
      error: 'Failed to generate Google pass',
      details: error.message
    });
  }
});

module.exports = router;

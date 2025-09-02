// server-excel.js (full file — dual-mode email: SMTP locally, SendGrid API on production)

const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');
const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Excel file path
const EXCEL_FILE = path.join(__dirname, 'lost_found_items.xlsx');

// --- Email configuration (dual-mode) ---
// SendGrid initialization (used in production / Railway)
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.log('⚠️ SENDGRID_API_KEY is not set. SendGrid Web API will not be available until you set it.');
}

/**
 * sendEmail:
 * - If running in production / Railway -> use SendGrid Web API
 * - Otherwise -> try SMTP via nodemailer (local dev)
 */
async function sendEmail(to, subject, htmlContent) {
  const isProduction = !!process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';

  // Use SendGrid Web API in production / Railway
  if (isProduction) {
    if (!process.env.SENDGRID_API_KEY) {
      console.error('❌ Running in production but SENDGRID_API_KEY is missing. Email not sent.');
      return false;
    }

    try {
      const msg = {
        to,
        from: process.env.SENDGRID_FROM || 'campusfindthelost@gmail.com', // must be a verified sender in SendGrid
        subject,
        html: htmlContent,
      };

      await sgMail.send(msg);
      console.log(`✅ Email sent successfully via SendGrid Web API to ${to}`);
      return true;
    } catch (error) {
      console.error('❌ SendGrid API error:', error.message || error);
      if (error.response && error.response.body) {
        console.error('SendGrid response body:', error.response.body);
      }
      return false;
    }
  }

  // Local/dev: try SMTP via nodemailer
  try {
    // Build SMTP config from environment (defaults fallback to SendGrid SMTP if present)
    const smtpHost = process.env.SMTP_HOST || 'smtp.sendgrid.net';
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const smtpSecure = (process.env.SMTP_SECURE === 'true') || false;

    const smtpAuthUser = process.env.EMAIL_USER || process.env.SMTP_USER || 'apikey';
    const smtpAuthPass = process.env.EMAIL_PASS || process.env.SMTP_PASS || process.env.SENDGRID_API_KEY || '';

    const emailConfig = {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure, // true for 465, false for other ports
      auth: {
        user: smtpAuthUser,
        pass: smtpAuthPass,
      },
      // Some environments require this when using self-signed certs
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 20000, // 20s
    };

    const transporter = nodemailer.createTransport(emailConfig);

    const mailOptions = {
      from: process.env.SENDGRID_FROM || emailConfig.auth.user || 'campusfindthelost@gmail.com',
      to,
      subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent via SMTP:', info.messageId || info);
    return true;
  } catch (err) {
    console.error('❌ SMTP failed:', err && err.message ? err.message : err);

    // Optional fallback: try SendGrid API locally if SMTP fails and API key exists
    if (process.env.SENDGRID_API_KEY) {
      try {
        const msg = {
          to,
          from: process.env.SENDGRID_FROM || 'campusfindthelost@gmail.com',
          subject,
          html: htmlContent,
        };
        await sgMail.send(msg);
        console.log(`✅ Fallback: Email sent via SendGrid Web API to ${to}`);
        return true;
      } catch (apiErr) {
        console.error('❌ Fallback SendGrid API error:', apiErr.message || apiErr);
        if (apiErr.response && apiErr.response.body) {
          console.error('SendGrid response body:', apiErr.response.body);
        }
        return false;
      }
    }

    return false;
  }
}

// --- Email template generator ---
function createEmailTemplate(type, data) {
  const baseStyle = `
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 10px; text-align: center; }
      .content { background: #f9f9f9; padding: 20px; border-radius: 10px; margin: 20px 0; }
      .item-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #667eea; }
      .contact-info { background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 15px 0; }
      .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      .btn { display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
    </style>
  `;

  switch (type) {
    case 'item_found':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>🎉 Great News! Your Item Has Been Found!</h1>
          </div>
          <div class="content">
            <h2>Item Details:</h2>
            <div class="item-details">
              <p><strong>Item Name:</strong> ${data.itemName}</p>
              <p><strong>Category:</strong> ${data.category}</p>
              <p><strong>Description:</strong> ${data.description}</p>
              <p><strong>Last Seen:</strong> ${data.location}</p>
            </div>

            <h2>Finder Information:</h2>
            <div class="contact-info">
              <p><strong>Finder's Name:</strong> ${data.finderName}</p>
              <p><strong>Contact Email:</strong> ${data.finderContact}</p>
              <p><strong>Pickup Location:</strong> ${data.finderLocation}</p>
              <p><strong>Preferred Time:</strong> ${data.pickupTime || 'Not specified'}</p>
              ${data.finderNotes ? `<p><strong>Additional Notes:</strong> ${data.finderNotes}</p>` : ''}
            </div>

            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Contact the finder using the email provided above</li>
              <li>Arrange a convenient pickup time and location</li>
              <li>Bring identification when picking up your item</li>
            </ul>
          </div>
          <div class="footer">
            <p>This notification was sent from the Campus Find the Lost Portal</p>
          </div>
        </div>
      `;

    case 'item_claimed':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>📋 Item Claim Submitted</h1>
          </div>
          <div class="content">
            <h2>Claim Details:</h2>
            <div class="item-details">
              <p><strong>Item Name:</strong> ${data.itemName}</p>
              <p><strong>Category:</strong> ${data.category}</p>
              <p><strong>Found Location:</strong> ${data.foundLocation}</p>
            </div>

            <h2>Claimer Information:</h2>
            <div class="contact-info">
              <p><strong>Claimer's Name:</strong> ${data.claimerName}</p>
              <p><strong>Claimer's Email:</strong> ${data.claimerEmail}</p>
              <p><strong>Claim Description:</strong> ${data.claimDescription}</p>
              <p><strong>Lost Location:</strong> ${data.claimLocation}</p>
              <p><strong>Lost Date:</strong> ${data.claimDate}</p>
              ${data.claimNotes ? `<p><strong>Additional Proof:</strong> ${data.claimNotes}</p>` : ''}
            </div>

            <p><strong>Status:</strong> <span style="color: #f7931e; font-weight: bold;">Pending Verification</span></p>

            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Review the claim details carefully</li>
              <li>Contact the claimer if you need more information</li>
              <li>Verify ownership before arranging pickup</li>
            </ul>
          </div>
          <div class="footer">
            <p>This notification was sent from the Campus Find the Lost Portal</p>
          </div>
        </div>
      `;

    case 'finder_notified':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>🔔 Someone Wants to Claim Your Found Item</h1>
          </div>
          <div class="content">
            <h2>Item Details:</h2>
            <div class="item-details">
              <p><strong>Item Name:</strong> ${data.itemName}</p>
              <p><strong>Category:</strong> ${data.category}</p>
              <p><strong>Found Location:</strong> ${data.foundLocation}</p>
              <p><strong>Date Found:</strong> ${data.dateFound}</p>
            </div>

            <h2>Claimer Information:</h2>
            <div class="contact-info">
              <p><strong>Claimer's Name:</strong> ${data.claimerName}</p>
              <p><strong>Claimer's Email:</strong> ${data.claimerEmail}</p>
              <p><strong>Claim Description:</strong> ${data.claimDescription}</p>
              <p><strong>Lost Location:</strong> ${data.claimLocation}</p>
              <p><strong>Lost Date:</strong> ${data.claimDate}</p>
              ${data.claimNotes ? `<p><strong>Additional Proof:</strong> ${data.claimNotes}</p>` : ''}
            </div>

            <p><strong>Action Required:</strong></p>
            <ul>
              <li>Review the claim details to verify ownership</li>
              <li>Contact the claimer if the information matches</li>
              <li>Arrange pickup if you're satisfied with the claim</li>
            </ul>
          </div>
          <div class="footer">
            <p>This notification was sent from the Campus Find the Lost Portal</p>
          </div>
        </div>
      `;

    default:
      return `<p>Notification from Campus Find the Lost Portal</p>`;
  }
}

// --- Excel Database Helper Functions ---

/**
 * Ensures the Excel file exists. If not, it creates it with proper structure.
 */
async function initializeExcelDatabase() {
  try {
    await fs.access(EXCEL_FILE);
    console.log('Excel database file exists.');
  } catch (error) {
    console.log('Excel database file not found. Creating a new one...');

    // Create workbook with two sheets: lostItems and foundItems
    const workbook = XLSX.utils.book_new();

    // Define headers for lost items (consistent)
    const lostItemsHeaders = [
      'id',
      'status',
      'itemName',
      'category',
      'location',
      'dateLost',
      'timeLost',
      'description',
      'contact',
      'reward',
      'type',
      'datePosted',
      'dateFound',
      'finderDetails' // stored as JSON string when present
    ];

    // Define headers for found items (consistent)
    const foundItemsHeaders = [
      'id',
      'status',
      'itemName',
      'category',
      'location',
      'dateFound',
      'description',
      'contact',
      'currentLocation',
      'originalLostItemId',
      'type',
      'datePosted',
      'finderName',
      'finderContact',
      'finderLocation',
      'finderNotes',
      'pickupTime',
      'reunionDate',
      'claimerName',
      'claimerEmail',
      'claimDescription',
      'claimLocation',
      'claimDate',
      'claimNotes',
      'claimStatus'
    ];

    // Create empty sheets with headers
    const lostItemsSheet = XLSX.utils.aoa_to_sheet([lostItemsHeaders]);
    const foundItemsSheet = XLSX.utils.aoa_to_sheet([foundItemsHeaders]);

    // Add sheets to workbook
    XLSX.utils.book_append_sheet(workbook, lostItemsSheet, 'lostItems');
    XLSX.utils.book_append_sheet(workbook, foundItemsSheet, 'foundItems');

    // Write to file
    XLSX.writeFile(workbook, EXCEL_FILE);
    console.log('Excel database file created successfully.');
  }
}

/**
 * Reads data from Excel file and converts to JSON format
 */
async function readExcelDatabase() {
  try {
    const workbook = XLSX.readFile(EXCEL_FILE);

    // Read lost items sheet
    const lostItemsSheet = workbook.Sheets['lostItems'];
    const notFoundLost = !lostItemsSheet;
    const lostItems = notFoundLost ? [] : XLSX.utils.sheet_to_json(lostItemsSheet, { header: 1 });

    // Read found items sheet
    const foundItemsSheet = workbook.Sheets['foundItems'];
    const notFoundFound = !foundItemsSheet;
    const foundItems = notFoundFound ? [] : XLSX.utils.sheet_to_json(foundItemsSheet, { header: 1 });

    // Convert to proper format (skip header row). If sheet missing, return empty array.
    const lostItemsData = [];
    if (!notFoundLost && lostItems.length > 0) {
      const headers = lostItems[0];
      lostItems.slice(1).forEach(row => {
        const item = {};
        headers.forEach((header, index) => {
          let value = row[index];
          if (header === 'finderDetails' && value) {
            // Try to parse JSON stored in finderDetails, else keep original
            try {
              value = JSON.parse(value);
            } catch (e) {
              // keep value as-is (string)
            }
          }
          item[header] = value !== undefined ? value : '';
        });
        // Filter out empty rows (no id)
        if (item.id) lostItemsData.push(item);
      });
    }

    const foundItemsData = [];
    if (!notFoundFound && foundItems.length > 0) {
      const headers = foundItems[0];
      foundItems.slice(1).forEach(row => {
        const item = {};
        headers.forEach((header, index) => {
          item[header] = row[index] !== undefined ? row[index] : '';
        });
        if (item.id) foundItemsData.push(item);
      });
    }

    return {
      lostItems: lostItemsData,
      foundItems: foundItemsData
    };
  } catch (error) {
    console.error('Error reading Excel database:', error);
    return { lostItems: [], foundItems: [] };
  }
}

/**
 * Writes data to Excel file
 */
async function writeExcelDatabase(data) {
  try {
    const workbook = XLSX.utils.book_new();

    // Lost items headers
    const lostItemsHeaders = [
      'id',
      'status',
      'itemName',
      'category',
      'location',
      'dateLost',
      'timeLost',
      'description',
      'contact',
      'reward',
      'type',
      'datePosted',
      'dateFound',
      'finderDetails' // will be written as JSON string if object
    ];

    // Found items headers (FULL version)
    const foundItemsHeaders = [
      'id',
      'status',
      'itemName',
      'category',
      'location',
      'dateFound',
      'description',
      'contact',
      'currentLocation',
      'originalLostItemId',
      'type',
      'datePosted',
      'finderName',
      'finderContact',
      'finderLocation',
      'finderNotes',
      'pickupTime',
      'reunionDate',
      'claimerName',
      'claimerEmail',
      'claimDescription',
      'claimLocation',
      'claimDate',
      'claimNotes',
      'claimStatus'
    ];

    // Convert lost items to rows
    const lostItemsRows = [lostItemsHeaders];
    (data.lostItems || []).forEach(item => {
      const row = lostItemsHeaders.map(header => {
        let val = item[header];
        if (header === 'finderDetails' && val && typeof val === 'object') {
          // stringify object to preserve fields in a single cell
          try {
            return JSON.stringify(val);
          } catch (e) {
            return String(val);
          }
        }
        return val !== undefined && val !== null ? val : '';
      });
      lostItemsRows.push(row);
    });

    // Convert found items to rows
    const foundItemsRows = [foundItemsHeaders];
    (data.foundItems || []).forEach(item => {
      const row = foundItemsHeaders.map(header => (item[header] !== undefined && item[header] !== null) ? item[header] : '');
      foundItemsRows.push(row);
    });

    // Create sheets
    const lostItemsSheet = XLSX.utils.aoa_to_sheet(lostItemsRows);
    const foundItemsSheet = XLSX.utils.aoa_to_sheet(foundItemsRows);

    // Add sheets to workbook
    XLSX.utils.book_append_sheet(workbook, lostItemsSheet, 'lostItems');
    XLSX.utils.book_append_sheet(workbook, foundItemsSheet, 'foundItems');

    // Write to file
    XLSX.writeFile(workbook, EXCEL_FILE);
    console.log('Excel database updated successfully.');
  } catch (error) {
    console.error('Error writing to Excel database:', error);
  }
}

/**
 * Generates a simple unique ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// --- API Routes ---

// GET /api/items - Fetch all lost and found items
app.get('/api/items', async (req, res) => {
  try {
    const data = await readExcelDatabase();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items from Excel database.' });
  }
});

// POST /api/items/lost - Add a new lost item
app.post('/api/items/lost', async (req, res) => {
  try {
    const db = await readExcelDatabase();

    const body = req.body || {};
    const newItem = {
      id: generateId(),
      status: body.status || 'active',
      itemName: body.itemName || '',
      category: body.category || '',
      location: body.location || '',
      dateLost: body.dateLost || '',
      timeLost: body.timeLost || '',
      description: body.description || '',
      contact: body.contact || '',
      reward: body.reward || '',
      type: 'lost',
      datePosted: body.datePosted || new Date().toISOString(),
      dateFound: body.dateFound || '',
      finderDetails: body.finderDetails || ''
    };

    db.lostItems = db.lostItems || [];
    db.lostItems.push(newItem);
    await writeExcelDatabase(db);
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error adding lost item:', error);
    res.status(500).json({ message: 'Error adding lost item to Excel database.' });
  }
});

// POST /api/items/found - Add a new found item
app.post('/api/items/found', async (req, res) => {
  try {
    const db = await readExcelDatabase();

    const body = req.body || {};
    const newItem = {
      id: generateId(),
      status: body.status || 'active',
      itemName: body.itemName || '',
      category: body.category || '',
      location: body.location || '',
      dateFound: body.dateFound || '',
      description: body.description || '',
      contact: body.contact || '',
      currentLocation: body.currentLocation || '',
      originalLostItemId: body.originalLostItemId || '',
      type: 'found',
      datePosted: body.datePosted || new Date().toISOString(),
      finderName: body.finderName || '',
      finderContact: body.finderContact || '',
      finderLocation: body.finderLocation || '',
      finderNotes: body.finderNotes || '',
      pickupTime: body.pickupTime || '',
      reunionDate: body.reunionDate || '',
      claimerName: body.claimerName || '',
      claimerEmail: body.claimerEmail || '',
      claimDescription: body.claimDescription || '',
      claimLocation: body.claimLocation || '',
      claimDate: body.claimDate || '',
      claimNotes: body.claimNotes || '',
      claimStatus: body.claimStatus || ''
    };

    db.foundItems = db.foundItems || [];
    db.foundItems.push(newItem);
    await writeExcelDatabase(db);
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error adding found item:', error);
    res.status(500).json({ message: 'Error adding found item to Excel database.' });
  }
});

// PUT /api/items/:type/:id - Update an item's status (and optionally store finderDetails)
app.put('/api/items/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  const { status, finderDetails } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'Status is required for an update.' });
  }

  try {
    const db = await readExcelDatabase();
    const itemCollection = type === 'lost' ? db.lostItems : db.foundItems;

    if (!Array.isArray(itemCollection)) {
      return res.status(404).json({ message: 'Item collection not found.' });
    }

    const itemIndex = itemCollection.findIndex(item => item.id === id);

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    // Update status
    itemCollection[itemIndex].status = status;

    // If finderDetails provided and marking as found (for lost items), store structured finderDetails and update dateFound
    if (finderDetails) {
      // normalize for both lost and found item records
      if (status === 'found' || status === 'reunited') {
        // For lost item update (if type is lost)
        if (type === 'lost') {
          itemCollection[itemIndex].finderDetails = {
            name: finderDetails.name || '',
            contact: finderDetails.contact || '',
            location: finderDetails.location || '',
            notes: finderDetails.notes || '',
            pickupTime: finderDetails.pickupTime || '',
            reunionDate: finderDetails.reunionDate || new Date().toISOString()
          };
          itemCollection[itemIndex].dateFound = new Date().toISOString().split('T')[0];
        } else {
          // For found item (type === 'found'), set finderName/contact fields
          itemCollection[itemIndex].finderName = finderDetails.name || itemCollection[itemIndex].finderName || '';
          itemCollection[itemIndex].finderContact = finderDetails.contact || itemCollection[itemIndex].finderContact || '';
          itemCollection[itemIndex].finderLocation = finderDetails.location || itemCollection[itemIndex].finderLocation || '';
          itemCollection[itemIndex].finderNotes = finderDetails.notes || itemCollection[itemIndex].finderNotes || '';
          itemCollection[itemIndex].pickupTime = finderDetails.pickupTime || itemCollection[itemIndex].pickupTime || '';
          itemCollection[itemIndex].reunionDate = finderDetails.reunionDate || itemCollection[itemIndex].reunionDate || new Date().toISOString();
          itemCollection[itemIndex].dateFound = itemCollection[itemIndex].dateFound || new Date().toISOString().split('T')[0];
        }
      }
    }

    await writeExcelDatabase(db);
    res.status(200).json(itemCollection[itemIndex]);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ message: 'Error updating item in Excel database.' });
  }
});

// POST /api/finder-details - Save finder details to Excel and create corresponding found record
app.post('/api/finder-details', async (req, res) => {
  try {
    const { itemId, finderName, finderContact, finderLocation, finderNotes, pickupTime } = req.body;

    if (!itemId || !finderName || !finderContact || !finderLocation) {
      return res.status(400).json({ message: 'Missing required finder details.' });
    }

    const db = await readExcelDatabase();

    const lostItemIndex = (db.lostItems || []).findIndex(item => item.id === itemId);

    if (lostItemIndex === -1) {
      return res.status(404).json({ message: 'Lost item not found.' });
    }

    const lostItem = db.lostItems[lostItemIndex];

    // Update lost item with finder details
    db.lostItems[lostItemIndex].status = 'found';
    db.lostItems[lostItemIndex].finderDetails = {
      name: finderName,
      contact: finderContact,
      location: finderLocation,
      notes: finderNotes || '',
      pickupTime: pickupTime || '',
      reunionDate: new Date().toISOString()
    };
    db.lostItems[lostItemIndex].dateFound = new Date().toISOString().split('T')[0];

    // Create a new found item record with finder details
    const newFoundItem = {
      id: generateId(),
      status: 'reunited',
      itemName: lostItem.itemName || '',
      category: lostItem.category || '',
      location: lostItem.location || '',
      dateFound: new Date().toISOString().split('T')[0],
      description: `This item was reunited via the portal. Original description: ${lostItem.description || ''}`,
      contact: finderContact,
      currentLocation: finderLocation,
      originalLostItemId: itemId,
      type: 'found',
      datePosted: new Date().toISOString(),
      finderName: finderName,
      finderContact: finderContact,
      finderLocation: finderLocation,
      finderNotes: finderNotes || '',
      pickupTime: pickupTime || '',
      reunionDate: new Date().toISOString(),
      claimerName: '',
      claimerEmail: '',
      claimDescription: '',
      claimLocation: '',
      claimDate: '',
      claimNotes: '',
      claimStatus: ''
    };

    db.foundItems = db.foundItems || [];
    db.foundItems.push(newFoundItem);

    await writeExcelDatabase(db);

    // Send email notification to the original owner (if email present)
    if (lostItem.contact && typeof lostItem.contact === 'string' && lostItem.contact.includes('@')) {
      const emailData = {
        itemName: lostItem.itemName,
        category: lostItem.category,
        description: lostItem.description,
        location: lostItem.location,
        finderName,
        finderContact,
        finderLocation,
        pickupTime,
        finderNotes
      };

      const emailSubject = `🎉 Great News! Your ${lostItem.itemName} Has Been Found!`;
      const emailContent = createEmailTemplate('item_found', emailData);

      // Fire-and-forget email send
      sendEmail(lostItem.contact, emailSubject, emailContent)
        .then(success => {
          if (success) {
            console.log(`Email notification sent to ${lostItem.contact} for found item: ${lostItem.itemName}`);
          } else {
            console.log(`Failed to send email notification to ${lostItem.contact}`);
          }
        })
        .catch(error => {
          console.error('Error sending email notification:', error);
        });
    }

    res.status(201).json({
      message: 'Finder details saved successfully',
      lostItem: db.lostItems[lostItemIndex],
      foundItem: newFoundItem
    });
  } catch (error) {
    console.error('Error saving finder details:', error);
    res.status(500).json({ message: 'Error saving finder details to Excel database.' });
  }
});

// POST /api/item-claim - Save item claim details to Excel and notify claimer/finder
app.post('/api/item-claim', async (req, res) => {
  try {
    const { itemId, claimerName, claimerEmail, claimDescription, claimLocation, claimDate, claimNotes } = req.body;

    if (!itemId || !claimerName || !claimerEmail || !claimDescription || !claimLocation || !claimDate) {
      return res.status(400).json({ message: 'Missing required claim details.' });
    }

    const db = await readExcelDatabase();

    const foundItemIndex = (db.foundItems || []).findIndex(item => item.id === itemId);

    if (foundItemIndex === -1) {
      return res.status(404).json({ message: 'Found item not found.' });
    }

    const foundItem = db.foundItems[foundItemIndex];

    // Update the found item with claim details
    db.foundItems[foundItemIndex].status = 'claimed';
    db.foundItems[foundItemIndex].claimerName = claimerName;
    db.foundItems[foundItemIndex].claimerEmail = claimerEmail;
    db.foundItems[foundItemIndex].claimDescription = claimDescription;
    db.foundItems[foundItemIndex].claimLocation = claimLocation;
    db.foundItems[foundItemIndex].claimDate = claimDate;
    db.foundItems[foundItemIndex].claimNotes = claimNotes || '';
    db.foundItems[foundItemIndex].claimStatus = 'pending';

    await writeExcelDatabase(db);

    // Send claim confirmation email to claimer (if email present)
    if (claimerEmail && claimerEmail.includes('@')) {
      const claimerEmailData = {
        itemName: foundItem.itemName,
        category: foundItem.category,
        foundLocation: foundItem.location,
        claimerName,
        claimerEmail,
        claimDescription,
        claimLocation,
        claimDate,
        claimNotes
      };

      const claimerEmailSubject = `📋 Claim Submitted for ${foundItem.itemName}`;
      const claimerEmailContent = createEmailTemplate('item_claimed', claimerEmailData);

      sendEmail(claimerEmail, claimerEmailSubject, claimerEmailContent)
        .then(success => {
          if (success) {
            console.log(`Claim confirmation email sent to ${claimerEmail} for item: ${foundItem.itemName}`);
          } else {
            console.log(`Failed to send claim confirmation email to ${claimerEmail}`);
          }
        })
        .catch(error => {
          console.error('Error sending claim confirmation email:', error);
        });
    }

    // Send notification email to the finder (if finder contact is present and looks like an email)
    if (foundItem.finderContact && typeof foundItem.finderContact === 'string' && foundItem.finderContact.includes('@')) {
      const finderEmailData = {
        itemName: foundItem.itemName,
        category: foundItem.category,
        foundLocation: foundItem.location,
        dateFound: foundItem.dateFound,
        claimerName,
        claimerEmail,
        claimDescription,
        claimLocation,
        claimDate,
        claimNotes
      };

      const finderEmailSubject = `🔔 Someone Wants to Claim Your Found Item: ${foundItem.itemName}`;
      const finderEmailContent = createEmailTemplate('finder_notified', finderEmailData);

      sendEmail(foundItem.finderContact, finderEmailSubject, finderEmailContent)
        .then(success => {
          if (success) {
            console.log(`Finder notification email sent to ${foundItem.finderContact} for item: ${foundItem.itemName}`);
          } else {
            console.log(`Failed to send finder notification email to ${foundItem.finderContact}`);
          }
        })
        .catch(error => {
          console.error('Error sending finder notification email:', error);
        });
    }

    res.status(201).json({
      message: 'Claim submitted successfully',
      foundItem: db.foundItems[foundItemIndex]
    });
  } catch (error) {
    console.error('Error saving claim details:', error);
    res.status(500).json({ message: 'Error saving claim details to Excel database.' });
  }
});

// GET /api/export - Download the Excel file
app.get('/api/export', (req, res) => {
  try {
    res.download(EXCEL_FILE, 'lost_found_items.xlsx', (err) => {
      if (err) {
        res.status(500).json({ message: 'Error downloading Excel file.' });
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error exporting Excel file.' });
  }
});

// GET /api/finder-details/:itemId - Get finder details for a specific item
app.get('/api/finder-details/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const db = await readExcelDatabase();

    // First check in lost items (for items that were found)
    const lostItem = (db.lostItems || []).find(item => item.id === itemId && (item.status === 'found' || item.status === 'reunited' || item.status === 'active'));
    if (lostItem && lostItem.finderDetails) {
      return res.json({
        success: true,
        finderDetails: lostItem.finderDetails,
        itemName: lostItem.itemName,
        category: lostItem.category
      });
    }

    // Then check in found items
    const foundItem = (db.foundItems || []).find(item => item.id === itemId);
    if (foundItem) {
      const finderDetails = {
        name: foundItem.finderName || 'Unknown',
        contact: foundItem.finderContact || (foundItem.contact || 'Not provided'),
        location: foundItem.finderLocation || (foundItem.currentLocation || 'Not specified'),
        notes: foundItem.finderNotes || '',
        pickupTime: foundItem.pickupTime || 'Not specified'
      };

      return res.json({
        success: true,
        finderDetails,
        itemName: foundItem.itemName,
        category: foundItem.category
      });
    }

    res.status(404).json({
      success: false,
      message: 'Item not found or no finder details available.'
    });
  } catch (error) {
    console.error('Error retrieving finder details:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving finder details from database.'
    });
  }
});

// --- Server Startup ---
async function startServer() {
  await initializeExcelDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 Campus Find the Lost Portal Server (Excel Backend) running on port ${PORT}`);
    console.log(`📊 Data is now stored in Excel format: ${EXCEL_FILE}`);
    console.log(`🔗 Open your application at: http://localhost:${PORT}`);
    console.log(`📥 Export data: http://localhost:${PORT}/api/export`);
  });
}

startServer().catch(console.error);

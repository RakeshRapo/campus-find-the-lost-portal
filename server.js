const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');
const xlsx = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Nodemailer Configuration with SendGrid ---
const transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    auth: {
        user: 'apikey', // DO NOT change
        pass: process.env.SENDGRID_API_KEY // Railway variable
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
});
app.use(express.static(path.join(__dirname, '.')));

// Database file path
const DB_FILE = path.join(__dirname, 'database.json');

// --- Database Helpers ---
async function initializeDatabase() {
    try {
        await fs.access(DB_FILE);
    } catch {
        console.log('Database not found. Creating a new one...');
        const initialData = { lostItems: [], foundItems: [] };
        await fs.writeFile(DB_FILE, JSON.stringify(initialData, null, 2));
    }
}
async function readDatabase() {
    try {
        const data = await fs.readFile(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return { lostItems: [], foundItems: [] };
    }
}
async function writeDatabase(data) {
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// --- API Routes ---

// Fetch all lost + found
app.get('/api/items', async (req, res) => {
    try {
        const data = await readDatabase();
        res.json(data);
    } catch {
        res.status(500).json({ message: 'Error fetching items.' });
    }
});

// Add lost item
app.post('/api/items/lost', async (req, res) => {
    try {
        const db = await readDatabase();
        const newItem = { 
            id: generateId(), 
            status: 'active', 
            reportedAt: new Date().toISOString(),
            ...req.body 
        };
        db.lostItems.push(newItem);
        await writeDatabase(db);
        res.status(201).json(newItem);
    } catch {
        res.status(500).json({ message: 'Error adding lost item.' });
    }
});

// Add found item (finder MUST include posterName + posterEmail)
app.post('/api/items/found', async (req, res) => {
    try {
        const { posterName, posterEmail } = req.body;
        if (!posterName || !posterEmail) {
            return res.status(400).json({ message: 'Finder name and email are required.' });
        }
        const db = await readDatabase();
        const newItem = { 
            id: generateId(), 
            status: 'active', 
            reportedAt: new Date().toISOString(),
            ...req.body 
        };
        db.foundItems.push(newItem);
        await writeDatabase(db);
        res.status(201).json(newItem);
    } catch {
        res.status(500).json({ message: 'Error adding found item.' });
    }
});

// Update item status
app.put('/api/items/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'Status required.' });

    try {
        const db = await readDatabase();
        const items = type === 'lost' ? db.lostItems : db.foundItems;
        const itemIndex = items.findIndex(item => item.id === id);
        if (itemIndex === -1) return res.status(404).json({ message: 'Item not found.' });

        items[itemIndex].status = status;
        await writeDatabase(db);
        res.json(items[itemIndex]);
    } catch {
        res.status(500).json({ message: 'Error updating item.' });
    }
});

// Save finder details for a lost item
app.post('/api/finder-details', async (req, res) => {
    const { itemId, finderName, finderContact, finderLocation, finderNotes, pickupTime } = req.body;
    if (!itemId || !finderName || !finderContact) {
        return res.status(400).json({ success: false, message: 'Missing fields.' });
    }
    try {
        const db = await readDatabase();
        const idx = db.lostItems.findIndex(item => item.id === itemId);
        if (idx === -1) return res.status(404).json({ success: false, message: 'Lost item not found' });

        db.lostItems[idx].status = 'found';
        db.lostItems[idx].finderDetails = {
            name: finderName,
            contact: finderContact,
            location: finderLocation,
            notes: finderNotes,
            pickupTime,
            savedAt: new Date().toISOString()
        };

        await writeDatabase(db);
        res.json({ success: true, finderDetails: db.lostItems[idx].finderDetails });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error saving finder details' });
    }
});

// Fetch finder details
app.get('/api/finder-details/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const db = await readDatabase();
        const item = db.lostItems.find(i => i.id === itemId);
        if (!item || !item.finderDetails) {
            return res.json({ success: false, message: 'Finder details not found' });
        }
        res.json({ success: true, itemName: item.itemName, category: item.category, finderDetails: item.finderDetails });
    } catch {
        res.status(500).json({ success: false, message: 'Error fetching finder details' });
    }
});

// --- Claim Notification (emails Finder, not claimer) ---
app.post('/api/send-claim-notification', async (req, res) => {
    const { itemId, claimerName, claimerEmail, claimDescription } = req.body;
    if (!itemId) return res.status(400).json({ message: 'Item ID required.' });

    try {
        const db = await readDatabase();
        const foundItem = db.foundItems.find(item => item.id === itemId);

        if (!foundItem || !foundItem.posterEmail) {
            return res.status(404).json({ message: 'Finder email not found.' });
        }

        // Save claimer info in DB
        foundItem.claimerDetails = {
            name: claimerName,
            email: claimerEmail,
            description: claimDescription,
            submittedAt: new Date().toISOString()
        };
        await writeDatabase(db);

        const mailOptions = {
            from: 'verified_sender@example.com', // Must be a SendGrid verified sender
            to: foundItem.posterEmail,          // ✅ Email goes to Finder
            subject: `New Claim on Your Found Item: ${foundItem.itemName || 'Unknown Item'}`,
            html: `
                <h3>Hello ${foundItem.posterName || 'Finder'},</h3>
                <p>Someone has submitted a claim for the item you posted as found: 
                   <strong>${foundItem.itemName || 'Item'}</strong>.</p>
                <p>Claimer details:</p>
                <ul>
                    <li><strong>Name:</strong> ${claimerName}</li>
                    <li><strong>Email:</strong> ${claimerEmail}</li>
                </ul>
                <p><strong>Claim Description:</strong> ${claimDescription}</p>
                <p>Please contact them to verify and arrange return of the item.</p>
                <br>
                <p>Best regards,<br>The Campus Lost & Found Team</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to finder: ${foundItem.posterEmail}`);
        res.json({ message: 'Email sent successfully to finder.' });
    } catch (err) {
        console.error('❌ Error sending claim email:', err);
        res.status(500).json({ message: 'Failed to send email.' });
    }
});

// --- Export data to Excel ---
app.get('/api/export', async (req, res) => {
    try {
        const db = await readDatabase();

        // Prepare Lost Items sheet
        const lostSheetData = db.lostItems.map(item => ({
            ID: item.id,
            Item: item.itemName || '',
            Category: item.category || '',
            Status: item.status || '',
            ReportedAt: item.reportedAt || '',
            FinderName: item.finderDetails?.name || '',
            FinderContact: item.finderDetails?.contact || '',
            FinderLocation: item.finderDetails?.location || '',
            FinderNotes: item.finderDetails?.notes || '',
            PickupTime: item.finderDetails?.pickupTime || '',
            FinderSavedAt: item.finderDetails?.savedAt || ''
        }));

        // Prepare Found Items sheet
        const foundSheetData = db.foundItems.map(item => ({
            ID: item.id,
            Item: item.itemName || '',
            Category: item.category || '',
            Status: item.status || '',
            PostedAt: item.reportedAt || '',
            FinderPosterName: item.posterName || '',
            FinderPosterEmail: item.posterEmail || '',
            ClaimerName: item.claimerDetails?.name || '',
            ClaimerEmail: item.claimerDetails?.email || '',
            ClaimDescription: item.claimerDetails?.description || '',
            ClaimSubmittedAt: item.claimerDetails?.submittedAt || ''
        }));

        // Create workbook
        const wb = xlsx.utils.book_new();
        const lostSheet = xlsx.utils.json_to_sheet(lostSheetData);
        const foundSheet = xlsx.utils.json_to_sheet(foundSheetData);

        xlsx.utils.book_append_sheet(wb, lostSheet, 'Lost Items');
        xlsx.utils.book_append_sheet(wb, foundSheet, 'Found Items');

        const filePath = path.join(__dirname, 'lost_found_items.xlsx');
        xlsx.writeFile(wb, filePath);

        res.download(filePath, 'lost_found_items.xlsx');
    } catch (err) {
        console.error('❌ Error exporting Excel:', err);
        res.status(500).json({ message: 'Error exporting Excel file.' });
    }
});

// --- Server ---
async function startServer() {
    await initializeDatabase();
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}
startServer().catch(console.error);

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Nodemailer with SendGrid ---
const transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    auth: {
        user: 'apikey', // DO NOT change
        pass: process.env.SENDGRID_API_KEY // Railway → Add SENDGRID_API_KEY
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

// Database file
const DB_FILE = path.join(__dirname, 'database.json');

// --- Database Helpers ---
async function initializeDatabase() {
    try {
        await fs.access(DB_FILE);
    } catch {
        console.log('📁 Database not found. Creating a new one...');
        const initialData = { lostItems: [], foundItems: [] };
        await fs.writeFile(DB_FILE, JSON.stringify(initialData, null, 2));
    }
}

async function readDatabase() {
    try {
        const data = await fs.readFile(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('❌ Error reading DB:', err);
        return { lostItems: [], foundItems: [] };
    }
}

async function writeDatabase(data) {
    try {
        await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('❌ Error writing DB:', err);
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// --- API Routes ---

// Get all items
app.get('/api/items', async (req, res) => {
    try {
        const data = await readDatabase();
        res.status(200).json(data);
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
            ...req.body
        };
        db.lostItems.push(newItem);
        await writeDatabase(db);
        res.status(201).json(newItem);
    } catch {
        res.status(500).json({ message: 'Error adding lost item.' });
    }
});

// Add found item (store finder email!)
app.post('/api/items/found', async (req, res) => {
    try {
        const db = await readDatabase();
        const newItem = {
            id: generateId(),
            status: 'active',
            posterName: req.body.posterName,   // Finder’s name
            posterEmail: req.body.posterEmail, // Finder’s email (📌 REQUIRED)
            ...req.body
        };
        db.foundItems.push(newItem);
        await writeDatabase(db);
        res.status(201).json(newItem);
    } catch {
        res.status(500).json({ message: 'Error adding found item.' });
    }
});

// Update status
app.put('/api/items/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'Status required.' });

    try {
        const db = await readDatabase();
        const items = type === 'lost' ? db.lostItems : db.foundItems;
        const idx = items.findIndex(item => item.id === id);

        if (idx === -1) return res.status(404).json({ message: 'Item not found.' });

        items[idx].status = status;
        await writeDatabase(db);
        res.status(200).json(items[idx]);
    } catch {
        res.status(500).json({ message: 'Error updating item.' });
    }
});

// Save Finder details (for lost item)
app.post('/api/finder-details', async (req, res) => {
    const { itemId, finderName, finderContact, finderLocation, finderNotes, pickupTime } = req.body;
    if (!itemId || !finderName || !finderContact) {
        return res.status(400).json({ success: false, message: 'Missing fields' });
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
        console.error('❌ Error saving finder details:', err);
        res.status(500).json({ success: false, message: 'Error saving finder details' });
    }
});

// Get Finder details
app.get('/api/finder-details/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const db = await readDatabase();
        const lostItem = db.lostItems.find(item => item.id === itemId);

        if (!lostItem || !lostItem.finderDetails) {
            return res.json({ success: false, message: 'Finder details not found' });
        }

        res.json({
            success: true,
            itemName: lostItem.itemName,
            category: lostItem.category,
            finderDetails: lostItem.finderDetails
        });
    } catch (err) {
        console.error('❌ Error fetching finder details:', err);
        res.status(500).json({ success: false, message: 'Error fetching finder details' });
    }
});

// --- Send Claim Notification (to Finder, not Claimer) ---
app.post('/api/send-claim-notification', async (req, res) => {
    const { itemId, claimerName, claimerEmail, claimDescription } = req.body;
    if (!itemId) return res.status(400).json({ message: 'Item ID required.' });

    try {
        const db = await readDatabase();
        const foundItem = db.foundItems.find(item => item.id === itemId);

        if (!foundItem || !foundItem.posterEmail) {
            return res.status(404).json({ message: 'Finder email not found.' });
        }

        const mailOptions = {
            from: 'verified_sender@example.com', // Must match SendGrid verified sender
            to: foundItem.posterEmail,           // 📩 Finder gets the email
            subject: `New Claim on Your Found Item: ${foundItem.itemName}`,
            html: `
                <h3>Hello ${foundItem.posterName || 'Finder'},</h3>
                <p>Someone has submitted a claim for the item you posted as found: <strong>${foundItem.itemName}</strong>.</p>
                <p>Here are the details of the claimer:</p>
                <ul>
                    <li><strong>Name:</strong> ${claimerName}</li>
                    <li><strong>Email:</strong> ${claimerEmail}</li>
                </ul>
                <p><strong>Claim Description:</strong> ${claimDescription}</p>
                <p>Please contact them to verify details and arrange the item return.</p>
                <br>
                <p>Best regards,<br>The Campus Lost & Found Team</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ Claim notification sent to finder:', foundItem.posterEmail);
        res.status(200).json({ message: 'Email sent successfully to finder.' });
    } catch (error) {
        console.error('❌ Email error:', error);
        res.status(500).json({ message: 'Failed to send email.', error: error.message });
    }
});

// --- Start Server ---
async function startServer() {
    await initializeDatabase();
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}
startServer().catch(console.error);

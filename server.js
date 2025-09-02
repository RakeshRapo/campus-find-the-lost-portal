const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Nodemailer Configuration with SendGrid ---
const transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    auth: {
        user: 'apikey', // Always 'apikey'
        pass: process.env.SENDGRID_API_KEY // Must be set in Railway environment
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Prevent caching for API responses
app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
});

app.use(express.static(path.join(__dirname, '.')));

// --- Excel Database Setup ---
const EXCEL_FILE = path.join(__dirname, 'lost_found_items.xlsx');

async function initializeDatabase() {
    try {
        await fs.access(EXCEL_FILE);
    } catch {
        console.log('Excel database not found. Creating...');
        const initialData = { lostItems: [], foundItems: [] };
        await writeExcelDatabase(initialData);
    }
}

async function readExcelDatabase() {
    try {
        const workbook = XLSX.readFile(EXCEL_FILE);

        function sheetToJSON(sheetName) {
            if (!workbook.Sheets[sheetName]) return [];
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
            return rows.map(row => {
                const parsedRow = {};
                for (const [key, value] of Object.entries(row)) {
                    try {
                        parsedRow[key] = typeof value === 'string' && value.startsWith('{')
                            ? JSON.parse(value)
                            : value;
                    } catch {
                        parsedRow[key] = value;
                    }
                }
                return parsedRow;
            });
        }

        return {
            lostItems: sheetToJSON('lostItems'),
            foundItems: sheetToJSON('foundItems')
        };
    } catch (error) {
        console.error('❌ Error reading Excel DB:', error);
        return { lostItems: [], foundItems: [] };
    }
}

async function writeExcelDatabase(data) {
    try {
        const workbook = XLSX.utils.book_new();

        function toSheet(items) {
            if (!items.length) return XLSX.utils.json_to_sheet([]);
            const headers = [...new Set(items.flatMap(item => Object.keys(item)))];
            const rows = items.map(item => {
                const row = {};
                headers.forEach(header => {
                    const value = item[header];
                    row[header] = typeof value === 'object' ? JSON.stringify(value) : (value ?? '');
                });
                return row;
            });
            return XLSX.utils.json_to_sheet(rows, { header: headers });
        }

        const lostSheet = toSheet(data.lostItems);
        const foundSheet = toSheet(data.foundItems);

        XLSX.utils.book_append_sheet(workbook, lostSheet, 'lostItems');
        XLSX.utils.book_append_sheet(workbook, foundSheet, 'foundItems');

        XLSX.writeFile(workbook, EXCEL_FILE);
        console.log('✅ Excel updated.');
    } catch (error) {
        console.error('❌ Error writing Excel DB:', error);
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// --- API Routes ---

// Fetch all items
app.get('/api/items', async (req, res) => {
    try {
        const data = await readExcelDatabase();
        res.status(200).json(data);
    } catch {
        res.status(500).json({ message: 'Error fetching items.' });
    }
});

// Add new lost item
app.post('/api/items/lost', async (req, res) => {
    try {
        const db = await readExcelDatabase();
        const newItem = { id: generateId(), status: 'active', ...req.body };
        db.lostItems.push(newItem);
        await writeExcelDatabase(db);
        res.status(201).json(newItem);
    } catch {
        res.status(500).json({ message: 'Error adding lost item.' });
    }
});

// Add new found item
app.post('/api/items/found', async (req, res) => {
    try {
        const db = await readExcelDatabase();
        const newItem = { id: generateId(), status: 'active', ...req.body };
        db.foundItems.push(newItem);
        await writeExcelDatabase(db);
        res.status(201).json(newItem);
    } catch {
        res.status(500).json({ message: 'Error adding found item.' });
    }
});

// Update item status
app.put('/api/items/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ message: 'Status is required.' });

    try {
        const db = await readExcelDatabase();
        const collection = type === 'lost' ? db.lostItems : db.foundItems;
        const index = collection.findIndex(item => item.id === id);

        if (index === -1) return res.status(404).json({ message: 'Item not found.' });

        collection[index].status = status;
        await writeExcelDatabase(db);
        res.status(200).json(collection[index]);
    } catch {
        res.status(500).json({ message: 'Error updating item.' });
    }
});

// Save Finder Details
app.post('/api/finder-details', async (req, res) => {
    const { itemId, finderName, finderContact, finderLocation, finderNotes, pickupTime } = req.body;
    if (!itemId || !finderName || !finderContact) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    try {
        const db = await readExcelDatabase();
        const itemIndex = db.lostItems.findIndex(item => item.id === itemId);
        if (itemIndex === -1) return res.status(404).json({ success: false, message: 'Lost item not found' });

        db.lostItems[itemIndex].status = 'found';
        db.lostItems[itemIndex].finderDetails = {
            name: finderName,
            contact: finderContact,
            location: finderLocation,
            notes: finderNotes,
            pickupTime,
            savedAt: new Date().toISOString()
        };

        await writeExcelDatabase(db);
        res.json({ success: true, finderDetails: db.lostItems[itemIndex].finderDetails });
    } catch (err) {
        console.error('Error saving finder details:', err);
        res.status(500).json({ success: false, message: 'Error saving finder details' });
    }
});

// Fetch Finder Details
app.get('/api/finder-details/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const db = await readExcelDatabase();
        const lostItem = db.lostItems.find(item => item.id === itemId);
        if (!lostItem || !lostItem.finderDetails) {
            return res.json({ success: false, message: 'Finder details not found' });
        }
        res.json({ success: true, itemName: lostItem.itemName, category: lostItem.category, finderDetails: lostItem.finderDetails });
    } catch (err) {
        console.error('Error fetching finder details:', err);
        res.status(500).json({ success: false, message: 'Error fetching finder details' });
    }
});

// Send Claim Notification Email
app.post('/api/send-claim-notification', async (req, res) => {
    const { toEmail, itemName, claimerName, claimerEmail, claimDescription } = req.body;
    if (!toEmail) return res.status(400).json({ message: 'Recipient email is required.' });

    const mailOptions = {
        from: 'verified_sender@example.com', // Replace with verified SendGrid sender
        to: toEmail,
        subject: `New Claim on Your Found Item: ${itemName}`,
        html: `
            <h3>Hello,</h3>
            <p>Someone has submitted a claim for the item you posted as found: <strong>${itemName}</strong>.</p>
            <ul>
                <li><strong>Name:</strong> ${claimerName}</li>
                <li><strong>Email:</strong> ${claimerEmail}</li>
            </ul>
            <p><strong>Claim Description:</strong> ${claimDescription}</p>
            <p>Please contact them to verify details and arrange for the item return.</p>
            <br>
            <p>Best regards,<br>The Campus Lost & Found Team</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('✅ Claim notification sent to:', toEmail);
        res.status(200).json({ message: 'Email sent successfully.' });
    } catch (error) {
        console.error('❌ Error sending email:', error);
        res.status(500).json({ message: 'Failed to send email notification.', error: error.message });
    }
});

// --- Server Startup ---
async function startServer() {
    await initializeDatabase();
    app.listen(PORT, () => {
        console.log(`🚀 Campus Find the Lost Portal running on port ${PORT}`);
        console.log(`📊 Excel storage at: ${EXCEL_FILE}`);
        console.log(`🔗 Open at: http://localhost:${PORT}`);
    });
}

startServer().catch(console.error);

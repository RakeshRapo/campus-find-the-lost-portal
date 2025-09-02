const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer'); // Import nodemailer

const app = express();
const PORT = process.env.PORT || 3000;

// --- Nodemailer Configuration with SendGrid ---
const transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false, // TLS is used with port 587
    auth: {
        user: 'apikey', // DO NOT change this, it's always 'apikey'
        pass: process.env.SENDGRID_API_KEY // Must be set in Railway Variables
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Add this middleware to prevent browser caching for API routes
app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
});

app.use(express.static(path.join(__dirname, '.')));

// Database file path
const DB_FILE = path.join(__dirname, 'database.json');

// --- Database Helper Functions ---
async function initializeDatabase() {
    try {
        await fs.access(DB_FILE);
    } catch (error) {
        console.log('Database file not found. Creating a new one...');
        const initialData = { lostItems: [], foundItems: [] };
        await fs.writeFile(DB_FILE, JSON.stringify(initialData, null, 2));
        console.log('Database file created successfully.');
    }
}

async function readDatabase() {
    try {
        const data = await fs.readFile(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading database:', error);
        return { lostItems: [], foundItems: [] };
    }
}

async function writeDatabase(data) {
    try {
        await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing to database:', error);
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// --- API Routes ---

// GET /api/items - Fetch all lost and found items
app.get('/api/items', async (req, res) => {
    try {
        const data = await readDatabase();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching items from database.' });
    }
});

// POST /api/items/lost - Add a new lost item
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
    } catch (error) {
        res.status(500).json({ message: 'Error adding lost item.' });
    }
});

// POST /api/items/found - Add a new found item
app.post('/api/items/found', async (req, res) => {
    try {
        const db = await readDatabase();
        const newItem = {
            id: generateId(),
            status: 'active',
            ...req.body
        };
        db.foundItems.push(newItem);
        await writeDatabase(db);
        res.status(201).json(newItem);
    } catch (error) {
        res.status(500).json({ message: 'Error adding found item.' });
    }
});

// PUT /api/items/:type/:id - Update an item's status
app.put('/api/items/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ message: 'Status is required for an update.' });
    }

    try {
        const db = await readDatabase();
        let itemFound = false;
        
        const itemCollection = type === 'lost' ? db.lostItems : db.foundItems;
        const itemIndex = itemCollection.findIndex(item => item.id === id);

        if (itemIndex !== -1) {
            itemCollection[itemIndex].status = status;
            itemFound = true;
        }

        if (!itemFound) {
            return res.status(404).json({ message: 'Item not found.' });
        }

        await writeDatabase(db);
        res.status(200).json(itemCollection[itemIndex]);
    } catch (error) {
        res.status(500).json({ message: 'Error updating item.' });
    }
});

// --- NEW API ROUTE TO SEND EMAIL NOTIFICATIONS ---
app.post('/api/send-claim-notification', async (req, res) => {
    const { toEmail, itemName, claimerName, claimerEmail, claimDescription } = req.body;

    if (!toEmail) {
        return res.status(400).json({ message: 'Recipient email is required.' });
    }

    const mailOptions = {
        from: 'verified_sender@example.com', // Must match your SendGrid verified sender
        to: toEmail, // Finder’s email
        subject: `New Claim on Your Found Item: ${itemName}`,
        html: `
            <h3>Hello,</h3>
            <p>Someone has submitted a claim for the item you posted as found: <strong>${itemName}</strong>.</p>
            <p>Here are the details of the person who claimed it:</p>
            <ul>
                <li><strong>Name:</strong> ${claimerName}</li>
                <li><strong>Email:</strong> ${claimerEmail}</li>
            </ul>
            <p><strong>Claim Description:</strong> ${claimDescription}</p>
            <p>Please contact them to verify the details and arrange for the item to be returned.</p>
            <br>
            <p>Best regards,<br>The Campus Lost & Found Team</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Claim notification email sent to:', toEmail);
        res.status(200).json({ message: 'Email sent successfully.' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ message: 'Failed to send email notification.', error: error.message });
    }
});

// --- Server Startup ---
async function startServer() {
    await initializeDatabase();
    app.listen(PORT, () => {
        console.log(`🚀 Campus Find the Lost Portal Server running on port ${PORT}`);
        console.log(`✅ Server is stable. No automatic data cleanup will run on startup.`);
        console.log(`🔗 Open your application at: http://localhost:${PORT}`);
    });
}

startServer().catch(console.error);

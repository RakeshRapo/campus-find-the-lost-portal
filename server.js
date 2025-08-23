const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
// Serve the front-end files (HTML, CSS, JS) from the root directory
app.use(express.static(path.join(__dirname, '.')));

// Database file path
const DB_FILE = path.join(__dirname, 'database.json');

// --- Database Helper Functions ---

/**
 * Ensures the database.json file exists. If not, it creates it.
 */
/**
 * Ensures the database.json file exists. If not, it creates it.
 * This function will NOT overwrite an existing database.
 */
async function initializeDatabase() {
    try {
        // This checks if the file is accessible. If it is, we do nothing.
        await fs.access(DB_FILE);
    } catch (error) {
        // This code only runs if fs.access fails (i.e., the file doesn't exist).
        console.log('Database file not found. Creating a new one...');
        const initialData = { lostItems: [], foundItems: [] };
        // We write the empty template only in this case.
        await fs.writeFile(DB_FILE, JSON.stringify(initialData, null, 2));
        console.log('Database file created successfully.');
    }
}

/**
 * Reads the entire database from the JSON file.
 */
async function readDatabase() {
    try {
        const data = await fs.readFile(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading database:', error);
        // Return a default structure on error to prevent crashes
        return { lostItems: [], foundItems: [] };
    }
}

/**
 * Writes the entire data object to the JSON file.
 */
async function writeDatabase(data) {
    try {
        await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing to database:', error);
    }
}

/**
 * Generates a simple unique ID.
 */
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
            ...req.body // The front-end now sends type and datePosted
        };
        db.lostItems.push(newItem);
        await writeDatabase(db);
        res.status(201).json(newItem);
    } catch (error) {
        res.status(500).json({ message: 'Error adding lost item.' });
    }
});
// In server.js

// Middleware
app.use(cors());
app.use(express.json());

// ADD THIS MIDDLEWARE TO PREVENT BROWSER CACHING FOR API ROUTES
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use(express.static(path.join(__dirname, '.'))); // Serve static files
// ... the rest of your file continues here
// POST /api/items/found - Add a new found item
app.post('/api/items/found', async (req, res) => {
    try {
        const db = await readDatabase();
        const newItem = {
            id: generateId(),
            status: 'active',
            ...req.body // The front-end now sends type and datePosted
        };
        db.foundItems.push(newItem);
        await writeDatabase(db);
        res.status(201).json(newItem);
    } catch (error) {
        res.status(500).json({ message: 'Error adding found item.' });
    }
});

// PUT /api/items/:type/:id - Update an item's status (e.g., to 'found' or 'archived')
app.put('/api/items/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    const { status } = req.body; // Expecting { "status": "new_status" }

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
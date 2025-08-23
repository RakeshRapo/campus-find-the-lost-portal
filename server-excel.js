const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Excel file path
const EXCEL_FILE = path.join(__dirname, 'lost_found_items.xlsx');

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
        
        // Define headers for lost items
        const lostItemsHeaders = [
            'id', 'status', 'itemName', 'category', 'location', 'dateLost', 
            'timeLost', 'description', 'contact', 'reward', 'type', 'datePosted',
            'dateFound', 'finderDetails'
        ];
        
        // Define headers for found items
        const foundItemsHeaders = [
            'id', 'status', 'itemName', 'category', 'location', 'dateFound', 
            'description', 'contact', 'currentLocation', 'originalLostItemId', 
            'type', 'datePosted', 'finderName', 'finderNotes', 'pickupTime', 
            'reunionDate'
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
        const lostItems = XLSX.utils.sheet_to_json(lostItemsSheet, { header: 1 });
        
        // Read found items sheet
        const foundItemsSheet = workbook.Sheets['foundItems'];
        const foundItems = XLSX.utils.sheet_to_json(foundItemsSheet, { header: 1 });
        
        // Convert to proper format (skip header row)
        const lostItemsData = lostItems.slice(1).map(row => {
            const item = {};
            lostItems[0].forEach((header, index) => {
                item[header] = row[index] || '';
            });
            return item;
        });
        
        const foundItemsData = foundItems.slice(1).map(row => {
            const item = {};
            foundItems[0].forEach((header, index) => {
                item[header] = row[index] || '';
            });
            return item;
        });
        
        return {
            lostItems: lostItemsData.filter(item => item.id), // Filter out empty rows
            foundItems: foundItemsData.filter(item => item.id)
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
        
        // Convert lost items to array format
        const lostItemsHeaders = [
            'id', 'status', 'itemName', 'category', 'location', 'dateLost', 
            'timeLost', 'description', 'contact', 'reward', 'type', 'datePosted',
            'dateFound', 'finderDetails'
        ];
        
        const foundItemsHeaders = [
            'id', 'status', 'itemName', 'category', 'location', 'dateFound', 
            'description', 'contact', 'currentLocation', 'originalLostItemId', 
            'type', 'datePosted', 'finderName', 'finderNotes', 'pickupTime', 
            'reunionDate'
        ];
        
        // Convert lost items to rows
        const lostItemsRows = [lostItemsHeaders];
        data.lostItems.forEach(item => {
            const row = lostItemsHeaders.map(header => item[header] || '');
            lostItemsRows.push(row);
        });
        
        // Convert found items to rows
        const foundItemsRows = [foundItemsHeaders];
        data.foundItems.forEach(item => {
            const row = foundItemsHeaders.map(header => item[header] || '');
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
        const newItem = {
            id: generateId(),
            status: 'active',
            ...req.body
        };
        db.lostItems.push(newItem);
        await writeExcelDatabase(db);
        res.status(201).json(newItem);
    } catch (error) {
        res.status(500).json({ message: 'Error adding lost item to Excel database.' });
    }
});

// POST /api/items/found - Add a new found item
app.post('/api/items/found', async (req, res) => {
    try {
        const db = await readExcelDatabase();
        const newItem = {
            id: generateId(),
            status: 'active',
            ...req.body
        };
        db.foundItems.push(newItem);
        await writeExcelDatabase(db);
        res.status(201).json(newItem);
    } catch (error) {
        res.status(500).json({ message: 'Error adding found item to Excel database.' });
    }
});

// PUT /api/items/:type/:id - Update an item's status
app.put('/api/items/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    const { status, finderDetails } = req.body;

    if (!status) {
        return res.status(400).json({ message: 'Status is required for an update.' });
    }

    try {
        const db = await readExcelDatabase();
        let itemFound = false;
        
        const itemCollection = type === 'lost' ? db.lostItems : db.foundItems;
        const itemIndex = itemCollection.findIndex(item => item.id === id);

        if (itemIndex !== -1) {
            itemCollection[itemIndex].status = status;
            
            // Store finder details if provided (when marking as found)
            if (finderDetails && status === 'found') {
                itemCollection[itemIndex].finderDetails = {
                    name: finderDetails.name || '',
                    contact: finderDetails.contact || '',
                    location: finderDetails.location || '',
                    notes: finderDetails.notes || '',
                    pickupTime: finderDetails.pickupTime || '',
                    reunionDate: finderDetails.reunionDate || new Date().toISOString()
                };
                
                // Also update the date when it was found
                itemCollection[itemIndex].dateFound = new Date().toISOString().split('T')[0];
            }
            
            itemFound = true;
        }

        if (!itemFound) {
            return res.status(404).json({ message: 'Item not found.' });
        }

        await writeExcelDatabase(db);
        res.status(200).json(itemCollection[itemIndex]);
    } catch (error) {
        res.status(500).json({ message: 'Error updating item in Excel database.' });
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

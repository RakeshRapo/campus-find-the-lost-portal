const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');
const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Excel file path
const EXCEL_FILE = path.join(__dirname, 'lost_found_items.xlsx');

// Email configuration
const emailConfig = {
  host: 'smtp.sendgrid.net',
    port: 587,
    secure: false, // TLS is used, so secure is false
    auth: {
        user: 'apikey', // The username for SendGrid is always 'apikey'
        pass: process.env.SENDGRID_API_KEY
    }
};

// Create email transporter
const transporter = nodemailer.createTransport(emailConfig);

// Email helper functions
async function sendEmail(to, subject, htmlContent) {
    try {
        const mailOptions = {
            from: emailConfig.auth.user,
            to: to,
            subject: subject,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

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
            'type', 'datePosted', 'finderName', 'finderContact', 'finderLocation', 
            'finderNotes', 'pickupTime', 'reunionDate', 'claimerName', 'claimerEmail',
            'claimDescription', 'claimLocation', 'claimDate', 'claimNotes', 'claimStatus'
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
            'type', 'datePosted', 'finderName', 'finderContact', 'finderLocation', 
            'finderNotes', 'pickupTime', 'reunionDate'
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

// POST /api/finder-details - Save finder details to Excel
app.post('/api/finder-details', async (req, res) => {
    try {
        const { itemId, finderName, finderContact, finderLocation, finderNotes, pickupTime } = req.body;
        
        if (!itemId || !finderName || !finderContact || !finderLocation) {
            return res.status(400).json({ message: 'Missing required finder details.' });
        }

        const db = await readExcelDatabase();
        
        // Find the lost item and update it with finder details
        const lostItemIndex = db.lostItems.findIndex(item => item.id === itemId);
        
        if (lostItemIndex !== -1) {
            const lostItem = db.lostItems[lostItemIndex];
            
            // Update the lost item with finder details
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
                itemName: lostItem.itemName,
                category: lostItem.category,
                location: lostItem.location,
                dateFound: new Date().toISOString().split('T')[0],
                description: `This item was reunited via the portal. Original description: ${lostItem.description}`,
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
                reunionDate: new Date().toISOString()
            };
            
            db.foundItems.push(newFoundItem);
            
            await writeExcelDatabase(db);
            
            // Send email notification to the original owner
            if (lostItem.contact && lostItem.contact.includes('@')) {
                const emailData = {
                    itemName: lostItem.itemName,
                    category: lostItem.category,
                    description: lostItem.description,
                    location: lostItem.location,
                    finderName: finderName,
                    finderContact: finderContact,
                    finderLocation: finderLocation,
                    pickupTime: pickupTime,
                    finderNotes: finderNotes
                };
                
                const emailSubject = `🎉 Great News! Your ${lostItem.itemName} Has Been Found!`;
                const emailContent = createEmailTemplate('item_found', emailData);
                
                // Send email asynchronously (don't wait for it to complete)
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
        } else {
            res.status(404).json({ message: 'Lost item not found.' });
        }
    } catch (error) {
        console.error('Error saving finder details:', error);
        res.status(500).json({ message: 'Error saving finder details to Excel database.' });
    }
});

// POST /api/item-claim - Save item claim details to Excel
app.post('/api/item-claim', async (req, res) => {
    try {
        const { itemId, claimerName, claimerEmail, claimDescription, claimLocation, claimDate, claimNotes } = req.body;
        
        if (!itemId || !claimerName || !claimerEmail || !claimDescription || !claimLocation || !claimDate) {
            return res.status(400).json({ message: 'Missing required claim details.' });
        }

        const db = await readExcelDatabase();
        
        // Find the found item and update it with claim details
        const foundItemIndex = db.foundItems.findIndex(item => item.id === itemId);
        
        if (foundItemIndex !== -1) {
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
            
            // Send email notification to the claimer
            if (claimerEmail && claimerEmail.includes('@')) {
                const claimerEmailData = {
                    itemName: foundItem.itemName,
                    category: foundItem.category,
                    foundLocation: foundItem.location,
                    claimerName: claimerName,
                    claimerEmail: claimerEmail,
                    claimDescription: claimDescription,
                    claimLocation: claimLocation,
                    claimDate: claimDate,
                    claimNotes: claimNotes
                };
                
                const claimerEmailSubject = `📋 Claim Submitted for ${foundItem.itemName}`;
                const claimerEmailContent = createEmailTemplate('item_claimed', claimerEmailData);
                
                // Send email to claimer asynchronously
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
            
            // Send email notification to the finder
            if (foundItem.finderContact && foundItem.finderContact.includes('@')) {
                const finderEmailData = {
                    itemName: foundItem.itemName,
                    category: foundItem.category,
                    foundLocation: foundItem.location,
                    dateFound: foundItem.dateFound,
                    claimerName: claimerName,
                    claimerEmail: claimerEmail,
                    claimDescription: claimDescription,
                    claimLocation: claimLocation,
                    claimDate: claimDate,
                    claimNotes: claimNotes
                };
                
                const finderEmailSubject = `🔔 Someone Wants to Claim Your Found Item: ${foundItem.itemName}`;
                const finderEmailContent = createEmailTemplate('finder_notified', finderEmailData);
                
                // Send email to finder asynchronously
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
        } else {
            res.status(404).json({ message: 'Found item not found.' });
        }
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
        const lostItem = db.lostItems.find(item => item.id === itemId && item.status === 'found');
        if (lostItem && lostItem.finderDetails) {
            return res.json({
                success: true,
                finderDetails: lostItem.finderDetails,
                itemName: lostItem.itemName,
                category: lostItem.category
            });
        }
        
        // Then check in found items
        const foundItem = db.foundItems.find(item => item.id === itemId);
        if (foundItem) {
            const finderDetails = {
                name: foundItem.finderName || 'Unknown',
                contact: foundItem.finderContact || 'Not provided',
                location: foundItem.finderLocation || 'Not specified',
                notes: foundItem.finderNotes || '',
                pickupTime: foundItem.pickupTime || 'Not specified'
            };
            
            return res.json({
                success: true,
                finderDetails: finderDetails,
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




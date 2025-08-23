const XLSX = require('xlsx');
const fs = require('fs').promises;
const path = require('path');

const JSON_FILE = path.join(__dirname, 'database.json');
const EXCEL_FILE = path.join(__dirname, 'lost_found_items.xlsx');

async function migrateToExcel() {
    try {
        console.log('🔄 Starting migration from JSON to Excel...');
        
        // Read existing JSON data
        const jsonData = await fs.readFile(JSON_FILE, 'utf8');
        const data = JSON.parse(jsonData);
        
        console.log(`📊 Found ${data.lostItems.length} lost items and ${data.foundItems.length} found items`);
        
        // Create workbook with two sheets
        const workbook = XLSX.utils.book_new();
        
        // Define headers for lost items
        const lostItemsHeaders = [
            'id', 'status', 'itemName', 'category', 'location', 'dateLost', 
            'timeLost', 'description', 'contact', 'reward', 'type', 'datePosted'
        ];
        
        // Define headers for found items
        const foundItemsHeaders = [
            'id', 'status', 'itemName', 'category', 'location', 'dateFound', 
            'description', 'contact', 'currentLocation', 'originalLostItemId', 
            'type', 'datePosted'
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
        
        // Write to Excel file
        XLSX.writeFile(workbook, EXCEL_FILE);
        
        console.log('✅ Migration completed successfully!');
        console.log(`📁 Excel file created: ${EXCEL_FILE}`);
        console.log(`📊 Lost items: ${data.lostItems.length}`);
        console.log(`📊 Found items: ${data.foundItems.length}`);
        console.log('\n🚀 You can now run the Excel server with: npm run start:excel');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        console.log('Make sure you have installed the xlsx package: npm install');
    }
}

// Run migration
migrateToExcel();

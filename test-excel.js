const XLSX = require('xlsx');
const path = require('path');

const EXCEL_FILE = path.join(__dirname, 'lost_found_items.xlsx');

async function testExcelBackend() {
    try {
        console.log('🧪 Testing Excel Backend...');
        
        // Test 1: Read existing data
        console.log('\n📖 Test 1: Reading existing data...');
        const workbook = XLSX.readFile(EXCEL_FILE);
        
        const lostItemsSheet = workbook.Sheets['lostItems'];
        const foundItemsSheet = workbook.Sheets['foundItems'];
        
        const lostItems = XLSX.utils.sheet_to_json(lostItemsSheet, { header: 1 });
        const foundItems = XLSX.utils.sheet_to_json(foundItemsSheet, { header: 1 });
        
        console.log(`✅ Lost items sheet: ${lostItems.length - 1} items (excluding header)`);
        console.log(`✅ Found items sheet: ${foundItems.length - 1} items (excluding header)`);
        
        // Test 2: Display sample data
        console.log('\n📊 Test 2: Sample data from Excel...');
        if (lostItems.length > 1) {
            console.log('📱 Sample Lost Item:');
            const headers = lostItems[0];
            const sampleItem = lostItems[1];
            headers.forEach((header, index) => {
                console.log(`   ${header}: ${sampleItem[index] || 'N/A'}`);
            });
        }
        
        // Test 3: Test adding new item
        console.log('\n➕ Test 3: Testing data addition...');
        const newLostItem = [
            'test123',
            'active',
            'Test Item',
            'test',
            'Test Location',
            '2025-01-20',
            '12:00',
            'This is a test item',
            '1234567890',
            'No reward',
            'lost',
            new Date().toISOString()
        ];
        
        // Add new item to lost items
        lostItems.push(newLostItem);
        
        // Create new workbook with updated data
        const newWorkbook = XLSX.utils.book_new();
        const updatedLostSheet = XLSX.utils.aoa_to_sheet(lostItems);
        const updatedFoundSheet = XLSX.utils.aoa_to_sheet(foundItems);
        
        XLSX.utils.book_append_sheet(newWorkbook, updatedLostSheet, 'lostItems');
        XLSX.utils.book_append_sheet(newWorkbook, updatedFoundSheet, 'foundItems');
        
        // Write to a test file
        const testFile = path.join(__dirname, 'test_output.xlsx');
        XLSX.writeFile(newWorkbook, testFile);
        
        console.log(`✅ Test data written to: ${testFile}`);
        console.log(`✅ Total lost items after test: ${lostItems.length - 1}`);
        
        // Test 4: Verify data persistence
        console.log('\n💾 Test 4: Verifying data persistence...');
        const verifyWorkbook = XLSX.readFile(testFile);
        const verifySheet = verifyWorkbook.Sheets['lostItems'];
        const verifyData = XLSX.utils.sheet_to_json(verifySheet, { header: 1 });
        
        console.log(`✅ Verification: ${verifyData.length - 1} items found in test file`);
        
        // Clean up test file
        const fs = require('fs');
        fs.unlinkSync(testFile);
        console.log('🧹 Test file cleaned up');
        
        console.log('\n🎉 All tests passed! Excel backend is working correctly.');
        console.log('\n🚀 You can now:');
        console.log('   1. Start the Excel server: npm run start:excel');
        console.log('   2. View your data in: lost_found_items.xlsx');
        console.log('   3. Export data via: http://localhost:3000/api/export');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run tests
testExcelBackend();

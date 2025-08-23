# Find the Lost Project - Excel Backend

This project now supports Excel as a backend storage system for lost and found items, providing better data management and persistence.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Migrate Existing Data (Optional)
If you have existing data in `database.json`, migrate it to Excel:
```bash
node migrate-to-excel.js
```

### 3. Start the Excel Server
```bash
npm run start:excel
```

## 📊 Excel File Structure

The system creates an Excel file (`lost_found_items.xlsx`) with two sheets:

### Lost Items Sheet
- **Headers**: id, status, itemName, category, location, dateLost, timeLost, description, contact, reward, type, datePosted
- **Data**: All lost items with their details

### Found Items Sheet  
- **Headers**: id, status, itemName, category, location, dateFound, description, contact, currentLocation, originalLostItemId, type, datePosted
- **Data**: All found items with their details

## 🔧 Available Commands

- `npm start` - Run the original JSON-based server
- `npm run start:excel` - Run the new Excel-based server
- `npm run dev` - Run JSON server with nodemon (development)
- `npm run dev:excel` - Run Excel server with nodemon (development)

## 📥 Export Data

Access the Excel file directly:
- **URL**: `http://localhost:3000/api/export`
- **File**: `lost_found_items.xlsx` (created in project root)

## 💾 Data Persistence

- **Excel files persist** between server restarts
- **Data is automatically saved** when items are added/updated
- **Excel format** makes it easy to view and analyze data
- **Backup friendly** - you can easily copy and share the Excel file

## 🔄 Migration from JSON

The migration script (`migrate-to-excel.js`) will:
1. Read your existing `database.json` file
2. Convert all data to Excel format
3. Create `lost_found_items.xlsx` with proper structure
4. Preserve all existing item data

## 📁 File Structure

```
Findthelostproject/
├── server.js              # Original JSON-based server
├── server-excel.js        # New Excel-based server
├── migrate-to-excel.js    # Migration script
├── database.json          # Original JSON data
├── lost_found_items.xlsx  # New Excel database (created automatically)
├── package.json           # Dependencies and scripts
└── README-EXCEL.md        # This file
```

## 🌟 Benefits of Excel Backend

1. **Better Data Visualization** - View data in familiar Excel format
2. **Easy Data Analysis** - Use Excel's built-in tools for sorting, filtering, etc.
3. **Data Portability** - Share Excel files easily with others
4. **Backup & Recovery** - Simple file-based backup system
5. **Professional Format** - Excel files are widely accepted in professional environments

## ⚠️ Important Notes

- The Excel file is automatically created when you first run the server
- All data operations (add, update, delete) are immediately saved to Excel
- The system maintains backward compatibility with your existing frontend
- You can switch between JSON and Excel servers by changing the start command

## 🆘 Troubleshooting

### Excel file not created
- Make sure you have write permissions in the project directory
- Check that the `xlsx` package is installed: `npm install xlsx`

### Data not persisting
- Verify the Excel file exists in your project root
- Check server console for any error messages
- Ensure the server has write permissions to the Excel file

### Migration issues
- Make sure your `database.json` file is valid JSON
- Check that all required fields are present in your data
- Run `npm install` before running the migration script

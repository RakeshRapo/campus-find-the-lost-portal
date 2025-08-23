# 🎯 Campus Find the Lost Portal

A comprehensive web portal for campus lost and found items with **Excel backend storage** for persistent data management.

![Campus Portal](https://img.shields.io/badge/Status-Active-brightgreen)
![Backend](https://img.shields.io/badge/Backend-Excel-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🌟 **Live Demo**
**Coming Soon** - Deploy to your preferred hosting platform!

## ✨ **Features**

- 🔍 **Lost Item Reporting** - Report lost items with detailed descriptions
- 🎯 **Found Item Management** - Manage found items and reunite them with owners
- 📊 **Excel Backend Storage** - All data stored in Excel format for easy management
- 🔄 **Real-time Updates** - Instant updates and status changes
- 📱 **Responsive Design** - Works on all devices (desktop, tablet, mobile)
- 🎨 **Modern UI/UX** - Clean, intuitive interface
- 💾 **Data Persistence** - Data survives server restarts and page refreshes
- 📥 **Export Functionality** - Download data in Excel format

## 🚀 **Quick Start**

### **Option 1: Deploy to Your Server**

1. **Clone the Repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/campus-find-the-lost-portal.git
   cd campus-find-the-lost-portal
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start the Server**
   ```bash
   npm run start:excel
   ```

4. **Access Your Application**
   Open `http://localhost:3000` in your browser

### **Option 2: Deploy to Cloud Platforms**

#### **Deploy to Heroku:**
[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/YOUR_USERNAME/campus-find-the-lost-portal)

#### **Deploy to Railway:**
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/new?template=https://github.com/YOUR_USERNAME/campus-find-the-lost-portal)

#### **Deploy to Render:**
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## 🛠️ **Technology Stack**

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: Excel (.xlsx) files with XLSX library
- **Styling**: Custom CSS with responsive design
- **Deployment**: Ready for Heroku, Railway, Render, Vercel, and more

## 📊 **Data Structure**

### **Lost Items Sheet:**
- `id` - Unique identifier
- `status` - Item status (active, found, archived)
- `itemName` - Name of the lost item
- `category` - Item category (electronics, jewelry, etc.)
- `location` - Where the item was lost
- `dateLost` - Date when item was lost
- `timeLost` - Time when item was lost
- `description` - Detailed description
- `contact` - Contact information
- `reward` - Reward amount (if any)
- `type` - Item type (lost)
- `datePosted` - When the report was posted

### **Found Items Sheet:**
- `id` - Unique identifier
- `status` - Item status
- `itemName` - Name of the found item
- `category` - Item category
- `location` - Where the item was found
- `dateFound` - Date when item was found
- `description` - Description of the found item
- `contact` - Contact information
- `currentLocation` - Where the item is currently stored
- `originalLostItemId` - Link to original lost item (if applicable)
- `type` - Item type (found)
- `datePosted` - When the item was reported found

## 🔧 **Available Scripts**

| Command | Description |
|---------|-------------|
| `npm start` | Start JSON backend server |
| `npm run start:excel` | Start Excel backend server |
| `npm run dev` | Start JSON server with auto-restart |
| `npm run dev:excel` | Start Excel server with auto-restart |
| `npm run migrate` | Migrate data from JSON to Excel |

## 🌐 **API Endpoints**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/items` | Fetch all lost and found items |
| `POST` | `/api/items/lost` | Add a new lost item |
| `POST` | `/api/items/found` | Add a new found item |
| `PUT` | `/api/items/:type/:id` | Update item status |
| `GET` | `/api/export` | Download Excel file |

## 📁 **Project Structure**

```
campus-find-the-lost-portal/
├── 📄 index.html              # Main application page
├── 🎨 style.css               # Main stylesheet
├── ⚡ script.js               # Frontend JavaScript
├── 🖥️ server-excel.js         # Excel backend server
├── 🖥️ server.js               # JSON backend server
├── 📊 migrate-to-excel.js     # Data migration script
├── 📦 package.json            # Dependencies and scripts
├── 📖 README.md               # This file
├── 📋 .gitignore              # Git ignore rules
└── 📁 node_modules/           # Dependencies (auto-generated)
```

## 🚀 **Deployment Options**

### **1. Heroku (Recommended for Beginners)**
- Free tier available
- Easy deployment
- Automatic scaling

### **2. Railway**
- Modern platform
- Easy deployment
- Good free tier

### **3. Render**
- Simple deployment
- Good performance
- Free tier available

### **4. Vercel**
- Great for frontend
- Easy deployment
- Good performance

### **5. Your Own Server**
- Full control
- Custom domain
- Unlimited resources

## 📱 **Usage Instructions**

### **For Users:**
1. **Report Lost Item**: Fill out the lost item form with details
2. **Search Found Items**: Browse through found items
3. **Contact Owner**: Use provided contact information
4. **Mark as Found**: Update status when items are reunited

### **For Administrators:**
1. **Monitor Reports**: View all lost and found items
2. **Export Data**: Download Excel files for analysis
3. **Manage Status**: Update item statuses as needed
4. **Backup Data**: Copy Excel files for safekeeping

## 🔒 **Security Features**

- Input validation and sanitization
- CORS protection
- Rate limiting (can be added)
- Data validation before storage

## 🆘 **Troubleshooting**

### **Common Issues:**

1. **Server won't start**
   - Check if port 3000 is available
   - Ensure all dependencies are installed
   - Check for syntax errors in server files

2. **Data not persisting**
   - Verify Excel file permissions
   - Check server console for errors
   - Ensure Excel file is not open in another application

3. **Page not loading**
   - Check if server is running
   - Verify the correct URL
   - Check browser console for errors

## 🤝 **Contributing**

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- Built with ❤️ for campus communities
- Inspired by the need for better lost and found systems
- Uses modern web technologies for optimal user experience

## 📞 **Support**

- **GitHub Issues**: Report bugs and request features
- **Email**: [Your Email]
- **Documentation**: Check the [Wiki](https://github.com/YOUR_USERNAME/campus-find-the-lost-portal/wiki)

---

**⭐ Star this repository if you find it helpful!**

**🔗 Share with your campus community!**

**🚀 Deploy and start helping people find their lost items!**

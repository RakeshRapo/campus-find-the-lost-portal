# 🚄 Railway Deployment Guide

This guide will help you deploy your Campus Find the Lost Portal to Railway successfully.

## 🚀 **Quick Deploy to Railway**

### **Step 1: Go to Railway**
1. Visit [railway.app](https://railway.app)
2. Sign in with your GitHub account
3. Click **"New Project"**

### **Step 2: Connect Your Repository**
1. Select **"Deploy from GitHub repo"**
2. Choose your `campus-find-the-lost-portal` repository
3. Click **"Deploy"**

### **Step 3: Configure Your Service**
1. **Service Name**: `campus-find-the-lost-portal` (or any name you prefer)
2. **Build Command**: `npm install` (leave blank for auto-detection)
3. **Start Command**: `npm start` (leave blank for auto-detection)
4. **Port**: `3000` (Railway will set this automatically)

## 🔧 **Railway-Specific Configuration**

### **Environment Variables (Optional)**
Railway will automatically set these, but you can customize:
- `PORT` - Railway sets this automatically
- `NODE_ENV` - Set to `production`

### **Health Check**
Railway will automatically check: `/api/items`

## 🆘 **Troubleshooting Common Issues**

### **Issue 1: Build Fails**
**Solution**: Check the build logs in Railway dashboard
- Ensure all dependencies are in `package.json`
- Check for syntax errors in your code

### **Issue 2: App Won't Start**
**Solution**: Check the deployment logs
- Verify the start command is correct
- Check if port is available

### **Issue 3: Dependencies Missing**
**Solution**: Ensure all dependencies are in `package.json`
```bash
npm install --save express cors xlsx
```

### **Issue 4: Port Issues**
**Solution**: Railway handles ports automatically
- Don't hardcode port 3000
- Use `process.env.PORT` in your server

## 📊 **Monitoring Your Deployment**

### **Railway Dashboard Features:**
- **Real-time logs** - See what's happening
- **Metrics** - Monitor performance
- **Environment variables** - Manage configuration
- **Custom domains** - Add your own domain

### **Health Checks:**
- Railway automatically checks `/api/items`
- Returns 200 OK if your app is healthy
- Failed health checks trigger restarts

## 🔄 **Updating Your App**

### **Automatic Updates:**
1. Push changes to GitHub
2. Railway automatically redeploys
3. Monitor the deployment in Railway dashboard

### **Manual Updates:**
1. Go to Railway dashboard
2. Click **"Deploy"** button
3. Select your branch

## 🌐 **Accessing Your App**

### **Railway URL:**
- Format: `https://your-app-name.railway.app`
- You can customize this in Railway settings

### **Custom Domain:**
1. Go to Railway dashboard
2. Click on your service
3. Go to **"Settings"** → **"Domains"**
4. Add your custom domain

## 📱 **Testing Your Deployed App**

### **Test These Features:**
1. **Homepage**: Visit your Railway URL
2. **API Endpoints**: Test `/api/items`
3. **Forms**: Try adding lost/found items
4. **Data Persistence**: Check if data survives refreshes

### **Common Test URLs:**
- `https://your-app.railway.app/` - Main page
- `https://your-app.railway.app/api/items` - API test
- `https://your-app.railway.app/api/export` - Excel download

## 🎯 **Success Checklist**

- ✅ **Build successful** in Railway
- ✅ **App starts** without errors
- ✅ **Health checks pass** (200 OK on `/api/items`)
- ✅ **Homepage loads** correctly
- ✅ **Forms work** (can add items)
- ✅ **Data persists** between refreshes
- ✅ **Excel export** works

## 🆘 **Getting Help**

### **Railway Support:**
- **Documentation**: [docs.railway.app](https://docs.railway.app)
- **Discord**: [railway.app/discord](https://railway.app/discord)
- **GitHub Issues**: Check Railway's GitHub repository

### **Common Solutions:**
1. **Check logs** in Railway dashboard
2. **Verify dependencies** in `package.json`
3. **Test locally** before deploying
4. **Use Railway's health checks**

---

## 🎉 **Ready to Deploy?**

Your project is now configured for Railway deployment! Follow the steps above and your Campus Find the Lost Portal will be live on the web.

**Good luck with your deployment! 🚀**

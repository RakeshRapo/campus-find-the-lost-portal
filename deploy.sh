#!/bin/bash

# 🚀 Campus Find the Lost Portal - Deployment Script
# This script helps you deploy your application to various platforms

echo "🎯 Campus Find the Lost Portal - Deployment Script"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_status "Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    print_success "Dependencies installed successfully!"
else
    print_error "Failed to install dependencies."
    exit 1
fi

print_status "Testing the application locally..."
npm run migrate

# Start the server in background
print_status "Starting Excel backend server..."
npm run start:excel &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Test if server is running
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_success "Server is running successfully at http://localhost:3000"
else
    print_warning "Server might not be fully started yet. Please wait a moment."
fi

echo ""
echo "🎉 Your application is ready for deployment!"
echo ""
echo "📋 Next steps:"
echo "1. Push your code to GitHub:"
echo "   git add ."
echo "   git commit -m 'Prepare for deployment'"
echo "   git push origin main"
echo ""
echo "2. Choose a deployment platform:"
echo "   🌟 Heroku (Recommended for beginners):"
echo "      - Go to heroku.com and create an account"
echo "      - Install Heroku CLI"
echo "      - Run: heroku create your-app-name"
echo "      - Run: git push heroku main"
echo ""
echo "   🚄 Railway:"
echo "      - Go to railway.app and sign in with GitHub"
echo "      - Create new project from GitHub repo"
echo ""
echo "   🎨 Render:"
echo "      - Go to render.com and sign in with GitHub"
echo "      - Create new web service from GitHub repo"
echo ""
echo "   ⚡ Vercel:"
echo "      - Go to vercel.com and sign in with GitHub"
echo "      - Import your repository"
echo ""
echo "📚 For detailed instructions, see DEPLOYMENT.md"
echo ""

# Ask user if they want to stop the local server
read -p "Do you want to stop the local server? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Stopping local server..."
    kill $SERVER_PID 2>/dev/null
    print_success "Local server stopped."
else
    print_status "Local server is still running at http://localhost:3000"
    print_status "You can stop it later with: pkill -f 'node server-excel.js'"
fi

echo ""
print_success "Deployment preparation completed! 🚀"
echo "Check DEPLOYMENT.md for detailed deployment instructions."

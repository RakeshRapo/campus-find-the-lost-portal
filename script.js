// --- STATE MANAGEMENT ---
// Using a state object to hold application data fetched from the backend
const state = {
    lostItems: [],
    foundItems: [],
    // allItems will now store only ACTIVE items for filtering
    allItems: [],
};

// --- DOM ELEMENT CACHING ---
// Caching frequently used DOM elements for better performance
const DOMElements = {
    lostForm: document.getElementById('lostForm'),
    foundForm: document.getElementById('foundForm'),
    lostDateInput: document.getElementById('lostDate'),
    foundDateInput: document.getElementById('foundDate'),
    itemsContainer: document.getElementById('itemsContainer'),
    historyContainer: document.getElementById('historyContainer'), // For resolved items
    searchInput: document.getElementById('searchInput'),
    categoryFilter: document.getElementById('categoryFilter'),
    typeFilter: document.getElementById('typeFilter'),
    navToggle: document.querySelector('.nav-toggle'),
    navMenu: document.querySelector('.nav-menu'),
    // Success Modal
    successModal: document.getElementById('successModal'),
    modalMessage: document.getElementById('modalMessage'),
    closeSuccessModalBtn: document.querySelector('#successModal .close'),
    // Mark as Found Modal
    markAsFoundModal: document.getElementById('markAsFoundModal'),
    markAsFoundForm: document.getElementById('markAsFoundForm'),
    markAsFoundItemIdInput: document.getElementById('markAsFoundItemId'),
    finderContactInput: document.getElementById('finderContact'),
    finderLocationInput: document.getElementById('finderLocation'),
    closeMarkAsFoundModalBtn: document.getElementById('closeMarkAsFoundModal'),
    // Buttons
    heroReportLostBtn: document.getElementById('heroReportLostBtn'),
    heroPostFoundBtn: document.getElementById('heroPostFoundBtn'),
    searchBtn: document.getElementById('searchBtn'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    cleanupOldItemsBtn: document.getElementById('cleanupOldItemsBtn'),
    // Form Selects
    lostCategorySelect: document.getElementById('lostCategory'),
    foundCategorySelect: document.getElementById('foundCategory'),
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', initializeApp);

/**
 * Initializes the application, sets up UI and event listeners.
 */
async function initializeApp() {
    const today = new Date().toISOString().split('T')[0];
    DOMElements.lostDateInput.value = today;
    DOMElements.foundDateInput.value = today;
    
    populateCategoryDropdowns();
    setupEventListeners();
    await loadItemsAndRender();
}

/**
 * Centralized function to load all items, separate them by status, and render them.
 */
async function loadItemsAndRender() {
    await loadItemsFromBackend();
    
    const allItems = [...state.lostItems, ...state.foundItems];
    const activeItems = [];
    const resolvedItems = [];
    
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Separate active items from resolved/history items
    allItems.forEach(item => {
        let isResolved = false;
        if (item.status === 'found' || item.originalLostItemId) {
            isResolved = true;
        }
        if (item.type === 'found' && !item.originalLostItemId && new Date(item.datePosted) < threeDaysAgo) {
            isResolved = true;
        }
        if (isResolved) {
            resolvedItems.push(item);
        } else {
            activeItems.push(item);
        }
    });

    activeItems.sort((a, b) => new Date(b.datePosted) - new Date(a.datePosted));
    resolvedItems.sort((a, b) => new Date(b.datePosted) - new Date(a.datePosted));

    state.allItems = activeItems;

    renderItems(activeItems, DOMElements.itemsContainer);
    
    // Auto-cleanup success stories older than 2 weeks
    autoCleanupSuccessStories();
    
    // Render enhanced success stories
    renderSuccessStories();
}


// --- EVENT LISTENERS ---
function setupEventListeners() {
    DOMElements.lostForm.addEventListener('submit', handleLostForm);
    DOMElements.foundForm.addEventListener('submit', handleFoundForm);

    document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', handleNavigation));
    DOMElements.navToggle.addEventListener('click', () => DOMElements.navMenu.classList.toggle('active'));

    DOMElements.closeSuccessModalBtn.addEventListener('click', closeSuccessModal);
    DOMElements.closeMarkAsFoundModalBtn.addEventListener('click', closeMarkAsFoundModal);
    document.getElementById('closeItemReunitedModal').addEventListener('click', closeReunionModal);
    DOMElements.markAsFoundForm.addEventListener('submit', handleMarkAsFoundSubmit);
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            closeSuccessModal();
            closeMarkAsFoundModal();
            closeReunionModal();
        }
    });

    DOMElements.heroReportLostBtn.addEventListener('click', (e) => { e.preventDefault(); scrollToSection('lost'); });
    DOMElements.heroPostFoundBtn.addEventListener('click', (e) => { e.preventDefault(); scrollToSection('found'); });
    DOMElements.searchBtn.addEventListener('click', filterAndSearchItems);
    DOMElements.clearFiltersBtn.addEventListener('click', clearFilters);
    DOMElements.cleanupOldItemsBtn.addEventListener('click', archiveOldItems);

    DOMElements.searchInput.addEventListener('input', debounce(filterAndSearchItems, 300));
    DOMElements.categoryFilter.addEventListener('change', filterAndSearchItems);
    DOMElements.typeFilter.addEventListener('change', filterAndSearchItems);
}


// --- FORM HANDLERS ---
/**
 * Handles the submission of the "Lost Item" form by sending data to the backend.
 */
async function handleLostForm(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const lostItem = Object.fromEntries(formData.entries());
    // Add type and date posted before sending to backend
    lostItem.type = 'lost';
    lostItem.datePosted = new Date().toISOString();

    try {
        const response = await fetch('/api/items/lost', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lostItem),
        });
        if (!response.ok) throw new Error('Server responded with an error.');
        
        await loadItemsAndRender(); // Refresh data from backend
        showSuccessModal('Lost item reported successfully!');
        event.target.reset();
        DOMElements.lostDateInput.value = new Date().toISOString().split('T')[0];
    } catch (error) {
        console.error('Error reporting lost item:', error);
        alert('Failed to report lost item. Please check your connection and try again.');
    }
}

/**
 * Handles the submission of the "Found Item" form by sending data to the backend.
 */
async function handleFoundForm(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const foundItem = Object.fromEntries(formData.entries());
    foundItem.image = formData.get('image') ? 'sample-image.jpg' : null;
    // Add type and date posted before sending to backend
    foundItem.type = 'found';
    foundItem.datePosted = new Date().toISOString();

    try {
        const response = await fetch('/api/items/found', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(foundItem),
        });
        if (!response.ok) throw new Error('Server responded with an error.');
        
        await loadItemsAndRender(); // Refresh data from backend
        showSuccessModal('Found item posted successfully!');
        event.target.reset();
        DOMElements.foundDateInput.value = new Date().toISOString().split('T')[0];
    } catch (error) {
        console.error('Error posting found item:', error);
        alert('Failed to post found item. Please check your connection and try again.');
    }
}

/**
 * Handles marking a lost item as found, with comprehensive finder details and notification system.
 */
async function handleMarkAsFoundSubmit(event) {
    event.preventDefault();
    const itemId = DOMElements.markAsFoundItemIdInput.value;
    
    // Collect comprehensive finder details
    const finderName = document.getElementById('finderName').value.trim();
    const finderContact = document.getElementById('finderContact').value.trim();
    const finderLocation = document.getElementById('finderLocation').value.trim();
    const finderNotes = document.getElementById('finderNotes').value.trim();
    const pickupTime = document.getElementById('pickupTime').value;
    
    // Validate required fields
    if (!finderName || !finderContact || !finderLocation) {
        alert('Please fill in all required fields (Name, Contact, and Location).');
        return;
    }

    // Find the item in the current state
    const lostItem = state.lostItems.find(item => item.id === itemId);

    if (!lostItem) {
        console.error("CRITICAL ERROR: Could not find lost item with ID:", itemId, "in the current state.");
        alert("An error occurred. Could not find the item to update. Please refresh the page and try again.");
        return;
    }

    const foundItemData = {
        itemName: lostItem.itemName,
        category: lostItem.category,
        location: lostItem.location,
        dateFound: new Date().toISOString().split('T')[0],
        description: `This item was reunited via the portal. Original description: ${lostItem.description}`,
        contact: finderContact,
        currentLocation: finderLocation,
        originalLostItemId: lostItem.id,
        type: 'found',
        datePosted: new Date().toISOString(),
        // Enhanced finder details
        finderName: finderName,
        finderNotes: finderNotes,
        pickupTime: pickupTime,
        reunionDate: new Date().toISOString(),
        status: 'reunited'
    };

    try {
        // Promise.all ensures both actions must succeed
        await Promise.all([
            // 1. Update the original lost item's status to 'found'
            fetch(`/api/items/lost/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    status: 'found',
                    finderDetails: {
                        name: finderName,
                        contact: finderContact,
                        location: finderLocation,
                        notes: finderNotes,
                        pickupTime: pickupTime,
                        reunionDate: new Date().toISOString()
                    }
                }),
            }),
            // 2. Create a new 'found' record linked to the original
            fetch('/api/items/found', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(foundItemData),
            })
        ]);

        closeMarkAsFoundModal();
        
        // Show reunion notification modal
        showReunionNotification(lostItem, finderName, finderContact, finderLocation, pickupTime, finderNotes);
        
        await loadItemsAndRender();
        showSuccessModal(`🎉 Item successfully marked as found! Owner has been notified.`);
    } catch (error) {
        console.error('Error sending update to server:', error);
        alert('Could not contact the server to update the item. Please check your connection.');
    }
}


// --- API & DATA ---
/**
 * Fetches all non-archived items from the backend server.
 */
async function loadItemsFromBackend() {
    try {
        const res = await fetch('/api/items');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        
        state.lostItems = (data.lostItems || []).filter(item => item.status !== 'archived');
        state.foundItems = (data.foundItems || []).filter(item => item.status !== 'archived');

    } catch (error) {
        console.error('Error loading items:', error);
        state.lostItems = [];
        state.foundItems = [];
        alert('Could not load items. Is the backend server running?');
    }
}


// --- DOM RENDERING ---
/**
 * Renders a list of items into a specified container.
 * @param {Array} items - The array of items to display.
 * @param {HTMLElement} container - The container element to render into.
 */
function renderItems(items, container) {
    if (!container) return;

    if (items.length === 0) {
        if (container.id === 'itemsContainer') {
            container.innerHTML = `
                <div class="no-items">
                    <i class="fas fa-search"></i>
                    <h3>No Active Items Found</h3>
                    <p>Try adjusting your search or be the first to post!</p>
                </div>`;
        } else {
            container.innerHTML = `<div class="no-items"><p>No success stories or cleared items to show yet.</p></div>`;
        }
        return;
    }
    container.innerHTML = items.map(item => createItemCardHTML(item)).join('');
}

/**
 * Creates the HTML string for a single item card.
 */
function createItemCardHTML(item) {
    const isLost = item.type === 'lost';
    const isSuccessfullyFound = !isLost && item.originalLostItemId;
    
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const isOldUnclaimedFoundItem = item.type === 'found' && !isSuccessfullyFound && new Date(item.datePosted) < threeDaysAgo;

    let badge = '';
    if (isSuccessfullyFound || item.status === 'found') {
        badge = '<span class="success-badge">🎉 REUNITED!</span>';
    } else if (isOldUnclaimedFoundItem) {
        badge = '<span class="success-badge" style="background: #8e44ad;">CLEARED</span>';
    }

    return `
        <div class="item-card fade-in ${isSuccessfullyFound ? 'found-success' : ''}">
            <div class="item-header">
                <span class="item-type ${item.type}">${item.type.toUpperCase()}</span>
                <span class="item-category">${item.category}</span>
                ${badge}
            </div>
            <h3 class="item-title">${item.itemName}</h3>
            <p class="item-description">${item.description}</p>
            ${item.image ? `<img src="${item.image}" alt="${item.itemName}" class="item-image">` : ''}
            <div class="item-details">
                <div class="item-detail"><strong>${isLost ? 'Last Seen:' : 'Found At:'}</strong><span>${item.location}</span></div>
                <div class="item-detail"><strong>Date Posted:</strong><span>${formatDate(item.datePosted)}</span></div>
                ${!isLost && item.currentLocation ? `<div class="item-detail"><strong>Currently At:</strong><span>${item.currentLocation}</span></div>` : ''}
            </div>
            <div class="item-actions">
                ${isLost && item.status !== 'found' ? `<button class="btn-contact" onclick="openMarkAsFoundModal('${item.id}')">I Found This!</button>` : ''}
            </div>
        </div>
    `;
}


// --- FILTER & SEARCH ---
function filterAndSearchItems() {
    const searchTerm = DOMElements.searchInput.value.toLowerCase();
    const category = DOMElements.categoryFilter.value;
    const type = DOMElements.typeFilter.value;

    let filteredItems = state.allItems.filter(item => {
        const matchesSearch = searchTerm ?
            item.itemName.toLowerCase().includes(searchTerm) ||
            item.description.toLowerCase().includes(searchTerm) ||
            item.location.toLowerCase().includes(searchTerm) : true;
        const matchesCategory = category ? item.category === category : true;
        const matchesType = type ? item.type === type : true;
        return matchesSearch && matchesCategory && matchesType;
    });

    renderItems(filteredItems, DOMElements.itemsContainer);
}

function clearFilters() {
    DOMElements.searchInput.value = '';
    DOMElements.categoryFilter.value = '';
    DOMElements.typeFilter.value = '';
    filterAndSearchItems();
}

/**
 * Finds and archives resolved items older than 30 days by updating their status on the backend.
 */
async function archiveOldItems() {
    const confirmation = confirm("Are you sure you want to archive all resolved items older than 30 days? They will be hidden from all views but kept in the database.");
    if (!confirmation) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const allResolvedItems = [...state.lostItems, ...state.foundItems].filter(item => item.status === 'found' || item.originalLostItemId);
    const itemsToArchive = allResolvedItems.filter(item => new Date(item.datePosted) < cutoffDate);

    if (itemsToArchive.length === 0) {
        alert("No old items to archive.");
        return;
    }

    try {
        const archivePromises = itemsToArchive.map(item => {
            const endpoint = `/api/items/${item.type}/${item.id}`;
            return fetch(endpoint, { 
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'archived' })
            });
        });
        await Promise.all(archivePromises);
        showSuccessModal(`Successfully archived ${itemsToArchive.length} old item(s).`);
        await loadItemsAndRender();
    } catch (error) {
        console.error("Error during archival:", error);
        alert("An error occurred while archiving old items.");
    }
}


// --- MODAL CONTROLS ---
function showSuccessModal(message) {
    DOMElements.modalMessage.textContent = message;
    DOMElements.successModal.style.display = 'block';
    setTimeout(closeSuccessModal, 4000);
}

function closeSuccessModal() {
    DOMElements.successModal.style.display = 'none';
}

function openMarkAsFoundModal(itemId) {
    DOMElements.markAsFoundForm.reset();
    DOMElements.markAsFoundItemIdInput.value = itemId;
    DOMElements.markAsFoundModal.style.display = 'block';
}

function closeMarkAsFoundModal() {
    DOMElements.markAsFoundModal.style.display = 'none';
}


// --- UTILITY FUNCTIONS ---
function populateCategoryDropdowns() {
    const categories = [
        { value: "electronics", text: "Electronics" },
        { value: "books", text: "Books & Stationery" },
        { value: "clothing", text: "Clothing & Accessories" },
        { value: "jewelry", text: "Jewelry & Watches" },
        { value: "bags", text: "Bags & Wallets" },
        { value: "other", text: "Other" },
    ];

    [DOMElements.lostCategorySelect, DOMElements.foundCategorySelect, DOMElements.categoryFilter].forEach(sel => sel.innerHTML = '');

    const defaultOption = new Option("Select Category", "");
    const filterDefaultOption = new Option("All Categories", "");
    DOMElements.lostCategorySelect.add(defaultOption.cloneNode(true));
    DOMElements.foundCategorySelect.add(defaultOption.cloneNode(true));
    DOMElements.categoryFilter.add(filterDefaultOption);

    categories.forEach(category => {
        const option = new Option(category.text, category.value);
        [DOMElements.lostCategorySelect, DOMElements.foundCategorySelect, DOMElements.categoryFilter].forEach(sel => sel.add(option.cloneNode(true)));
    });
    
    DOMElements.typeFilter.innerHTML = `<option value="">All Types</option><option value="lost">Lost Items</option><option value="found">Found Items</option>`;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString("en-IN", options);
}

function handleNavigation(event) {
    event.preventDefault();
    const targetId = event.target.getAttribute('href')?.substring(1);
    if (!targetId) return;
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    event.target.classList.add('active');
    scrollToSection(targetId);
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        const headerHeight = document.querySelector('.header').offsetHeight;
        const targetPosition = section.offsetTop - headerHeight - 20;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// --- NOTIFICATION SYSTEM ---
function showReunionNotification(lostItem, finderName, finderContact, finderLocation, pickupTime, finderNotes) {
    // Populate the reunion modal with finder details
    document.getElementById('reunionFinderName').textContent = finderName;
    document.getElementById('reunionFinderContact').textContent = finderContact;
    document.getElementById('reunionItemLocation').textContent = finderLocation;
    document.getElementById('reunionPickupTime').textContent = pickupTime || 'Not specified';
    
    // Show notes if available
    const notesSection = document.getElementById('reunionNotesSection');
    const notesElement = document.getElementById('reunionNotes');
    if (finderNotes && finderNotes.trim()) {
        notesElement.textContent = finderNotes;
        notesSection.style.display = 'block';
    } else {
        notesSection.style.display = 'none';
    }
    
    // Show the reunion notification modal
    document.getElementById('itemReunitedModal').style.display = 'block';
}

function closeReunionModal() {
    document.getElementById('itemReunitedModal').style.display = 'none';
}

function contactFinder() {
    // This function can be enhanced to show contact options
    // For now, it just shows the contact information
    const contact = document.getElementById('reunionFinderContact').textContent;
    const name = document.getElementById('reunionFinderName').textContent;
    
    if (contact.includes('@')) {
        // Email contact
        window.open(`mailto:${contact}?subject=Re: Found Item - ${name}`);
    } else if (contact.match(/\d/)) {
        // Phone contact
        alert(`Call or message: ${contact}\n\nFinder: ${name}`);
    } else {
        alert(`Contact: ${contact}\n\nFinder: ${name}`);
    }
}

// --- AUTO-CLEANUP SYSTEM ---
/**
 * Automatically removes success stories older than 2 weeks
 * Data remains in backend but is hidden from frontend
 */
function autoCleanupSuccessStories() {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14); // 2 weeks ago
    
    // Filter out old success stories
    state.foundItems = state.foundItems.filter(item => {
        if (item.status === 'reunited' && item.reunionDate) {
            const reunionDate = new Date(item.reunionDate);
            return reunionDate > twoWeeksAgo;
        }
        return true; // Keep non-reunited items
    });
    
    // Update the display
    renderItems(state.foundItems, DOMElements.foundItemsContainer);
    renderSuccessStories();
}

/**
 * Renders success stories with enhanced styling and auto-cleanup
 */
function renderSuccessStories() {
    const historyContainer = document.getElementById('historyContainer');
    if (!historyContainer) return;
    
    const reunitedItems = state.foundItems.filter(item => item.status === 'reunited');
    
    if (reunitedItems.length === 0) {
        historyContainer.innerHTML = `
            <div class="no-items">
                <i class="fas fa-heart"></i>
                <h3>No Success Stories Yet</h3>
                <p>Be the first to help reunite someone with their lost item!</p>
            </div>`;
        return;
    }
    
    // Add cleanup notice
    const cleanupNotice = `
        <div class="cleanup-notice">
            <i class="fas fa-info-circle"></i>
            <strong>Note:</strong> Success stories are automatically hidden after 2 weeks to keep the portal focused on active items. All data is preserved in our records.
        </div>
    `;
    
    const successStoriesHTML = reunitedItems.map(item => {
        const reunionDate = item.reunionDate ? new Date(item.reunionDate) : new Date();
        const formattedDate = reunionDate.toLocaleDateString('en-IN', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        return `
            <div class="success-story">
                <h4>
                    <i class="fas fa-check-circle" aria-hidden="true"></i>
                    ${item.itemName} - Reunited!
                </h4>
                <div class="reunion-date">
                    <i class="fas fa-calendar-check" aria-hidden="true"></i>
                    Reunited on: ${formattedDate}
                </div>
                <p><strong>Category:</strong> ${item.category}</p>
                <p><strong>Original Location:</strong> ${item.location}</p>
                <p><strong>Description:</strong> ${item.description}</p>
                
                <div class="finder-details">
                    <h5><i class="fas fa-user" aria-hidden="true"></i> Found By:</h5>
                    <p><strong>Name:</strong> ${item.finderName || 'Not provided'}</p>
                    <p><strong>Contact:</strong> ${item.contact}</p>
                    <p><strong>Pickup Location:</strong> ${item.currentLocation}</p>
                    ${item.pickupTime ? `<p><strong>Preferred Time:</strong> ${item.pickupTime}</p>` : ''}
                    ${item.finderNotes ? `<p><strong>Notes:</strong> ${item.finderNotes}</p>` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    historyContainer.innerHTML = cleanupNotice + successStoriesHTML;
}

// --- ENHANCED RENDERING ---

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
    document.getElementById('closeClaimItemModal').addEventListener('click', closeClaimItemModal);
    DOMElements.markAsFoundForm.addEventListener('submit', handleMarkAsFoundSubmit);
    document.getElementById('claimItemForm').addEventListener('submit', handleClaimItemSubmit);
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

    // The FormData object automatically collects all fields with a 'name' attribute
    const formData = new FormData(event.target);
    const foundItem = Object.fromEntries(formData.entries());
    
    // Add default properties before sending to backend
    foundItem.image = foundItem.image ? 'sample-image.jpg' : null;
    foundItem.type = 'found';
    foundItem.datePosted = new Date().toISOString();

    try {
        const response = await fetch('/api/items/found', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(foundItem), // Sends all form data, including 'contact'
        });
        if (!response.ok) throw new Error('Server responded with an error.');

        await loadItemsAndRender(); // Refresh data from backend
        showSuccessModal('Found item posted successfully!');
        event.target.reset();
        // Reset the date input to the current date after successful submission
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(finderContact)) {
        alert('Please enter a valid email address.');
        return;
    }

    // Find the item in the current state
    const lostItem = state.lostItems.find(item => item.id === itemId);

    if (!lostItem) {
        console.error("CRITICAL ERROR: Could not find lost item with ID:", itemId, "in the current state.");
        alert("An error occurred. Could not find the item to update. Please refresh the page and try again.");
        return;
    }

    try {
        // Use the new API endpoint to save finder details to Excel
        const response = await fetch('/api/finder-details', {
            method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                itemId: itemId,
                finderName: finderName,
                finderContact: finderContact,
                finderLocation: finderLocation,
                finderNotes: finderNotes,
                pickupTime: pickupTime
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to save finder details');
        }

        const result = await response.json();
        console.log('Finder details saved successfully:', result);

        closeMarkAsFoundModal();
        
        // Show reunion notification modal
        showReunionNotification(lostItem, finderName, finderContact, finderLocation, pickupTime, finderNotes);
        
        await loadItemsAndRender();
        showSuccessModal(`🎉 Item successfully marked as found! Finder details have been saved to the Excel database.`);
        
        // Show notification to the original owner
        showOwnerNotification(lostItem, finderName, finderContact, finderLocation);
    } catch (error) {
        console.error('Error saving finder details:', error);
        alert('Could not save finder details to the database. Please check your connection and try again.');
    }
}

/**
 * Handles the submission of item claims by users who believe the item belongs to them.
 */
async function handleClaimItemSubmit(event) {
    event.preventDefault();
    const itemId = document.getElementById('claimItemId').value;
    
    // Collect claim details
    const claimerName = document.getElementById('claimerName').value.trim();
    const claimerEmail = document.getElementById('claimerEmail').value.trim();
    const claimDescription = document.getElementById('claimDescription').value.trim();
    const claimLocation = document.getElementById('claimLocation').value.trim();
    const claimDate = document.getElementById('claimDate').value;
    const claimNotes = document.getElementById('claimNotes').value.trim();
    
    // Validate required fields
    if (!claimerName || !claimerEmail || !claimDescription || !claimLocation || !claimDate) {
        alert('Please fill in all required fields.');
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(claimerEmail)) {
        alert('Please enter a valid email address.');
        return;
    }

    // Find the found item in the current state
    const foundItem = state.foundItems.find(item => item.id === itemId);

    if (!foundItem) {
        console.error("CRITICAL ERROR: Could not find item with ID:", itemId, "in the current state.");
        alert("An error occurred. Could not find the item to claim. Please refresh the page and try again.");
        return;
    }

    try {
        // Use the new API endpoint to save claim details
        const response = await fetch('/api/item-claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                itemId: itemId,
                claimerName: claimerName,
                claimerEmail: claimerEmail,
                claimDescription: claimDescription,
                claimLocation: claimLocation,
                claimDate: claimDate,
                claimNotes: claimNotes
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to submit claim');
        }

        const result = await response.json();
        console.log('Claim submitted successfully:', result);

        closeClaimItemModal();
        
        // Show claim notification modal
        showClaimNotification(foundItem, claimerName, claimerEmail, claimDescription, claimLocation, claimDate);
        
        await loadItemsAndRender();
        showSuccessModal(`🎉 Claim submitted successfully! The finder will be notified and can verify your claim.`);
        
    } catch (error) {
        console.error('Error submitting claim:', error);
        alert('Could not submit your claim. Please check your connection and try again.');
    }
}
/**
 * Handles marking a found item as reunited after a successful claim.
 * @param {string} itemId - The ID of the item to update.
 */
async function handleReuniteItem(itemId) {
    const confirmation = confirm("Are you sure you want to mark this item as reunited? This action cannot be undone.");
    if (!confirmation) {
        return;
    }

    try {
        const response = await fetch(`/api/items/found/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'reunited' }),
        });

        if (!response.ok) {
            throw new Error('Failed to mark item as reunited.');
        }

        await loadItemsAndRender(); // Refresh the list to show the item in the history section
        showSuccessModal('Item successfully marked as reunited! It has been moved to the success stories section.');

    } catch (error) {
        console.error('Error marking item as reunited:', error);
        alert('Could not mark the item as reunited. Please try again.');
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
    const isSuccessfullyFound = item.status === 'reunited'; // Use 'reunited' status for success
    const isClaimPending = item.status === 'claimed'; // Use 'claimed' status for pending claim
    
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const isOldUnclaimedFoundItem = item.type === 'found' && !isSuccessfullyFound && new Date(item.datePosted) < threeDaysAgo;

    let badge = '';
    if (isSuccessfullyFound) {
        badge = '<span class="success-badge">🎉 REUNITED!</span>';
    } else if (isClaimPending) {
        badge = '<span class="status-badge" style="background-color: #f7931e;">⏳ PENDING CLAIM</span>';
    } else if (isOldUnclaimedFoundItem) {
        badge = '<span class="status-badge" style="background: #8e44ad;">CLEARED</span>';
    }

    // Combine all parts into a single return string
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
                ${isLost && !isSuccessfullyFound ? `<button class="btn-contact" onclick="openMarkAsFoundModal('${item.id}')">I Found This!</button>` : ''}
                ${isLost && isSuccessfullyFound ? `<button class="btn-contact" onclick="contactFinderFromItem('${item.id}')">Contact Finder</button>` : ''}
                ${!isLost && !isClaimPending ? `<button class="btn-claim" onclick="openClaimItemModal('${item.id}')">This Belongs to Me!</button>` : ''}
                ${!isLost && isClaimPending ? `<button class="btn-reunite" onclick="handleReuniteItem('${item.id}')">Mark as Reunited</button>` : ''}
            </div>
            ${isLost && isSuccessfullyFound && item.finderDetails ? `
            <div class="finder-info-display" style="margin-top: 1rem; padding: 1rem; background: rgba(102, 126, 234, 0.1); border-radius: 10px; border-left: 4px solid #667eea;">
                <h4 style="margin: 0 0 0.5rem 0; color: #667eea; font-size: 0.9rem;">📞 Finder Information</h4>
                <div style="font-size: 0.85rem; color: rgba(255, 255, 255, 0.8);">
                    <p style="margin: 0.25rem 0;"><strong>Name:</strong> ${item.finderDetails.name || 'Not provided'}</p>
                    <p style="margin: 0.25rem 0;"><strong>Contact:</strong> ${item.finderDetails.contact || 'Not provided'}</p>
                    <p style="margin: 0.25rem 0;"><strong>Location:</strong> ${item.finderDetails.location || 'Not specified'}</p>
                    <p style="margin: 0.25rem 0;"><strong>Pickup Time:</strong> ${item.finderDetails.pickupTime || 'Not specified'}</p>
                </div>
            </div>
            ` : ''}
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

function openClaimItemModal(itemId) {
    document.getElementById('claimItemForm').reset();
    document.getElementById('claimItemId').value = itemId;
    document.getElementById('claimDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('claimItemModal').style.display = 'block';
}

function closeClaimItemModal() {
    document.getElementById('claimItemModal').style.display = 'none';
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
    // This function handles email contact for finders
    const contact = document.getElementById('reunionFinderContact').textContent;
    const name = document.getElementById('reunionFinderName').textContent;
    
    // Since we now only accept email addresses, always open email client
    if (contact.includes('@')) {
        window.open(`mailto:${contact}?subject=Re: Found Item - ${name}&body=Hi ${name},%0D%0A%0D%0AI saw that you found my lost item. Thank you so much!%0D%0A%0D%0APlease let me know when would be a good time to pick it up.%0D%0A%0D%0ABest regards`);
    } else {
        alert(`Contact: ${contact}\n\nFinder: ${name}\n\nPlease use your email client to contact them.`);
    }
}

async function contactFinderFromItem(itemId) {
    try {
        // Fetch finder details from the server
        const response = await fetch(`/api/finder-details/${itemId}`);
        const data = await response.json();
        
        if (!data.success) {
            alert('Finder details not available. Please try refreshing the page.');
            return;
        }
        
        const finderDetails = data.finderDetails;
        const finderName = finderDetails.name || 'Finder';
        const finderContact = finderDetails.contact;
        const finderLocation = finderDetails.location;
        const pickupTime = finderDetails.pickupTime || 'Not specified';
        const itemName = data.itemName;
        
        // Create a detailed email body
        const emailBody = `Hi ${finderName},

I saw that you found my lost item: ${itemName}

Thank you so much for finding it! I would like to arrange pickup.

Item Details:
- Item: ${itemName}
- Category: ${data.category}

Pickup Information:
- Current location: ${finderLocation}
- Preferred time: ${pickupTime}

Please let me know when would be a good time to pick it up.

Best regards`;

        // Open email client with pre-filled details
        if (finderContact && finderContact.includes('@')) {
            const subject = `Re: Found Item - ${itemName}`;
            const mailtoLink = `mailto:${finderContact}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
            window.open(mailtoLink);
    } else {
            // Show contact information in a modal if email is not available
            showContactInfoModal(finderName, finderContact, finderLocation, pickupTime, itemName);
        }
    } catch (error) {
        console.error('Error fetching finder details:', error);
        alert('Error fetching finder details. Please try again.');
    }
}

function showContactInfoModal(finderName, finderContact, finderLocation, pickupTime, itemName) {
    // Create a modal to show contact information
    const modalHTML = `
        <div class="modal" id="contactInfoModal" style="display: block;">
            <div class="modal-content">
                <button class="close" onclick="closeContactInfoModal()" aria-label="Close">&times;</button>
                <h3><i class="fas fa-user" aria-hidden="true"></i> Contact Information</h3>
                <p><strong>Item:</strong> ${itemName}</p>
                <div class="contact-details">
                    <p><strong>Finder's Name:</strong> ${finderName}</p>
                    <p><strong>Email:</strong> ${finderContact || 'Not provided'}</p>
                    <p><strong>Pickup Location:</strong> ${finderLocation}</p>
                    <p><strong>Preferred Time:</strong> ${pickupTime}</p>
                </div>
                <div class="contact-actions">
                    ${finderContact && finderContact.includes('@') ? 
                        `<button class="btn btn-primary" onclick="window.open('mailto:${finderContact}?subject=Re: Found Item - ${itemName}')">
                            <i class="fas fa-envelope" aria-hidden="true"></i> Send Email
                        </button>` : 
                        '<p class="no-email">Email address not available. Please contact the finder through other means.</p>'
                    }
                    <button class="btn btn-secondary" onclick="closeContactInfoModal()">Close</button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeContactInfoModal() {
    const modal = document.getElementById('contactInfoModal');
    if (modal) {
        modal.remove();
    }
}

function showOwnerNotification(lostItem, finderName, finderContact, finderLocation) {
    // Create a notification modal for the original owner
    const notificationHTML = `
        <div class="modal" id="ownerNotificationModal" style="display: block;">
            <div class="modal-content">
                <button class="close" onclick="closeOwnerNotificationModal()" aria-label="Close">&times;</button>
                <div class="notification-header">
                    <i class="fas fa-bell notification-icon" aria-hidden="true"></i>
                    <h3>🎉 Great News! Your Item Has Been Found!</h3>
                </div>
                <div class="notification-content">
                    <p><strong>Item:</strong> ${lostItem.itemName}</p>
                    <p><strong>Found by:</strong> ${finderName}</p>
                    <p><strong>Current location:</strong> ${finderLocation}</p>
                    <p><strong>Contact:</strong> ${finderContact}</p>
                    
                    <div class="notification-actions">
                        <button class="btn btn-primary" onclick="contactFinderFromItem('${lostItem.id}')">
                            <i class="fas fa-envelope" aria-hidden="true"></i> Contact Finder Now
                        </button>
                        <button class="btn btn-secondary" onclick="closeOwnerNotificationModal()">
                            <i class="fas fa-check" aria-hidden="true"></i> Got It
                        </button>
                    </div>
                    
                    <div class="notification-tip">
                        <i class="fas fa-info-circle" aria-hidden="true"></i>
                        <strong>Tip:</strong> You can also contact the finder anytime by clicking the "Contact Finder" button on your item listing.
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add notification to body
    document.body.insertAdjacentHTML('beforeend', notificationHTML);
}

function closeOwnerNotificationModal() {
    const modal = document.getElementById('ownerNotificationModal');
    if (modal) {
        modal.remove();
    }
}

function showClaimNotification(foundItem, claimerName, claimerEmail, claimDescription, claimLocation, claimDate) {
    // Create a notification modal for the claimer
    const notificationHTML = `
        <div class="modal" id="claimNotificationModal" style="display: block;">
            <div class="modal-content">
                <button class="close" onclick="closeClaimNotificationModal()" aria-label="Close">&times;</button>
                <div class="notification-header">
                    <i class="fas fa-hand-paper notification-icon" aria-hidden="true"></i>
                    <h3>📝 Claim Submitted Successfully!</h3>
                </div>
                <div class="notification-content">
                    <p><strong>Item:</strong> ${foundItem.itemName}</p>
                    <p><strong>Your Name:</strong> ${claimerName}</p>
                    <p><strong>Your Email:</strong> ${claimerEmail}</p>
                    <p><strong>Claim Date:</strong> ${new Date().toLocaleDateString()}</p>
                    
                    <div class="claim-details">
                        <h4>Your Claim Details:</h4>
                        <p><strong>Description:</strong> ${claimDescription}</p>
                        <p><strong>Lost Location:</strong> ${claimLocation}</p>
                        <p><strong>Lost Date:</strong> ${new Date(claimDate).toLocaleDateString()}</p>
                    </div>
                    
                    <div class="notification-actions">
                        <button class="btn btn-secondary" onclick="closeClaimNotificationModal()">
                            <i class="fas fa-check" aria-hidden="true"></i> Got It
                        </button>
                    </div>
                    
                    <div class="notification-tip">
                        <i class="fas fa-info-circle" aria-hidden="true"></i>
                        <strong>Next Steps:</strong> The finder will be notified of your claim and can verify the details. You'll receive an email when they respond.
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add notification to body
    document.body.insertAdjacentHTML('beforeend', notificationHTML);
}

function closeClaimNotificationModal() {
    const modal = document.getElementById('claimNotificationModal');
    if (modal) {
        modal.remove();
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
                    <p><strong>Email:</strong> ${item.finderContact || item.contact}</p>
                    <p><strong>Pickup Location:</strong> ${item.finderLocation || item.currentLocation}</p>
                    ${item.pickupTime ? `<p><strong>Preferred Time:</strong> ${item.pickupTime}</p>` : ''}
                    ${item.finderNotes ? `<p><strong>Notes:</strong> ${item.finderNotes}</p>` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    historyContainer.innerHTML = cleanupNotice + successStoriesHTML;
}

// --- ENHANCED RENDERING ---







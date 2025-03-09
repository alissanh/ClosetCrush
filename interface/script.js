// Global variables
let currentUser = null;
let currentOutfit = {
    tops: null,
    bottoms: null,
    shoes: null,
    accessories: null
};

// DOM Elements
const userIdModal = document.getElementById('userIdModal');
const userEmailInput = document.getElementById('userEmailInput');
const loginBtn = document.getElementById('loginBtn');
const imageUrlInput = document.getElementById('imageUrlInput');
const categorySelect = document.getElementById('categorySelect');
const addItemBtn = document.getElementById('addItemBtn');
const uploadStatus = document.getElementById('uploadStatus');
const topsContainer = document.getElementById('topsContainer');
const bottomsContainer = document.getElementById('bottomsContainer');
const shoesContainer = document.getElementById('shoesContainer');
const accessoriesContainer = document.getElementById('accessoriesContainer');
const previewTop = document.getElementById('previewTop');
const previewBottom = document.getElementById('previewBottom');
const previewShoes = document.getElementById('previewShoes');
const previewAccessories = document.getElementById('previewAccessories');
const saveOutfitBtn = document.getElementById('saveOutfitBtn');
const outfitsList = document.getElementById('outfitsList');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    showModal();
    addEventListeners();
});

// Event listeners
function addEventListeners() {
    loginBtn.addEventListener('click', handleLogin);
    addItemBtn.addEventListener('click', addItemToCloset);
    saveOutfitBtn.addEventListener('click', saveOutfit);
}

// Show login modal
function showModal() {
    userIdModal.classList.add('show');
}

// Hide login modal
function hideModal() {
    userIdModal.classList.remove('show');
}

// Handle user login
async function handleLogin() {
    const email = userEmailInput.value.trim();
    if (!email) {
        alert('Please enter your email');
        return;
    }
    
    try {
        // Check if user exists, if not create a new user
        const response = await fetch(`/users/findOrCreate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });
        
        const data = await response.json();
        if (data.success) {
            currentUser = data.user;
            hideModal();
            loadUserCloset();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Failed to login. Please try again later.');
    }
}

// Load user's closet items
async function loadUserCloset() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`/users/${currentUser._id}/items`);
        const data = await response.json();
        
        // Clear existing containers
        topsContainer.innerHTML = '';
        bottomsContainer.innerHTML = '';
        shoesContainer.innerHTML = '';
        accessoriesContainer.innerHTML = '';
        
        // Populate tops
        data.tops.forEach(filename => {
            addItemToContainer('tops', filename);
        });
        
        // Populate bottoms
        data.bottoms.forEach(filename => {
            addItemToContainer('bottoms', filename);
        });
        
        // Populate shoes
        data.shoes.forEach(filename => {
            addItemToContainer('shoes', filename);
        });
        
        // Populate accessories
        data.accessories.forEach(filename => {
            addItemToContainer('accessories', filename);
        });
    } catch (error) {
        console.error('Error loading closet:', error);
        uploadStatus.textContent = 'Failed to load closet items.';
        uploadStatus.className = 'status-message error';
    }
}

// Add item to container
function addItemToContainer(category, filename) {
    const container = document.getElementById(`${category}Container`);
    const itemElement = document.createElement('div');
    itemElement.className = 'closet-item';
    itemElement.style.backgroundImage = `url(images/${filename})`;
    itemElement.dataset.filename = filename;
    
    // Add click event for selecting items
    itemElement.addEventListener('click', () => {
        // Remove selected class from all items in this category
        const items = container.querySelectorAll('.closet-item');
        items.forEach(item => item.classList.remove('selected'));
        
        // Add selected class to this item
        itemElement.classList.add('selected');
        
        // Update current outfit and preview
        currentOutfit[category] = filename;
        updatePreview(category, filename);
    });
    
    container.appendChild(itemElement);
}

// Update item preview
// Update item preview
function updatePreview(category, filename) {
    // For shoes, we need to handle the category name conversion correctly
    let previewId;
    if (category === 'shoes') {
        previewId = 'previewShoes'; // Make sure this matches the HTML element ID
    } else {
        // For other categories (tops, bottoms, accessories)
        previewId = `preview${category.charAt(0).toUpperCase() + category.slice(1, -1)}`;
    }
    
    const previewElement = document.getElementById(previewId);
    if (previewElement) {
        previewElement.style.backgroundImage = `url(images/${filename})`;
        console.log(`Updated ${previewId} with image: images/${filename}`);
    } else {
        console.error(`Preview element not found for category: ${category}`);
    }
}

// Add item to closet
async function addItemToCloset() {
    if (!currentUser) {
        alert('Please login first');
        showModal();
        return;
    }
    
    const imageUrl = imageUrlInput.value.trim();
    const category = categorySelect.value;
    
    if (!imageUrl) {
        uploadStatus.textContent = 'Please enter an image URL';
        uploadStatus.className = 'status-message error';
        return;
    }
    
    uploadStatus.textContent = 'Processing image...';
    uploadStatus.className = 'status-message';
    
    try {
        const response = await fetch(`/users/${currentUser._id}/addItem`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageUrl, category }),
        });
        
        const data = await response.json();
        
        if (data.success) {
            uploadStatus.textContent = `Item successfully added to your ${category}!`;
            uploadStatus.className = 'status-message success';
            imageUrlInput.value = '';
            
            // Add new item to the container
            addItemToContainer(category, data.filename);
        } else {
            uploadStatus.textContent = 'Error: ' + data.error;
            uploadStatus.className = 'status-message error';
        }
    } catch (error) {
        console.error('Upload error:', error);
        uploadStatus.textContent = 'Failed to upload. Please try again.';
        uploadStatus.className = 'status-message error';
    }
}

// Save current outfit
function saveOutfit() {
    if (!currentUser) {
        alert('Please login first');
        showModal();
        return;
    }
    
    // Check if at least one item is selected
    if (!currentOutfit.tops && !currentOutfit.bottoms && !currentOutfit.shoes && !currentOutfit.accessories) {
        alert('Please select at least one item for your outfit');
        return;
    }
    
    // Create an outfit card in the saved outfits section
    const outfitCard = document.createElement('div');
    outfitCard.className = 'outfit-card';
    
    // Create thumbnail (using top as the main image, or any available item)
    const thumbnailImage = currentOutfit.tops || currentOutfit.bottoms || currentOutfit.shoes || currentOutfit.accessories;
    const thumbnail = document.createElement('div');
    thumbnail.className = 'outfit-thumbnail';
    thumbnail.style.backgroundImage = `url(images/${thumbnailImage})`;
    
    // Create outfit info
    const outfitInfo = document.createElement('div');
    outfitInfo.className = 'outfit-info';
    
    const outfitName = document.createElement('h4');
    outfitName.textContent = `Outfit ${outfitsList.children.length + 1}`;
    
    const outfitDate = document.createElement('p');
    outfitDate.className = 'outfit-date';
    outfitDate.textContent = new Date().toLocaleDateString();
    
    // Add click event to load this outfit
    outfitCard.addEventListener('click', () => {
        loadSavedOutfit(currentOutfit);
    });
    
    // Build the card
    outfitInfo.appendChild(outfitName);
    outfitInfo.appendChild(outfitDate);
    outfitCard.appendChild(thumbnail);
    outfitCard.appendChild(outfitInfo);
    
    // Add to saved outfits
    outfitsList.appendChild(outfitCard);
    
    // Confirmation message
    uploadStatus.textContent = 'Outfit saved!';
    uploadStatus.className = 'status-message success';
    
    // In a real application, we would save this to the database
    // saveOutfitToDatabase(currentUser._id, currentOutfit);
}

// Load a saved outfit
function loadSavedOutfit(outfit) {
    // Reset all selected items
    document.querySelectorAll('.closet-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // For each category, find and select the item
    Object.keys(outfit).forEach(category => {
        if (outfit[category]) {
            // Find the item in the container
            const container = document.getElementById(`${category}Container`);
            const items = container.querySelectorAll('.closet-item');
            
            items.forEach(item => {
                if (item.dataset.filename === outfit[category]) {
                    item.classList.add('selected');
                    updatePreview(category, outfit[category]);
                }
            });
            
            // Update current outfit
            currentOutfit[category] = outfit[category];
        }
    });
}


async function saveOutfitToDatabase(userId, outfit) {
    console.log('Saving outfit to database:', userId, outfit);
}
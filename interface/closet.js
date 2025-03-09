// Global variables
let currentUser = null;
let currentOutfit = {
    tops: null,
    bottoms: null,
    shoes: null,
    accessories: null
};

// DOM Elements
const addItemBtn = document.getElementById('addItemBtn');
const topsContainer = document.getElementById('topsContainer');
const bottomsContainer = document.getElementById('bottomsContainer');
const shoesContainer = document.getElementById('shoesContainer');
const accessoriesContainer = document.getElementById('accessoriesContainer');
const previewTop = document.getElementById('previewTop');
const previewBottom = document.getElementById('previewBottom');
const previewShoes = document.getElementById('previewShoes');
const previewAccessories = document.getElementById('previewAccessories');
const saveOutfitBtn = document.getElementById('saveOutfitBtn');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Check local storage for user ID
    const userId = localStorage.getItem('userId');
    if (userId) {
        currentUser = { _id: userId };
        loadUserCloset();
    } else {
        // Redirect to signin page if no user is found
        // window.location.href = 'signin.html';
        
        // For testing, we'll load a dummy user
        currentUser = { _id: 'dummyUser123' };
        loadUserCloset();
    }
    
    addEventListeners();
});

// Event listeners
function addEventListeners() {
    if (addItemBtn) {
        addItemBtn.addEventListener('click', () => {
            window.location.href = 'add.html';
        });
    }
    
    if (saveOutfitBtn) {
        saveOutfitBtn.addEventListener('click', saveOutfit);
    }
}

// Load user's closet items
async function loadUserCloset() {
    if (!currentUser) return;
    
    try {
        // For development, simulate loading items
        // In production, use this:
        // const response = await fetch(`/users/${currentUser._id}/items`);
        // const data = await response.json();
        
        // Simulated data for testing
        const data = {
            tops: ['top1.png', 'top2.png', 'top3.png'],
            bottoms: ['bottom1.png', 'bottom2.png'],
            shoes: ['shoes1.png', 'shoes2.png'],
            accessories: ['acc1.png', 'acc2.png']
        };
        
        // Clear existing containers
        if (topsContainer) topsContainer.innerHTML = '';
        if (bottomsContainer) bottomsContainer.innerHTML = '';
        if (shoesContainer) shoesContainer.innerHTML = '';
        if (accessoriesContainer) accessoriesContainer.innerHTML = '';
        
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
    }
}

// Add item to container
function addItemToContainer(category, filename) {
    const container = document.getElementById(`${category}Container`);
    if (!container) return;
    
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
function updatePreview(category, filename) {
    let previewElement;
    
    // Handle different categories
    if (category === 'tops') {
        previewElement = previewTop;
    } else if (category === 'bottoms') {
        previewElement = previewBottom;
    } else if (category === 'shoes') {
        previewElement = previewShoes;
    } else if (category === 'accessories') {
        previewElement = previewAccessories;
    }
    
    if (previewElement) {
        previewElement.style.backgroundImage = `url(images/${filename})`;
        console.log(`Updated ${category} preview with image: ${filename}`);
    }
}

// Save current outfit
function saveOutfit() {
    if (!currentUser) return;
    
    // Check if at least one item is selected
    if (!currentOutfit.tops && !currentOutfit.bottoms && !currentOutfit.shoes && !currentOutfit.accessories) {
        alert('Please select at least one item for your outfit');
        return;
    }
    
    // In a real application, we would save this to the database
    console.log('Saving outfit:', currentOutfit);
    
    // For now, we'll simulate success and redirect to outfits page
    alert('Outfit saved successfully!');
    
    // Optionally redirect to outfits page
    // window.location.href = 'outfits.html';
}
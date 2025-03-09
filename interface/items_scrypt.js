document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const userId = localStorage.getItem('userId');
    if (!userId) {
      // Redirect to sign-in page if no user is logged in
      window.location.href = "/signin";
      return;
    }
    
    // Determine the current category based on the page URL or filename
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    const categories = ['tops', 'bottoms', 'shoes', 'accessories'];
    
    // Default to the first category if we can't determine it from the URL
    let category = categories.includes(currentPage) ? currentPage : 'shoes';
    
    // Load user's items for the current category
    loadUserItems(userId, category);
  });
  
  async function loadUserItems(userId, category) {
    const itemsGrid = document.getElementById('items-grid');
    const loadingIndicator = document.getElementById('loading-indicator');
    const emptyState = document.getElementById('empty-state');
    const errorMessage = document.getElementById('error-message');
    
    try {
      // Fetch user's items
      const response = await fetch(`/users/${userId}/items`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Hide loading indicator
      loadingIndicator.style.display = 'none';
      
      // Check if there are items in this category
      if (!data[category] || data[category].length === 0) {
        emptyState.style.display = 'block';
        return;
      }
      
      data[category].forEach(item => {
        // Create item card
        const itemCard = document.createElement('div');
        itemCard.className = 'item-card';
        
        // Create image container
        const itemImage = document.createElement('div');
        itemImage.className = 'item-image';
        itemImage.style.backgroundImage = `url(images/${item.filename})`;
        
        // Add elements to card
        itemCard.appendChild(itemImage);
        
        // Create item details
        if (item.name) {
          const nameElement = document.createElement('p');
          nameElement.className = 'name';
          nameElement.textContent = `Name: ${item.name}`;
          itemCard.appendChild(nameElement);
        }
        
        if (item.brand) {
          const brandElement = document.createElement('p');
          brandElement.className = 'store';
          brandElement.textContent = `Brand: ${item.brand}`;
          itemCard.appendChild(brandElement);
        }
        
        if (item.price) {
          const priceElement = document.createElement('p');
          priceElement.className = 'price';
          priceElement.textContent = `Price: ${item.price}`;
          itemCard.appendChild(priceElement);
        }
        
        // Add delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.innerHTML = '&times;';
        deleteButton.setAttribute('aria-label', 'Delete item');
        deleteButton.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteItem(userId, category, item._id, itemCard);
        });
        
        itemCard.appendChild(deleteButton);
        
        // Add card to grid
        itemsGrid.appendChild(itemCard);
      });
      
    } catch (error) {
      console.error('Error loading items:', error);
      loadingIndicator.style.display = 'none';
      errorMessage.style.display = 'block';
    }
  }
  
  async function deleteItem(userId, category, itemId, itemCard) {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }
    
    try {
      const response = await fetch(`/users/${userId}/deleteItem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          itemId
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Remove the item card from the grid
        itemCard.remove();
        
        // Check if there are any items left
        const itemsGrid = document.getElementById('items-grid');
        if (itemsGrid.children.length === 0) {
          document.getElementById('empty-state').style.display = 'block';
        }
      } else {
        alert('Failed to delete item: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    }
  }
async function fetchAndDisplay(userId) {
    const res = await fetch(`http://localhost:3000/users/67ccd51d018efeba5f8fec2a/items`);
    const data = await res.json();
  
    ['tops', 'bottoms', 'shoes', 'accessories'].forEach(category => {
      const container = document.getElementById(category);
      container.innerHTML = '';
  
      data[category].forEach(imgFile => {
        const img = document.createElement('img');
        img.src = `images/${imgFile}`;
        container.appendChild(img);
      });
    });
  }
  
  fetchAndDisplay('67ccd51d018efeba5f8fec2a');
  
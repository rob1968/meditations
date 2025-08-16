// Manual JavaScript patch for Community Hub
// AGGRESSIVE MODE - Override React image rendering

console.log('🚨 Community Hub v2.0.3: AGGRESSIVE image removal mode activated');

// More aggressive image removal that handles React re-renders
function aggressiveImageRemoval() {
  let processed = 0;
  const thumbnails = document.querySelectorAll('.meditation-thumbnail');
  const communityCards = document.querySelectorAll('[class*="community"], [class*="Community"]');
  
  console.log(`🔍 Scan: Found ${thumbnails.length} thumbnails, ${communityCards.length} community elements`);
  
  if (thumbnails.length === 0) {
    // Try alternative selectors
    const altThumbnails = document.querySelectorAll('[class*="thumbnail"], [class*="Thumbnail"], .meditation-card img, .community-card img');
    console.log(`🔍 Alternative scan: Found ${altThumbnails.length} potential thumbnails`);
  }
  
  thumbnails.forEach((thumbnail, index) => {
    console.log(`🔍 Checking thumbnail ${index}:`, {
      element: thumbnail,
      innerHTML: thumbnail.innerHTML,
      hasImages: thumbnail.querySelector('img') ? 'YES' : 'NO',
      hasOverlays: thumbnail.querySelector('div[style*="position: absolute"]') ? 'YES' : 'NO'
    });
    
    // Check if this thumbnail has images
    const hasImages = thumbnail.querySelector('img');
    const hasOverlays = thumbnail.querySelector('div[style*="position: absolute"]');
    
    if (hasImages || hasOverlays) {
      processed++;
      console.log('🔄 Removing images from thumbnail:', thumbnail);
      
      // Completely clear and rebuild with emoji only
      const meditationType = thumbnail.closest('.meditation-card')?.querySelector('[data-meditation-type]')?.getAttribute('data-meditation-type');
      
      // Determine emoji based on meditation type or existing content
      let emoji = '🧘'; // default
      if (thumbnail.textContent.includes('😴') || meditationType === 'sleep') emoji = '😴';
      else if (thumbnail.textContent.includes('💪') || meditationType === 'stress') emoji = '💪';
      else if (thumbnail.textContent.includes('🎯') || meditationType === 'focus') emoji = '🎯';
      else if (thumbnail.textContent.includes('⚡') || meditationType === 'energy') emoji = '⚡';
      else if (thumbnail.textContent.includes('😰') || meditationType === 'anxiety') emoji = '😰';
      
      // Completely replace content
      thumbnail.innerHTML = emoji;
      
      // Force styling
      thumbnail.style.cssText = `
        width: ${window.innerWidth <= 768 ? '60px' : '70px'};
        height: ${window.innerWidth <= 768 ? '60px' : '70px'};
        border-radius: 8px;
        overflow: hidden;
        flex-shrink: 0;
        background: linear-gradient(135deg, rgba(75, 70, 229, 0.25), rgba(255, 255, 255, 0.1));
        position: relative;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: ${window.innerWidth <= 768 ? '20px' : '24px'} !important;
      `;
    }
  });
  
  if (processed > 0) {
    console.log(`✅ Processed ${processed} thumbnails, removed all images`);
  } else if (thumbnails.length > 0) {
    console.log(`ℹ️ Found ${thumbnails.length} thumbnails but none had images (good!)`);
  } else {
    console.log(`⚠️ No thumbnails found - may need to wait for Community Hub to load`);
  }
}

// Run immediately
aggressiveImageRemoval();

// Run every 100ms for the first 10 seconds to catch React re-renders
let attempts = 0;
const aggressiveInterval = setInterval(() => {
  aggressiveImageRemoval();
  attempts++;
  if (attempts > 100) { // Stop after 10 seconds (100 * 100ms)
    clearInterval(aggressiveInterval);
    console.log('🔥 Aggressive mode complete - switched to observer mode');
  }
}, 100);

// Also use mutation observer for long-term monitoring
const observer = new MutationObserver(() => {
  setTimeout(aggressiveImageRemoval, 50); // Small delay to let React finish
});

// Monitor the entire document for changes
if (document.body) {
  observer.observe(document.body, { 
    childList: true, 
    subtree: true, 
    attributes: true,
    attributeFilter: ['src', 'style', 'class']
  });
} else {
  // If body not ready, wait for it
  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { 
      childList: true, 
      subtree: true, 
      attributes: true,
      attributeFilter: ['src', 'style', 'class']
    });
  });
}
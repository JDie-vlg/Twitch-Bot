document.addEventListener('DOMContentLoaded', function() {
  const overlay = document.querySelector('.overlay-wrapper');
  const wrapper = document.querySelector('.wrapper-container');

  function toggleOverlay(show) {
    if (show) {
      overlay.style.display = 'flex';
      wrapper.setAttribute('inert', '');
      overlay.removeAttribute('inert');
    } else {
      overlay.style.display = 'none';
      wrapper.removeAttribute('inert');
    }
  }

  const tabs = document.querySelectorAll('[data-bs-toggle="pill"]');
  tabs.forEach(tab => {
    tab.addEventListener('shown.bs.tab', function(e) {
      const target = e.target.getAttribute('data-bs-target');
      if (target === '#pills-donation_alerts' || target === '#pills-telegram') {
        toggleOverlay(true);
      } else {
        toggleOverlay(false);
      }
    });
  });

  toggleOverlay(false);
});
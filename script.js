const mapboxToken = "pk.eyJ1IjoiYW5ha2FseXBzZSIsImEiOiJjazBlankxa2MwaXI0M2RwODlqZDlnajZxIn0.OxhIZtQVLRUW8jbBoa8x7w";

function setupAutocomplete(inputId) {
  const input = document.getElementById(inputId);
  let controller;

  const suggestionBox = document.createElement('div');
  suggestionBox.className = 'suggestion-box';
  suggestionBox.style.position = 'absolute';
  suggestionBox.style.background = '#fff';
  suggestionBox.style.border = '1px solid #ccc';
  suggestionBox.style.zIndex = '1000';
  suggestionBox.style.width = input.offsetWidth + 'px';
  suggestionBox.style.maxHeight = '200px';
  suggestionBox.style.overflowY = 'auto';
  suggestionBox.style.display = 'none';
  input.parentNode.style.position = 'relative';
  input.parentNode.appendChild(suggestionBox);

  input.addEventListener('input', async () => {
    const query = input.value;
    if (query.length < 3) {
      suggestionBox.innerHTML = '';
      suggestionBox.style.display = 'none';
      return;
    }

    if (controller) controller.abort();
    controller = new AbortController();

    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&autocomplete=true&limit=5`, {
        signal: controller.signal
      });
      const data = await res.json();

      suggestionBox.innerHTML = '';
      if (data.features.length > 0) {
        data.features.forEach(feature => {
          const item = document.createElement('div');
          item.textContent = feature.place_name;
          item.style.padding = '8px';
          item.style.cursor = 'pointer';
          item.addEventListener('click', () => {
            input.value = feature.place_name;
            suggestionBox.style.display = 'none';
          });
          suggestionBox.appendChild(item);
        });
        suggestionBox.style.display = 'block';
      } else {
        suggestionBox.innerHTML = '<div style="padding: 8px; color: #888;">No results found</div>';
        suggestionBox.style.display = 'block';
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error(e);
    }
  });

  document.addEventListener('click', e => {
    if (!suggestionBox.contains(e.target) && e.target !== input) {
      suggestionBox.style.display = 'none';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupAutocomplete('start-address');
  setupAutocomplete('destination-address');
});

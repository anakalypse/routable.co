const mapboxToken = "pk.eyJ1IjoiYW5ha2FseXBzZSIsImEiOiJjazBlankxa2MwaXI0M2RwODlqZDlnajZxIn0.OxhIZtQVLRUW8jbBoa8x7w";

function setupAutocomplete(inputId, suggestionBoxId) {
  const input = document.getElementById(inputId);
  const suggestionBox = document.getElementById(suggestionBoxId);
  let controller;

  input.classList.add('wide-address');

  input.addEventListener('input', async () => {
    const query = input.value;
    suggestionBox.innerHTML = '';
    if (query.length < 3) return;

    if (controller) controller.abort();
    controller = new AbortController();

    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&autocomplete=true&limit=5`, { signal: controller.signal });
      const data = await res.json();

      if (data.features.length > 0) {
        data.features.forEach(feature => {
          const item = document.createElement('div');
          item.className = 'autocomplete-suggestion';
          item.textContent = feature.place_name;
          item.onclick = () => {
            input.value = feature.place_name;
            suggestionBox.innerHTML = '';
            suggestionBox.style.display = 'none';
          };
          suggestionBox.appendChild(item);
        });
        suggestionBox.style.display = 'block';
      } else {
        suggestionBox.style.display = 'none';
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error(e);
    }
  });

  document.addEventListener('click', (e) => {
    if (!suggestionBox.contains(e.target) && e.target !== input) {
      suggestionBox.innerHTML = '';
      suggestionBox.style.display = 'none';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupAutocomplete('start-address', 'start-suggestions');
  setupAutocomplete('destination-address', 'destination-suggestions');
});

const hereApiKey = '1HQmrc3Q5W6Bd7J6M9wpgKcPNvU_egDX0rbnipuOEq8';

function createSuggestionBox(inputId, cityId, stateId, zipId, streetId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.placeholder = '';

  const container = document.createElement('div');
  container.style.position = 'relative';
  input.parentNode.insertBefore(container, input);
  container.appendChild(input);

  const suggestionBox = document.createElement('div');
  suggestionBox.className = 'suggestion-box';
  suggestionBox.style.display = 'none';
  container.appendChild(suggestionBox);

  input.addEventListener('input', async () => {
    const value = input.value;
    suggestionBox.innerHTML = '';
    if (value.length < 3) {
      suggestionBox.style.display = 'none';
      return;
    }
    try {
      const response = await fetch(
        `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(value)}&apiKey=${hereApiKey}`
      );
      const results = await response.json();
      if (results.items && results.items.length > 0) {
        results.items.forEach(item => {
          const itemDiv = document.createElement('div');
          itemDiv.className = 'suggestion-item';
          itemDiv.textContent = item.address.label;
          itemDiv.onclick = () => {
            document.getElementById(streetId).value = item.address.street || item.address.houseNumber || item.address.label || '';
            document.getElementById(cityId).value = item.address.city || '';
            document.getElementById(stateId).value = item.address.state || '';
            document.getElementById(zipId).value = item.address.postalCode || '';
            input.value = item.address.label || '';
            suggestionBox.style.display = 'none';
          };
          suggestionBox.appendChild(itemDiv);
        });
        suggestionBox.style.display = 'block';
      } else {
        suggestionBox.style.display = 'none';
      }
    } catch (err) {
      console.error('HERE API error:', err);
      suggestionBox.style.display = 'none';
    }
  });

  document.addEventListener('click', e => {
    if (!suggestionBox.contains(e.target) && e.target !== input) {
      suggestionBox.style.display = 'none';
    }
  });
}

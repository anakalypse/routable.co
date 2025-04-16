function createSuggestionBox(inputId, cityId, stateId, zipId) {
  const input = document.getElementById(inputId);
  if (!input) return;

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
      const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(value)}&apiKey=2352658152154752af3fb89c105d8a1c`);
      const results = await response.json();
      if (results.features && results.features.length > 0) {
        results.features.forEach(feature => {
          const item = document.createElement('div');
          item.className = 'suggestion-item';
          item.textContent = feature.properties.formatted;
          item.onclick = () => {
            input.value = feature.properties.formatted || '';
            document.getElementById(cityId).value = feature.properties.city || '';
            document.getElementById(stateId).value = feature.properties.state || '';
            document.getElementById(zipId).value = feature.properties.postcode || '';
            suggestionBox.style.display = 'none';
          };
          suggestionBox.appendChild(item);
        });
        suggestionBox.style.display = 'block';
      } else {
        suggestionBox.style.display = 'none';
      }
    } catch (err) {
      console.error('Geoapify API error:', err);
      suggestionBox.style.display = 'none';
    }
  });

  document.addEventListener('click', e => {
    if (!suggestionBox.contains(e.target) && e.target !== input) {
      suggestionBox.style.display = 'none';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const tripTypeRadios = document.getElementsByName('tripType');
  const returnTime = document.getElementById('end-time');
  if (tripTypeRadios && returnTime) {
    tripTypeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        returnTime.disabled = radio.value === 'oneway';
        returnTime.required = radio.value !== 'oneway';
        returnTime.style.opacity = radio.value === 'oneway' ? '0.5' : '1';
      });
    });
  }

  const toggleFlex = (checkboxId, inputIds) => {
    const checkbox = document.getElementById(checkboxId);
    const inputs = inputIds.map(id => document.getElementById(id));
    const update = () => {
      inputs.forEach(input => {
        if (input) {
          input.disabled = checkbox.checked;
          input.required = !checkbox.checked;
          input.style.opacity = checkbox.checked ? '0.5' : '1';
        }
      });
    };
    if (checkbox) checkbox.addEventListener('change', update);
    update();
  };

  toggleFlex('time-flexible', ['start-time']);
  toggleFlex('return-flexible', ['end-time']);
  toggleFlex('walking-flexible', ['walking-distance']);
  toggleFlex('budget-flexible', ['budget-max']);

  ['start', 'destination'].forEach(prefix => {
    const checkbox = document.getElementById(`${prefix}-uncertain`);
    const notes = document.getElementById(`${prefix}-uncertain-notes`);
    if (checkbox && notes) {
      checkbox.addEventListener('change', () => {
        notes.disabled = !checkbox.checked;
        notes.style.opacity = checkbox.checked ? '1' : '0.5';
      });
    }

    const input = document.getElementById(`${prefix}-address`);
    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.textContent = 'Confirm Address';
    confirmBtn.style.marginTop = '6px';
    confirmBtn.style.padding = '6px 10px';
    confirmBtn.style.fontSize = '0.9em';
    confirmBtn.style.cursor = 'pointer';
    confirmBtn.onclick = async () => {
      const value = input.value;
      if (!value || value.length < 3) return alert('Please enter an address to confirm.');
      try {
        const response = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(value)}&format=json&apiKey=2352658152154752af3fb89c105d8a1c&limit=1&type=street`);
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const props = data.features[0].properties;
          input.value = props.formatted;
          document.getElementById(`${prefix}-city`).value = props.city || '';
          document.getElementById(`${prefix}-state`).value = props.state || '';
          document.getElementById(`${prefix}-zip`).value = props.postcode || '';
          alert('Address confirmed!');
        } else {
          alert('Address not found. Try refining it.');
        }
      } catch (error) {
        console.error(error);
        alert('Address lookup failed.');
      }
    };
    input.parentNode.appendChild(confirmBtn);
  });

  createSuggestionBox('start-address', 'start-city', 'start-state', 'start-zip');
  createSuggestionBox('destination-address', 'destination-city', 'destination-state', 'destination-zip');
});

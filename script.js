// Initialize Supabase client
const SUPABASE_URL = 'https://zszjyfswpplbhjxievhz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpzemp5ZnN3cHBsYmhqeGlldmh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4NTU5ODgsImV4cCI6MjA2MDQzMTk4OH0.5oh10-d4zwemTGZCEwfEeXs5C0gqjZid5HF6sDng7j0';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Function to fetch address suggestions from Mapbox
async function fetchSuggestions(query) {
  const MAPBOX_TOKEN = 'pk.eyJ1IjoiYW5ha2FseXBzZSIsImEiOiJjbTlrdGEzdXYwdGY0MmxwbjEzN2dzMm0zIn0.BvsUMTwPUGngjhTb9fkazA';
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?autocomplete=true&types=address&limit=5&access_token=${MAPBOX_TOKEN}`;
  try {
    console.log("Mapbox query URL:", url);
    const response = await fetch(url);
    const data = await response.json();
    console.log('Mapbox API response:', data);
    if (!data.features || data.features.length === 0) {
      console.warn('No suggestions returned from Mapbox.');
    }
    return data.features || [];
  } catch (error) {
    console.error('Failed to fetch suggestions from Mapbox:', error);
    return [];
  }
}

// Manual test for Mapbox API response
fetchSuggestions('Seattle').then(results => console.log('Test fetch for Seattle:', results));

// Handle form submission
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('routable-form');
  const messageDiv = document.getElementById('form-message');
  const addressInputs = document.querySelectorAll('input.address-box');

  // Address autosuggest logic
  addressInputs.forEach(input => {
    const suggestionBox = document.createElement('div');
    suggestionBox.className = 'suggestion-box';
    suggestionBox.style.display = 'none';
    input.parentNode.appendChild(suggestionBox);

    input.addEventListener('input', async () => {
      const query = input.value.trim();
      if (query.length < 3) {
        suggestionBox.innerHTML = '';
        suggestionBox.style.display = 'none';
        return;
      }

      const suggestions = await fetchSuggestions(query);
      suggestionBox.innerHTML = '';

      suggestions.forEach(feature => {
        const address = feature.place_name;
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = address;
        item.addEventListener('click', () => {
          input.value = address;
          suggestionBox.innerHTML = '';
          suggestionBox.style.display = 'none';
        });
        suggestionBox.appendChild(item);
      });

      suggestionBox.style.display = suggestions.length ? 'block' : 'none';
    });

    document.addEventListener('click', e => {
      if (!suggestionBox.contains(e.target) && e.target !== input) {
        suggestionBox.style.display = 'none';
      }
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    data.walking_flexible = document.getElementById('walking-flexible').checked;
    data.budget_flexible = document.getElementById('budget-flexible').checked;
    data.language = data.language || null;
    data.deadline = data.deadline || null;
    data.urgency_notes = data.urgency_notes || null;
    data.time_notes = data.time_notes || null;
    data.notes = data.notes || null;

    const accessibility = [];
    form.querySelectorAll('input[name="accessibility"]:checked').forEach(cb => accessibility.push(cb.value));
    data.accessibility = accessibility.length ? accessibility : null;

    console.log('Form data to be submitted:', data);

    const { error } = await supabase.from('requests').insert([data]);

    if (error) {
      messageDiv.textContent = 'Submission failed. Please try again later.';
      messageDiv.className = 'message error';
      console.error(error);
    } else {
      messageDiv.textContent = 'Your request was sent successfully!';
      messageDiv.className = 'message success';
      form.reset();
    }
  });

  const deadlineFlexible = document.getElementById('deadline-flexible');
  const deadlineField = document.getElementById('deadline');
  deadlineFlexible.addEventListener('change', () => {
    deadlineField.disabled = deadlineFlexible.checked;
    deadlineField.required = !deadlineFlexible.checked;
  });
});

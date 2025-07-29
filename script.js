// Initialize Supabase client
const SUPABASE_URL = 'https://zszjyfswpplbhjxievhz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpzemp5ZnN3cHBsYmhqeGlldmh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4NTU5ODgsImV4cCI6MjA2MDQzMTk4OH0.5oh10-d4zwemTGZCEwfEeXs5C0gqjZid5HF6sDng7j0';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYW5ha2FseXBzZSIsImEiOiJjbTlrdGEzdXYwdGY0MmxwbjEzN2dzMm0zIn0.BvsUMTwPUGngjhTb9fkazA';

const MAX_FREE_TRIPS = 3;

// Show modal
function showUpgradeModal(message) {
  const modal = document.getElementById('upgrade-modal');
  const messageEl = document.getElementById('upgrade-message');
  messageEl.textContent = message;
  modal.style.display = 'flex';

  document.getElementById('close-modal').onclick = () => {
    modal.style.display = 'none';
  };

  document.getElementById('subscribe-2').onclick = () => {
    window.location.href = '/subscriptions?plan=2';
  };

  document.getElementById('subscribe-5').onclick = () => {
    window.location.href = '/subscriptions?plan=5';
  };

  // Close modal if clicking outside content
  modal.onclick = (e) => {
    if (e.target === modal) modal.style.display = 'none';
  };
}

// Check subscription tier and show upgrade options
async function checkAndPromptUpgrade() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  const tier = profile?.subscription_tier || 'free';

  if (tier === 'free') {
    showUpgradeModal("You've reached your free trip limit. Upgrade to $2/month for 15 trips or $5/month for unlimited.");
  } else if (tier === 'tier_2') {
    showUpgradeModal("You've reached your 15 trips/month limit. Upgrade to $5/month for unlimited access.");
  }
}

// Check trip limit
async function canSubmitTrip() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    let guestTrips = parseInt(localStorage.getItem('guestTrips') || '0');
    if (guestTrips >= MAX_FREE_TRIPS) {
      alert("You've reached your free trip limit. Please log in or subscribe.");
      return false;
    }
    localStorage.setItem('guestTrips', guestTrips + 1);
  }
  return true;
}

// Address autosuggest
async function fetchSuggestions(query) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?autocomplete=true&types=address&limit=25&country=US&language=en&access_token=${MAPBOX_TOKEN}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.features || [];
  } catch (error) {
    console.error('Mapbox fetch error:', error);
    return [];
  }
}

function setupAutosuggest(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  let suggestionBox = document.createElement('div');
  suggestionBox.className = 'suggestion-box';
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
}

document.addEventListener('DOMContentLoaded', () => {
  setupAutosuggest('start-address');
  setupAutosuggest('destination-address');

  const form = document.getElementById('routable-form');
  const messageDiv = document.getElementById('form-message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const allowed = await canSubmitTrip();
    if (!allowed) {
      await checkAndPromptUpgrade();
      return;
    }

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

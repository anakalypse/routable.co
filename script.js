// ===============================
// Routable — resilient script.js
// ===============================

// ---- Config (your keys kept here; safe to leave) ----
const SUPABASE_URL = 'https://zszjyfswpplbhjxievhz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpzemp5ZnN3cHBsYmhqeGlldmh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4NTU5ODgsImV4cCI6MjA2MDQzMTk4OH0.5oh10-d4zwemTGZCEwfEeXs5C0gqjZid5HF6sDng7j0';
const MAPBOX_TOKEN = 'pk.eyJ1IjoiYW5ha2FseXBzZSIsImEiOiJjbTlrdGEzdXYwdGY0MmxwbjEzN2dzMm0zIn0.BvsUMTwPUGngjhTb9fkazA';
const MAX_FREE_TRIPS = 3;

// ---- Globals for service health ----
let supabase = null;
let supabaseAvailable = false;
let mapboxAvailable = false;

// Small helpers
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const nowISO = () => new Date().toISOString();

function setDisabled(el, disabled) {
  if (!el) return;
  el.disabled = disabled;
  el.setAttribute('aria-disabled', String(disabled));
  if (disabled) el.value = '';
}

// ---- Status banner (optional UI feedback) ----
function showStatusBanner(text) {
  let banner = $('#status-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'status-banner';
    banner.style.cssText = `
      margin: 10px 0 16px; padding: 10px 12px; border-radius: 10px;
      background: rgba(255,255,200,0.9); border: 1px solid #e0d977;
      color: #5a5400; font-weight: 600; font-size: 0.95rem; text-align: center;
    `;
    const overlay = document.querySelector('.overlay');
    if (overlay) overlay.insertBefore(banner, overlay.firstChild.nextSibling); // under the H1
  }
  banner.textContent = text;
}

// ---- Upgrade Modal (unchanged behavior, plus ESC/backdrop close) ----
function showUpgradeModal(message) {
  const modal = $('#upgrade-modal');
  const messageEl = $('#upgrade-message');
  const closeBtn = $('#close-modal');
  const subscribe2 = $('#subscribe-2');
  const subscribe5 = $('#subscribe-5');

  if (!modal) return;
  messageEl.textContent = message;
  modal.style.display = 'grid';
  modal.removeAttribute('hidden');

  const focusables = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  function trap(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function hide() {
    modal.style.display = 'none';
    modal.setAttribute('hidden', 'true');
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) {
    if (e.key === 'Escape') hide();
    else trap(e);
  }

  closeBtn.onclick = hide;
  subscribe2.onclick = () => { window.location.href = '/subscriptions?plan=2'; };
  subscribe5.onclick = () => { window.location.href = '/subscriptions?plan=5'; };
  modal.onclick = (e) => { if (e.target === modal) hide(); };
  document.addEventListener('keydown', onKey);
  (first || closeBtn).focus();
}

async function checkAndPromptUpgrade() {
  if (!supabaseAvailable) return; // nothing to check if offline
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

async function canSubmitTrip() {
  if (!supabaseAvailable) return true; // let offline queue handle limits locally
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    let guestTrips = parseInt(localStorage.getItem('guestTrips') || '0', 10);
    if (guestTrips >= MAX_FREE_TRIPS) {
      showUpgradeModal("You've reached your free trip limit. Please log in or subscribe.");
      return false;
    }
  }
  return true;
}

// ---- Address Autosuggest: Mapbox + fallback to Nominatim ----
(async () => {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/test.json?limit=1&access_token=${MAPBOX_TOKEN}`;
  try {
    const r = await fetch(url);
    console.log('Mapbox status:', r.status, r.statusText);
    if (r.status === 200) console.log('✅ Token works.');
    else console.warn('⚠️ Mapbox error. Check account/token.');
  } catch (e) {
    console.error('❌ Network/blocked:', e);
  }
})();

async function mapboxSuggest(query) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?autocomplete=true&types=address&limit=25&country=US&language=en&access_token=${MAPBOX_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mapbox ${res.status}`);
  const data = await res.json();
  return (data.features || []).map(f => f.place_name);
}

async function nominatimSuggest(query) {
  // Public, no key; polite rate limiting is advised in production
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=0&limit=10`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();
  return (data || []).map(item => item.display_name);
}

async function fetchSuggestions(query) {
  if (mapboxAvailable) {
    try { return await mapboxSuggest(query); }
    catch (e) { console.warn('Mapbox failed, falling back to Nominatim:', e.message); }
  }
  try { return await nominatimSuggest(query); }
  catch (e) { console.warn('Nominatim failed:', e.message); return []; }
}

function setupAutosuggest(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const suggestionBox = document.createElement('div');
  suggestionBox.className = 'suggestion-box';
  input.insertAdjacentElement('afterend', suggestionBox);

  input.addEventListener('input', async () => {
    const q = input.value.trim();
    if (q.length < 3) {
      suggestionBox.innerHTML = '';
      suggestionBox.style.display = 'none';
      return;
    }
    const suggestions = await fetchSuggestions(q);
    suggestionBox.innerHTML = '';
    suggestions.forEach(address => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.textContent = address;
      item.addEventListener('click', () => {
        input.value = address;
        suggestionBox.innerHTML = '';
        suggestionBox.style.display = 'none';
        input.dispatchEvent(new Event('change'));
      });
      suggestionBox.appendChild(item);
    });
    suggestionBox.style.display = suggestions.length ? 'block' : 'none';
  });

  document.addEventListener('click', (e) => {
    if (!suggestionBox.contains(e.target) && e.target !== input) {
      suggestionBox.style.display = 'none';
    }
  });
}

// ---- Summary Preview ----
function buildSummary() {
  const start = $('#start-address')?.value?.trim();
  const dest = $('#destination-address')?.value?.trim();
  const tripType = $('i

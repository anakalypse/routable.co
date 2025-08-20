// ===============================
// Routable — resilient script.js
// ===============================

// ---- Config (your keys kept here) ----
const SUPABASE_URL = 'https://zszjyfswpplbhjxievhz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpzemp5ZnN3cHBsYmhqeGlldmh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4NTU5ODgsImV4cCI6MjA2MDQzMTk4OH0.5oh10-d4zwemTGZCEwfEeXs5C0gqjZid5HF6sDng7j0';
const MAPBOX_TOKEN = 'pk.eyJ1IjoiYW5ha2FseXBzZSIsImEiOiJjbTlrdGEzdXYwdGY0MmxwbjEzN2dzMm0zIn0.BvsUMTwPUGngjhTb9fkazA';
const MAX_FREE_TRIPS = 3;

// ---- Service health ----
let supabase = null;
let supabaseAvailable = false;
let mapboxAvailable = false;

// ---- Small helpers ----
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const nowISO = () => new Date().toISOString();

function setDisabled(el, disabled) {
  if (!el) return;
  el.disabled = disabled;
  el.setAttribute('aria-disabled', String(disabled));
  if (disabled) el.value = '';
}

function showStatusBanner(text) {
  let banner = $('#status-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'status-banner';
    banner.style.cssText = `
      margin: 10px 0 16px; padding: 10px 12px; border-radius: 10px;
      background: rgba(255,255,200,0.92); border: 1px solid #e0d977;
      color: #5a5400; font-weight: 600; font-size: 0.95rem; text-align: center;
    `;
    const overlay = document.querySelector('.overlay');
    if (overlay) {
      // insert after the H1 if present
      const h1 = overlay.querySelector('h1');
      if (h1 && h1.nextSibling) overlay.insertBefore(banner, h1.nextSibling);
      else overlay.insertBefore(banner, overlay.firstChild);
    }
  }
  banner.textContent = text;
}

// ---- Upgrade Modal ----
function showUpgradeModal(message) {
  const modal = $('#upgrade-modal');
  if (!modal) return;

  $('#upgrade-message').textContent = message;
  modal.style.display = 'grid';
  modal.removeAttribute('hidden');

  const closeBtn = $('#close-modal');
  const subscribe2 = $('#subscribe-2');
  const subscribe5 = $('#subscribe-5');

  const focusables = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  function trapTab(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  function hide() {
    modal.style.display = 'none';
    modal.setAttribute('hidden', 'true');
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (e.key === 'Escape') hide();
    else trapTab(e);
  }

  closeBtn.onclick = hide;
  subscribe2.onclick = () => { window.location.href = '/subscriptions?plan=2'; };
  subscribe5.onclick = () => { window.location.href = '/subscriptions?plan=5'; };
  modal.onclick = (e) => { if (e.target === modal) hide(); };
  document.addEventListener('keydown', onKey);

  (first || closeBtn).focus();
}

async function checkAndPromptUpgrade() {
  if (!supabaseAvailable) return;
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
  if (!supabaseAvailable) return true; // let offline mode handle it
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

// ---- Address Autosuggest (Mapbox + fallback to Nominatim) ----
async function mapboxSuggest(query) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?autocomplete=true&types=address&limit=25&country=US&language=en&access_token=${MAPBOX_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mapbox ${res.status}`);
  const data = await res.json();
  return (data.features || []).map(f => f.place_name);
}

async function nominatimSuggest(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=0&limit=10`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();
  return (data || []).map(item => item.display_name);
}

async function fetchSuggestions(query) {
  if (mapboxAvailable) {
    try { return await mapboxSuggest(query); }
    catch (e) { console.warn('Mapbox failed, falling back:', e.message); }
  }
  try { return await nominatimSuggest(query); }
  catch (e) { console.warn('Nominatim failed:', e.message); return []; }
}

function setupAutosuggest(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  // Ensure a positioning wrapper so the dropdown anchors to the input
  if (!input.parentElement.classList.contains('input-wrap')) {
    const wrap = document.createElement('div');
    wrap.className = 'input-wrap';
    wrap.style.position = 'relative';
    input.parentElement.insertBefore(wrap, input);
    wrap.appendChild(input);
  }

  const suggestionBox = document.createElement('div');
  suggestionBox.className = 'suggestion-box';
  // Minimal inline styles so it works before CSS is updated
  suggestionBox.style.position = 'absolute';
  suggestionBox.style.left = '0';
  suggestionBox.style.top = 'calc(100% + 6px)';
  suggestionBox.style.width = '100%';
  suggestionBox.style.zIndex = '1000';
  suggestionBox.style.display = 'none';
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
      // light inline for usability pre-CSS
      item.style.padding = '12px';
      item.style.cursor = 'pointer';
      item.addEventListener('mouseover', () => { item.style.background = '#f3f6f8'; });
      item.addEventListener('mouseout', () => { item.style.background = 'transparent'; });
      item.addEventListener('click', () => {
        input.value = address;
        suggestionBox.innerHTML = '';
        suggestionBox.style.display = 'none';
        input.dispatchEvent(new Event('change'));
      });
      suggestionBox.appendChild(item);
    });
    suggestionBox.style.background = '#fff';
    suggestionBox.style.border = '1px solid #d6d9de';
    suggestionBox.style.borderRadius = '10px';
    suggestionBox.style.boxShadow = '0 8px 22px rgba(0,0,0,0.15)';
    suggestionBox.style.maxHeight = '220px';
    suggestionBox.style.overflowY = 'auto';
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
  const tripType = $('input[name="tripType"]:checked')?.value || 'oneway';

  const depPref = $('#depart-pref')?.value;
  const depTime = $('#depart-time')?.value;
  const depAny = $('#depart-any')?.checked;

  const retPref = $('#return-pref')?.value;
  const retTime = $('#return-time')?.value;
  const retAny = $('#return-any')?.checked;

  const acc = [];
  $$('.checkbox-group input[type="checkbox"]').forEach(cb => {
    if (cb.checked) {
      const label = cb.closest('label')?.innerText?.trim();
      if (label) acc.push(label);
    }
  });

  const notes = $('#otherNotes')?.value?.trim();
  const accessNotes = $('#accessibility-other-text')?.value?.trim();

  const lines = [];
  if (start) lines.push(`From: ${start}`);
  if (dest) lines.push(`To: ${dest}`);
  if (depAny) lines.push(`Departure: no preference`);
  else if (depTime) lines.push(`Departure: ${depPref === 'arrive' ? 'arrive by' : 'leave at'} ${depTime}`);

  if (tripType === 'roundtrip') {
    if (retAny) lines.push(`Return: no preference`);
    else if (retTime) lines.push(`Return: ${retPref === 'arrive' ? 'arrive by' : 'leave at'} ${retTime}`);
  }

  if (acc.length) lines.push(`Accessibility: ${acc.join(', ')}`);
  if (accessNotes) lines.push(`Accessibility notes: ${accessNotes}`);
  if (notes) lines.push(`Other notes: ${notes}`);

  return lines.join(' • ');
}

function updateSummary() {
  const el = $('#summary-preview');
  if (el) el.textContent = buildSummary();
}

// ---- Form Behavior ----
function wireTripType() {
  const retPref = $('#return-pref');
  const retTime = $('#return-time');
  const retAny = $('#return-any');

  function apply() {
    const value = $('input[name="tripType"]:checked')?.value;
    const isRound = value === 'roundtrip';
    setDisabled(retPref, !isRound);
    setDisabled(retTime, !isRound || (retAny && retAny.checked));
    setDisabled(retAny, !isRound);
  }

  $$('input[name="tripType"]').forEach(r =>
    r.addEventListener('change', () => { apply(); updateSummary(); })
  );

  if (retAny) {
    retAny.addEventListener('change', () => {
      setDisabled(retTime, retAny.checked);
      updateSummary();
    });
  }

  apply();
}

function wireTimeNoPreference() {
  const depAny = $('#depart-any');
  const depTime = $('#depart-time');
  if (depAny && depTime) {
    depAny.addEventListener('change', () => {
      setDisabled(depTime, depAny.checked);
      updateSummary();
    });
    setDisabled(depTime, depAny.checked);
  }
}

function wireSummaryLiveUpdates() {
  const liveSelectors = [
    '#start-address', '#destination-address',
    '#depart-pref', '#depart-time', '#depart-any',
    '#return-pref', '#return-time', '#return-any',
    '.checkbox-group input[type="checkbox"]',
    '#otherNotes', '#accessibility-other-text',
    'input[name="tripType"]'
  ];
  liveSelectors.forEach(sel => {
    $$(sel).forEach(el => {
      el.addEventListener('input', updateSummary);
      el.addEventListener('change', updateSummary);
    });
  });
  updateSummary();
}

// ---- Submit (Supabase OR offline queue) ----
async function submitRequest(form) {
  const allowed = await canSubmitTrip();
  if (!allowed) { await checkAndPromptUpgrade(); return false; }

  const payload = {
    start_address: $('#start-address')?.value?.trim() || null,
    destination_address: $('#destination-address')?.value?.trim() || null,
    trip_type: $('input[name="tripType"]:checked')?.value || 'oneway',
    depart_pref: $('#depart-pref')?.value || null,
    depart_time: $('#depart-time')?.value || null,
    depart_any: $('#depart-any')?.checked || false,
    return_pref: $('#return-pref')?.value || null,
    return_time: $('#return-time')?.value || null,
    return_any: $('#return-any')?.checked || false,
    accessibility: $$('.checkbox-group input[type="checkbox"]').filter(cb => cb.checked).map(cb => cb.closest('label')?.innerText?.trim()),
    accessibility_notes: $('#accessibility-other-text')?.value?.trim() || null,
    notes: $('#otherNotes')?.value?.trim() || null,
    contact_name: $('#name')?.value?.trim() || null,
    contact_email: $('#contact')?.value?.trim() || null,
    summary: buildSummary(),
    created_at: nowISO()
  };

  let success = false;

  if (supabaseAvailable) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      payload.user_id = user?.id || null;
      const { error } = await supabase.from('route_requests').insert(payload);
      if (error) throw error;

      if (!user) {
        let guestTrips = parseInt(localStorage.getItem('guestTrips') || '0', 10);
        localStorage.setItem('guestTrips', String(guestTrips + 1));
      }
      success = true;
    } catch (e) {
      console.warn('Supabase insert failed, queueing locally:', e.message || e);
    }
  }

  if (!success) {
    const key = 'routable_offline_queue';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push(payload);
    localStorage.setItem(key, JSON.stringify(existing));
    showStatusBanner('Offline mode: saved request locally. It will be ready to submit when services are back.');
    success = true;
  }

  if (success) {
    const confirmation = $('#confirmation');
    if (confirmation) {
      confirmation.removeAttribute('hidden');
      confirmation.textContent = "Thank you! We’ll start working on your route shortly.";
    }
    form.reset();
    wireTripType();
    wireTimeNoPreference();
    updateSummary();
  }

  return false;
}

// Expose for <form onsubmit="return validateForm(event);">
window.validateForm = function validateForm(e) {
  e.preventDefault();
  const form = $('#request-form');
  if (!form) return false;

  // Minimal required checks
  const requiredIds = ['start-address','destination-address','name','contact'];
  for (const id of requiredIds) {
    const el = document.getElementById(id);
    if (el && !el.value.trim()) { el.focus(); return false; }
  }

  submitRequest(form);
  return false;
};

// ---- Offline queue sync (runs once if Supabase comes back) ----
async function syncOfflineQueueOnce() {
  if (!supabaseAvailable) return;
  const key = 'routable_offline_queue';
  const items = JSON.parse(localStorage.getItem(key) || '[]');
  if (!items.length) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    const toInsert = items.map(it => ({ ...it, user_id: user?.id || null }));
    const { error } = await supabase.from('route_requests').insert(toInsert);
    if (!error) {
      localStorage.removeItem(key);
      showStatusBanner('Queued requests were synced. You’re back online!');
      setTimeout(() => {
        const b = $('#status-banner');
        if (b) b.remove();
      }, 4000);
    }
  } catch (e) {
    console.warn('Sync failed; will keep queue for later:', e.message || e);
  }
}

// ---- Probes ----
async function probeMapbox() {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/test.json?limit=1&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    mapboxAvailable = true;
  } catch (e) {
    mapboxAvailable = false;
    console.warn('Mapbox unavailable:', e.message || e);
    showStatusBanner('Address autosuggest is using a fallback provider temporarily.');
  }
}

async function probeSupabase() {
  try {
    supabase = window.supabase?.createClient?.(SUPABASE_URL, SUPABASE_KEY);
    if (!supabase) throw new Error('Supabase client not found on window');
    const { error } = await supabase.auth.getSession();
    if (error) throw error;
    supabaseAvailable = true;
  } catch (e) {
    supabaseAvailable = false;
    console.warn('Supabase unavailable:', e.message || e);
    showStatusBanner('Submission is in offline mode (saved locally). Enable Supabase to sync.');
  }
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([probeMapbox(), probeSupabase()]);

  // Sync any queued submissions if Supabase just came back
  if (supabaseAvailable) {
    syncOfflineQueueOnce();
  }

  // Autosuggest
  setupAutosuggest('start-address');
  setupAutosuggest('destination-address');

  // Form behavior
  wireTripType();
  wireTimeNoPreference();
  wireSummaryLiveUpdates();

  // Ensure submit handler also catches Enter key
  const form = $('#request-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      validateForm(e);
    });
  }
});

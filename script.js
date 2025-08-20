// ===============================
// Routable — script.js (full)
// ===============================

// --- Supabase ---
const SUPABASE_URL = 'https://zszjyfswpplbhjxievhz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpzemp5ZnN3cHBsYmhqeGlldmh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4NTU5ODgsImV4cCI6MjA2MDQzMTk4OH0.5oh10-d4zwemTGZCEwfEeXs5C0gqjZid5HF6sDng7j0';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Mapbox ---
const MAPBOX_TOKEN = 'pk.eyJ1IjoiYW5ha2FseXBzZSIsImEiOiJjbTlrdGEzdXYwdGY0MmxwbjEzN2dzMm0zIn0.BvsUMTwPUGngjhTb9fkazA';

// --- Free tier settings ---
const MAX_FREE_TRIPS = 3;

// -------------- Utilities --------------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function setDisabled(el, disabled) {
  if (!el) return;
  el.disabled = disabled;
  el.setAttribute('aria-disabled', String(disabled));
  if (disabled) {
    el.value = '';
  }
}

// -------------- Upgrade Modal --------------
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

  // focus trap
  const focusables = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  function trap(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  function onKey(e) {
    if (e.key === 'Escape') hide();
    else trap(e);
  }

  function hide() {
    modal.style.display = 'none';
    modal.setAttribute('hidden', 'true');
    document.removeEventListener('keydown', onKey);
  }

  closeBtn.onclick = hide;
  subscribe2.onclick = () => { window.location.href = '/subscriptions?plan=2'; };
  subscribe5.onclick = () => { window.location.href = '/subscriptions?plan=5'; };
  modal.onclick = (e) => { if (e.target === modal) hide(); };

  document.addEventListener('keydown', onKey);
  (first || closeBtn).focus();
}

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
    showUpgradeModal("You've reached your

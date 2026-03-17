/**
 * Universal Form Persistence - Multi-page/sessionStorage
 * Supports checkboxes, radios, selects across pages
 * Auto-generates page keys, validates restores, tiny footprint
 */

// Config: Change per page/app section
const PERSIST_CONFIG = {
  storageKey: 'formStates',  // Base key
  pageId: window.location.pathname.replace(/\//g, '_') || 'home',  // Auto-page ID
  debug: false  // Set true to console.log saves/restores
};

// Get elements
const checkboxes = document.querySelectorAll('input[type="checkbox"]');
const radios = document.querySelectorAll('input[type="radio"]');
const selects = document.querySelectorAll('select');

// Full key for this page
const fullKey = `${PERSIST_CONFIG.storageKey}_${PERSIST_CONFIG.pageId}`;

// Save handler
function saveFormState() {
  if (typeof(Storage) === 'undefined') return;
  
  const state = { checkboxes: {}, radios: {}, selects: {} };
  
  // Checkboxes by ID
  checkboxes.forEach(cb => {
    if (cb.id) state.checkboxes[cb.id] = cb.checked;
  });
  
  // Radios: selected value per name group
  const radioGroups = {};
  radios.forEach(r => {
    if (r.checked && r.name && r.id) {
      radioGroups[r.name] = r.value;
    }
  });
  Object.assign(state.radios, radioGroups);
  
  // Selects by ID (only if changed from default)
  selects.forEach(s => {
    if (s.id && s.value !== s.options[0]?.value) {
      state.selects[s.id] = s.value;
    }
  });
  
  sessionStorage.setItem(fullKey, JSON.stringify(state));
  
  if (PERSIST_CONFIG.debug) {
    console.log(`✅ Saved ${fullKey}:`, state);
  }
}

// Restore handler
function restoreFormState() {
  if (typeof(Storage) === 'undefined') return;
  
  const saved = sessionStorage.getItem(fullKey);
  if (!saved) return;
  
  const state = JSON.parse(saved);
  
  // Checkboxes
  checkboxes.forEach(cb => {
    if (cb.id && state.checkboxes[cb.id] !== undefined) {
      cb.checked = state.checkboxes[cb.id];
    }
  });
  
  // Radios
  radios.forEach(r => {
    if (r.name && state.radios[r.name] === r.value) {
      r.checked = true;
    }
  });
  
  // Selects - VALIDATED restore
  selects.forEach(s => {
    if (s.id && state.selects[s.id]) {
      const option = s.querySelector(`option[value="${state.selects[s.id]}"]`);
      if (option) {
        s.value = state.selects[s.id];
      } else if (PERSIST_CONFIG.debug) {
        console.warn(`⚠️ Invalid select value "${state.selects[s.id]}" for #${s.id}`);
      }
    }
  });
  
  if (PERSIST_CONFIG.debug) {
    console.log(`🔄 Restored ${fullKey}:`, state);
  }
}

// Auto-bind events
function initPersistence() {
  checkboxes.forEach(cb => cb.addEventListener('change', saveFormState));
  radios.forEach(r => r.addEventListener('change', saveFormState));
  selects.forEach(s => s.addEventListener('change', saveFormState));
  
  // Restore immediately
  restoreFormState();
}

// Init when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPersistence);
} else {
  initPersistence();
}

// Export for manual use (optional)
window.persistForm = { save: saveFormState, restore: restoreFormState };

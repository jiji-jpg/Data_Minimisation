// validation.js - Form validation and completion tracking
// Place in static/js/validation.js
// Uses sessionStorage (clears when browser tab closes)

document.addEventListener('DOMContentLoaded', function () {

  // Detect which form page we're on
  var isDA1 = document.getElementById('DataCollectionPurpose-1A') !== null;
  var isDA2 = document.getElementById('DataCollectionPurpose-1B') !== null;
  var isHA1 = document.getElementById('DataCollectionPurpose-2A') !== null;
  var isHA2 = document.getElementById('DataCollectionPurpose-2B') !== null;
  var isGA1 = document.getElementById('DataCollectionPurpose-3A') !== null;

  if (!isDA1 && !isDA2 && !isHA1 && !isHA2 && !isGA1) return;

  var formKey;
  if (isDA1) formKey = 'DA1_completed';
  else if (isDA2) formKey = 'DA2_completed';
  else if (isHA1) formKey = 'HA1_completed';
  else if (isHA2) formKey = 'HA2_completed';
  else if (isGA1) formKey = 'GA1_completed';

  // --- Helper Functions ---

  function getCheckboxGroupChecked(ids) {
    return ids.some(function (id) {
      var el = document.getElementById(id);
      return el && el.checked;
    });
  }

  function getSelectValue(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  function getRadioValue(name) {
    var radios = document.querySelectorAll('input[name="' + name + '"]');
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].checked) return radios[i].value;
    }
    return '';
  }

  function clearErrors() {
    var existing = document.querySelectorAll('.inline-validation-error');
    existing.forEach(function (el) { el.remove(); });
  }

  function showError(targetEl, message) {
    var err = document.createElement('div');
    err.className = 'inline-validation-error';
    err.style.cssText = 'color:#DC2626;font-size:13px;font-weight:500;margin-top:6px;margin-bottom:2px;';
    err.textContent = message;
    targetEl.insertAdjacentElement('afterend', err);
  }

  // --- Shared validation for toggles, retention, deletion ---

  function validateToggles() {
    var hasError = false;
    if (!getRadioValue('choice1')) { showError(document.getElementById('toggle1'), '* Please select an answer.'); hasError = true; }
    if (!getRadioValue('choice2')) { showError(document.getElementById('toggle2'), '* Please select an answer.'); hasError = true; }
    if (!getRadioValue('choice3')) { showError(document.getElementById('toggle3'), '* Please select an answer.'); hasError = true; }
    if (!getRadioValue('choice4')) { showError(document.getElementById('toggle4'), '* Please select an answer.'); hasError = true; }
    return hasError;
  }

  function validateRetention(suffix) {
    var hasError = false;
    if (!getSelectValue('Question1-' + suffix)) {
      showError(document.getElementById('Question1-' + suffix).closest('.custom-select'), '* Please select an answer.');
      hasError = true;
    }
    if (!getSelectValue('Question2-' + suffix)) {
      showError(document.getElementById('Question2-' + suffix).closest('.custom-select'), '* Please select an answer.');
      hasError = true;
    }
    if (!getSelectValue('Question3-' + suffix)) {
      showError(document.getElementById('Question3-' + suffix).closest('.custom-select'), '* Please select an answer.');
      hasError = true;
    }
    return hasError;
  }

  function validateDeletion(firstCheckboxId, allIds) {
    if (!getCheckboxGroupChecked(allIds)) {
      var grid = document.getElementById(firstCheckboxId).closest('.checkbox-grid');
      showError(grid, '* Please select at least one Deletion Mechanism.');
      return true;
    }
    return false;
  }

  function validatePurpose(selectId) {
    if (!getSelectValue(selectId)) {
      var sel = document.getElementById(selectId).closest('.custom-select');
      showError(sel, '* Please select a Data Collection Purpose.');
      return true;
    }
    return false;
  }

  // --- DA1 Validation ---

  function validateDA1() {
    var hasError = false;

    var personalCheckboxes = ['Name', 'Phone', 'DOB', 'Email', 'Gender', 'PostAddress', 'Address', 'Fax', 'Sign'];
    if (!getCheckboxGroupChecked(personalCheckboxes)) {
      showError(document.getElementById('Name').closest('.checkbox-grid'), '* Please select at least one Personal Detail.');
      hasError = true;
    }

    if (validatePurpose('DataCollectionPurpose-1A')) hasError = true;
    if (validateToggles()) hasError = true;
    if (validateRetention('1A')) hasError = true;

    var delIds = ['AutomaticallyDeleted-1A', 'SecurelyDestroyedP-1A', 'ManualDeletion-1A', 'UponPR-1A', 'DeIdentified-1A', 'Unsure-1A'];
    if (validateDeletion('AutomaticallyDeleted-1A', delIds)) hasError = true;

    return hasError;
  }

  // --- DA2 Validation ---

  function validateDA2() {
    var hasError = false;

    var dataCheckboxes = ['Medicare', 'IndigenousStatus', 'ABN', 'DOD', 'ACN', 'CulturalIdentity', 'VFN', 'Racial'];
    if (!getCheckboxGroupChecked(dataCheckboxes)) {
      showError(document.getElementById('Medicare').closest('.checkbox-grid'), '* Please select at least one Government-issued Identifier or Sensitive Information item.');
      hasError = true;
    }

    if (validatePurpose('DataCollectionPurpose-1B')) hasError = true;
    if (validateToggles()) hasError = true;
    if (validateRetention('1B')) hasError = true;

    var delIds = ['AutomaticallyDeleted-1B', 'SecurelyDestroyed-1B', 'ManualDeletion-1B', 'UponPR-1B', 'DeIdentified-1B', 'Unsure-1B'];
    if (validateDeletion('AutomaticallyDeleted-1B', delIds)) hasError = true;

    return hasError;
  }

  // --- HA1 Validation ---

  function validateHA1() {
    var hasError = false;

    var clinicalCheckboxes = ['Allergies', 'PathologyReoprts', 'Diagnostic', 'Discharge', 'SpecialistLetter', 'HealthSummary', 'EventSummary', 'e-Referrals', 'Goals'];
    if (!getCheckboxGroupChecked(clinicalCheckboxes)) {
      var target = document.getElementById('Allergies').closest('.form-section');
      showError(target, '* Please select at least one Clinical Document item.');
      hasError = true;
    }

    if (validatePurpose('DataCollectionPurpose-2A')) hasError = true;
    if (validateToggles()) hasError = true;
    if (validateRetention('2A')) hasError = true;

    var delIds = ['AutomaticallyDeleted-2A', 'SecurelyDestroyed-2A', 'ManualDeletion-2A', 'UponPR-2A', 'DeIdentified-2A', 'Unsure-2A'];
    if (validateDeletion('AutomaticallyDeleted-2A', delIds)) hasError = true;

    return hasError;
  }

  // --- HA2 Validation ---

  function validateHA2() {
    var hasError = false;

    var healthCheckboxes = ['PharmacistShared', 'Prescription', 'Immunisations', 'Discharge', 'SpecialistLetter', 'HealthSummary', 'EventSummary', 'e-Referrals', 'Goals'];
    if (!getCheckboxGroupChecked(healthCheckboxes)) {
      var target = document.getElementById('PharmacistShared').closest('.form-section');
      showError(target, '* Please select at least one Medical Record / Immunisation Data item.');
      hasError = true;
    }

    if (validatePurpose('DataCollectionPurpose-2B')) hasError = true;
    if (validateToggles()) hasError = true;
    if (validateRetention('2B')) hasError = true;

    var delIds = ['AutomaticallyDeleted-2B', 'SecurelyDestroyed-2B', 'ManualDeletion-2B', 'UponPR-2B', 'DeIdentified-2B', 'Unsure-2B'];
    if (validateDeletion('AutomaticallyDeleted-2B', delIds)) hasError = true;

    return hasError;
  }

  // --- GA1 Validation ---

  function validateGA1() {
    var hasError = false;

    var govCheckboxes = ['CareFacility', 'MedicareBenefits', 'PharmaceuticalBenefits', 'VeteransAffairClaims', 'ImmunisationRegister', 'OrganDonorRegister', 'ProofOfVaccinationDoc'];
    if (!getCheckboxGroupChecked(govCheckboxes)) {
      var target = document.getElementById('CareFacility').closest('.form-section');
      showError(target, '* Please select at least one Government Data Asset item.');
      hasError = true;
    }

    if (validatePurpose('DataCollectionPurpose-3A')) hasError = true;
    if (validateToggles()) hasError = true;
    if (validateRetention('3A')) hasError = true;

    var delIds = ['AutomaticallyDeleted-3A', 'SecurelyDestroyed-3A', 'ManualDeletion-3A', 'UponPR-3A', 'DeIdentified-3A', 'Unsure-3A'];
    if (validateDeletion('AutomaticallyDeleted-3A', delIds)) hasError = true;

    return hasError;
  }

  // --- Attach to Continue Button ---

  var continueBtn = document.getElementById('continueBtn');
  if (!continueBtn) return;

  continueBtn.addEventListener('click', function (e) {
    clearErrors();

    var hasError = false;
    if (isDA1) hasError = validateDA1();
    else if (isDA2) hasError = validateDA2();
    else if (isHA1) hasError = validateHA1();
    else if (isHA2) hasError = validateHA2();
    else if (isGA1) hasError = validateGA1();

    if (hasError) {
      e.preventDefault();
      var firstError = document.querySelector('.inline-validation-error');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      sessionStorage.setItem(formKey, 'true');
    }
  });
});
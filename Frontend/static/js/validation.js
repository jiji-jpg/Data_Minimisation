/**
 * Form Validation - Ensures all required fields are completed
 * Uses inline error messages matching the original validation style
 */

// ---- VALIDATION METHOD ----
const FormValidator = {
  // Clear all existing errors
  clearErrors: function() {
    const existingErrors = document.querySelectorAll('.inline-validation-error');
    existingErrors.forEach(el => el.remove());
  },

  // Show inline error message
  showError: function(targetEl, message) {
    const err = document.createElement('div');
    err.className = 'inline-validation-error';
    err.style.cssText = 'color:#DC2626;font-size:13px;font-weight:500;margin-top:6px;margin-bottom:2px;';
    err.textContent = message;
    targetEl.insertAdjacentElement('afterend', err);
  },

  // Helper: check if an element or any of its parents is hidden
  isVisible: function(el) {
    if (!el) return false;
    let current = el;
    while (current && current !== document.body) {
      const style = getComputedStyle(current);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        current.hasAttribute('hidden')
      ) {
        return false;
      }
      current = current.parentElement;
    }
    return true;
  },

  // Check if at least one checkbox is selected in a grid (category selection)
  hasCategorySelection: function() {
    const categoryGrid = document.querySelector('.panel .checkbox-grid, .privacy-panel .checkbox-grid');
    if (!categoryGrid) return { valid: true };
    if (!this.isVisible(categoryGrid)) return { valid: true };

    const checkboxes = categoryGrid.querySelectorAll('input[type="checkbox"]');
    if (checkboxes.length === 0) return { valid: true };

    const hasSelection = Array.from(checkboxes).some(cb => cb.checked);

    return {
      valid: hasSelection,
      element: categoryGrid
    };
  },

  // Check if Data Collection Purpose has at least one checkbox selected
  hasDataCollectionPurpose: function() {
    const purposeCheckboxes = document.querySelectorAll(
      'input[id^="ClinicalCare"], ' +
      'input[id^="SystemManagement"], ' +
      'input[id^="LegalObligation"], ' +
      'input[id^="CourtOrder"], ' +
      'input[id^="SeriousThreat"], ' +
      'input[id^="InsuranceIndemnity"], ' +
      'input[id^="Marketing"], ' +
      'input[id^="Operational"], ' +
      'input[id^="HumanResource"], ' +
      'input[id^="GeneralInsurance"], ' +
      'input[id^="UnsurePurpose"]'
    );

    if (purposeCheckboxes.length === 0) return { valid: true };

    const grid = purposeCheckboxes[0]?.closest('.checkbox-grid');
    if (!this.isVisible(grid)) return { valid: true };

    const visibleCheckboxes = Array.from(purposeCheckboxes).filter(cb => this.isVisible(cb));
    if (visibleCheckboxes.length === 0) return { valid: true };

    const hasSelection = visibleCheckboxes.some(cb => cb.checked);

    return {
      valid: hasSelection,
      element: grid
    };
  },

  // Check if all select dropdowns have a value (Retention Period questions)
  hasAllSelectsCompleted: function() {
    const selects = document.querySelectorAll('select');
    const errors = [];

    selects.forEach(select => {
      if (!this.isVisible(select)) return; // Walks up DOM tree to check parents too
      if (select.value === '') {
        errors.push({
          element: select.closest('.custom-select'),
          message: '* Please select an answer.'
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors
    };
  },

  // Check if all toggle groups have a selection
  hasAllTogglesCompleted: function() {
    const toggleGroups = [
      { name: 'choice1', id: 'toggle1' },
      { name: 'choice2', id: 'toggle2' },
      { name: 'choice3', id: 'toggle3' },
      { name: 'choice4', id: 'toggle4' }
    ];

    const errors = [];

    toggleGroups.forEach(group => {
      const radios = document.querySelectorAll(`input[name="${group.name}"]`);
      if (radios.length === 0) return;

      const toggleElement = document.getElementById(group.id);
      if (!this.isVisible(toggleElement)) return; // Walks up DOM tree to check parents too

      const hasSelection = Array.from(radios).some(radio => radio.checked);
      if (!hasSelection) {
        if (toggleElement) {
          errors.push({
            element: toggleElement,
            message: '* Please select an answer.'
          });
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors
    };
  },

  // Check if deletion mechanism/enforcement measure has at least one checkbox selected
  hasDeletionMechanismSelection: function() {
    const deletionCheckboxes = document.querySelectorAll(
      'input[id^="AutomaticallyDeleted"], ' +
      'input[id^="SecurelyDestroyed"], ' +
      'input[id^="ManualDeletion"], ' +
      'input[id^="UponPR"], ' +
      'input[id^="DeIdentified"], ' +
      'input[id*="Unsure"][type="checkbox"]:not([id^="UnsurePurpose"])'
    );

    if (deletionCheckboxes.length === 0) return { valid: true };

    const grid = deletionCheckboxes[0]?.closest('.checkbox-grid');
    if (!this.isVisible(grid)) return { valid: true };

    const visibleCheckboxes = Array.from(deletionCheckboxes).filter(cb => this.isVisible(cb));
    if (visibleCheckboxes.length === 0) return { valid: true };

    const hasSelection = visibleCheckboxes.some(cb => cb.checked);

    return {
      valid: hasSelection,
      element: grid
    };
  },

  // ---- VALIDATION FOR ENTIRE FORM STARTS HERE ---- 
  validateForm: function() {
    this.clearErrors();

    // If SKIP is selected, bypass all validation
    var skipCheckbox = document.getElementById('skipSection');
    if (skipCheckbox && skipCheckbox.checked) {
      return true;
    }

    let hasError = false;

    // Check category checkboxes (first checkbox grid in panel)
    const categoryCheck = this.hasCategorySelection();
    if (!categoryCheck.valid) {
      this.showError(categoryCheck.element, '* Please select at least one data category.');
      hasError = true;
    }

    // Check Data Collection Purpose checkboxes
    const purposeCheck = this.hasDataCollectionPurpose();
    if (!purposeCheck.valid) {
      this.showError(purposeCheck.element, '* Please select at least one Data Collection Purpose.');
      hasError = true;
    }

    // Check all toggle questions (Level of Data Details)
    const toggleCheck = this.hasAllTogglesCompleted();
    if (!toggleCheck.valid) {
      toggleCheck.errors.forEach(error => {
        this.showError(error.element, error.message);
      });
      hasError = true;
    }

    // Check all select dropdowns (Retention Period questions)
    const selectCheck = this.hasAllSelectsCompleted();
    if (!selectCheck.valid) {
      selectCheck.errors.forEach(error => {
        this.showError(error.element, error.message);
      });
      hasError = true;
    }

    // Check deletion mechanism/enforcement measure
    const deletionCheck = this.hasDeletionMechanismSelection();
    if (!deletionCheck.valid) {
      this.showError(deletionCheck.element, '* Please select at least one Deletion Mechanism.');
      hasError = true;
    }

    return !hasError;
  },

  // Scroll to first error
  scrollToFirstError: function() {
    const firstError = document.querySelector('.inline-validation-error');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
};

// --- Detect which form page we are on and assign a sessionStorage key ---
function getFormKey() {
  if (document.getElementById('ClinicalCare-1A') || document.getElementById('DataCollectionPurpose-1A')) return 'DA1_completed';
  if (document.getElementById('ClinicalCare-1B') || document.getElementById('DataCollectionPurpose-1B')) return 'DA2_completed';
  if (document.getElementById('ClinicalCare-2A') || document.getElementById('DataCollectionPurpose-2A')) return 'HA1_completed';
  if (document.getElementById('ClinicalCare-2B') || document.getElementById('DataCollectionPurpose-2B')) return 'HA2_completed';
  if (document.getElementById('ClinicalCare-3A') || document.getElementById('DataCollectionPurpose-3A')) return 'GA1_completed';
  if (document.getElementById('ClinicalCare-4A') || document.getElementById('DataCollectionPurpose-4A')) return 'CA1_completed';
  if (document.getElementById('ClinicalCare-4B') || document.getElementById('DataCollectionPurpose-4B')) return 'CA2_completed';
  if (document.getElementById('ClinicalCare-5A') || document.getElementById('DataCollectionPurpose-5A')) return 'CH1_completed';
  return null;
}

// Initialize validation on page load
document.addEventListener('DOMContentLoaded', function() {
  var formKey = getFormKey();

  var continueButton = document.getElementById('continueBtn');

  if (continueButton && formKey) {
    continueButton.addEventListener('click', function(e) {
      var isValid = FormValidator.validateForm();

      if (!isValid) {
        e.preventDefault();
        FormValidator.scrollToFirstError();
        return false;
      } else {
        sessionStorage.setItem(formKey, 'true');
      }
    });
  }

  // Remove errors when user makes changes
  var formInputs = document.querySelectorAll('input, select');
  formInputs.forEach(function(input) {
    input.addEventListener('change', function() {
      FormValidator.clearErrors();
    });
  });
});

// Export for global use
window.FormValidator = FormValidator;
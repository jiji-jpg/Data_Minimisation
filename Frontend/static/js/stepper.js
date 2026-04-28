// stepper.js - Checks form completion status and updates stepper icons
// Uses sessionStorage (clears when browser tab closes)

document.addEventListener('DOMContentLoaded', function () {

  var steps = document.querySelectorAll('.stepper-step');
  if (steps.length === 0) return;

  var checkmarkSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>';

  function isDone(key) {
    var val = sessionStorage.getItem(key);
    return val === 'completed' || val === 'skipped' || val === 'true';
  }

  function isSkipped(key) {
    return sessionStorage.getItem(key) === 'skipped';
  }

  function updateStep(stepEl, isComplete) {
    if (!stepEl) return;
    var circle = stepEl.querySelector('.stepper-circle');
    if (isComplete) {
      stepEl.classList.remove('pending');
      stepEl.classList.add('completed');
      if (circle) circle.innerHTML = checkmarkSVG;
    } else {
      stepEl.classList.remove('completed');
      stepEl.classList.add('pending');
      if (circle) circle.innerHTML = '';
    }
  }

  var step1Done = isDone('DA1_completed') && isDone('DA2_completed');
  updateStep(steps[0], step1Done);

  var step2Done = isDone('HA1_completed') && isDone('HA2_completed');
  updateStep(steps[1], step2Done);

  var step3Done = isDone('GA1_completed');
  updateStep(steps[2], step3Done);

  var step4Done = isDone('CA1_completed');
  updateStep(steps[3], step4Done);

  var step5Done = isDone('CH1_completed');
  updateStep(steps[4], step5Done);

  // Step 6: Report
  var allDone = step1Done && step2Done && step3Done && step4Done && step5Done;

  var allFormKeys = [
    'DA1_completed', 'DA2_completed',
    'HA1_completed', 'HA2_completed',
    'GA1_completed',
    'CA1_completed',
    'CH1_completed'
  ];
  var allSkipped = allDone && allFormKeys.every(function(key) { return isSkipped(key); });
  var reportReady = allDone && !allSkipped;

  var generateBtn = steps[5] ? steps[5].querySelector('.btn-small') : null;

  if (reportReady) {
    // Normal — enable green report
    updateStep(steps[5], true);
    if (generateBtn) {
      generateBtn.classList.remove('btn-disabled', 'btn-skipped-report');
      generateBtn.classList.add('btn-ready');
    }

  } else if (allSkipped) {
    // All skipped — turn button red and point to different page
    updateStep(steps[5], false);
    if (generateBtn) {
      generateBtn.classList.remove('btn-disabled', 'btn-ready');
      generateBtn.classList.add('btn-skipped-report');
      generateBtn.href = '/invalid';
    }

  } else {
    // Not all done — disable
    updateStep(steps[5], false);
    if (generateBtn) {
      generateBtn.classList.remove('btn-ready', 'btn-skipped-report');
      generateBtn.classList.add('btn-disabled');
      generateBtn.addEventListener('click', function(e) {
        if (!generateBtn.classList.contains('btn-ready') && !generateBtn.classList.contains('btn-skipped-report')) {
          e.preventDefault();
        }
      });
    }
  }
});
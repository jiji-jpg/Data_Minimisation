// stepper.js - Checks form completion status and updates stepper icons
// Uses sessionStorage (clears when browser tab closes)

document.addEventListener('DOMContentLoaded', function () {

  var steps = document.querySelectorAll('.stepper-step');
  if (steps.length === 0) return;

  var checkmarkSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>';

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

  // Step 1: Personal Data Asset — requires DA1 and DA2
var da1Done = sessionStorage.getItem('DA1_completed') === 'true';
var da2Done = sessionStorage.getItem('DA2_completed') === 'true';
var step1Done = da1Done && da2Done;
updateStep(steps[0], step1Done);

// Step 2: Health Data Asset — requires HA1 and HA2
var ha1Done = sessionStorage.getItem('HA1_completed') === 'true';
var ha2Done = sessionStorage.getItem('HA2_completed') === 'true';
var step2Done = ha1Done && ha2Done;
updateStep(steps[1], step2Done);

// Step 3: Government Data Asset — requires GA1
var ga1Done = sessionStorage.getItem('GA1_completed') === 'true';
var step3Done = ga1Done;
updateStep(steps[2], step3Done);

// Step 4: Consumer-Contributed Health Data Assets
var ca1Done = sessionStorage.getItem('CA1_completed') === 'true';
var ca2Done = sessionStorage.getItem('CA2_completed');
var step4Done;
if (ca2Done !== null) {
  step4Done = ca1Done && ca2Done === 'true';
} else {
  step4Done = ca1Done;
}
updateStep(steps[3], step4Done);

// Step 5: Child Health Data Assets — requires CH1
var ch1Done = sessionStorage.getItem('CH1_completed') === 'true';
var step5Done = ch1Done;
updateStep(steps[4], step5Done);

// Step 6: Report — all previous steps must be completed
var allDone = step1Done && step2Done && step3Done && step4Done && step5Done;
updateStep(steps[5], allDone);
 
  // Enable/disable the Generate button
  var generateBtn = steps[5] ? steps[5].querySelector('.btn-small') : null;
  if (generateBtn) {
    if (allDone) {
      generateBtn.classList.remove('btn-disabled');
      generateBtn.classList.add('btn-ready');
    } else {
      generateBtn.classList.add('btn-disabled');
      generateBtn.classList.remove('btn-ready');
      generateBtn.addEventListener('click', function(e) {
        if (!generateBtn.classList.contains('btn-ready')) {
          e.preventDefault();
        }
      });
    }
  }
});
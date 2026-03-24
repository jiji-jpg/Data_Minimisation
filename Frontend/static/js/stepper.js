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
  updateStep(steps[0], da1Done && da2Done);

  // Step 2: Health Data Asset — requires HA1 and HA2
  var ha1Done = sessionStorage.getItem('HA1_completed') === 'true';
  var ha2Done = sessionStorage.getItem('HA2_completed') === 'true';
  updateStep(steps[1], ha1Done && ha2Done);

  // Step 3: Government Data Asset — requires GA1
  var ga1Done = sessionStorage.getItem('GA1_completed') === 'true';
  updateStep(steps[2], ga1Done);

  // Step 4: Consumer-Contributed Health Data Assets — requires CA1 (and CA2 if applicable)
  var ca1Done = sessionStorage.getItem('CA1_completed') === 'true';
  var ca2Done = sessionStorage.getItem('CA2_completed');
  // If CA2 exists in storage, both must be done; otherwise just CA1
  if (ca2Done !== null) {
    updateStep(steps[3], ca1Done && ca2Done === 'true');
  } else {
    updateStep(steps[3], ca1Done);
  }

  // Step 5: Child Health Data Assets — requires CH1
  var ch1Done = sessionStorage.getItem('CH1_completed') === 'true';
  updateStep(steps[4], ch1Done);
});
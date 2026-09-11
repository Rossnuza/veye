(function () {
  var heroForm = document.getElementById('hero-form');
  var heroInput = document.getElementById('hero-email');
  var heroBtn = document.getElementById('hero-submit');
  var heroSuccess = document.getElementById('hero-success');

  var waitlistForm = document.getElementById('waitlist-form');
  var waitlistInput = document.getElementById('waitlist-email');
  var waitlistSuccess = document.getElementById('waitlist-success');

  if (heroForm) {
    heroForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = heroInput.value.trim();
      if (!email) return;
      heroBtn.textContent = "You're in";
      heroSuccess.hidden = false;
      if (waitlistInput) waitlistInput.value = email;
      if (waitlistSuccess) waitlistSuccess.hidden = false;
    });
  }

  if (waitlistForm) {
    waitlistForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = waitlistInput.value.trim();
      if (!email) return;
      waitlistSuccess.hidden = false;
    });
  }
})();

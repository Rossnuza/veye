(function () {
  var COPY = {
    parent: {
      headline: 'Be first to know when Veye arrives',
      sub: "Leave your email and we'll notify you the moment Veye is available at your child's school.",
      placeholder: 'you@email.com',
    },
    school: {
      headline: "Let's bring Veye to your students",
      sub: "Leave your email and we'll reach out about piloting Veye at your school.",
      placeholder: 'you@school.edu',
    },
  };

  var heroForm = document.getElementById('hero-form');
  var heroInput = document.getElementById('hero-email');
  var heroBtn = document.getElementById('hero-submit');
  var heroSuccess = document.getElementById('hero-success');

  var waitlistForm = document.getElementById('waitlist-form');
  var waitlistInput = document.getElementById('waitlist-email');
  var waitlistSuccess = document.getElementById('waitlist-success');
  var waitlistHeadline = document.getElementById('waitlist-headline');
  var waitlistSub = document.getElementById('waitlist-sub');
  var parentTab = document.getElementById('parent-tab');
  var schoolTab = document.getElementById('school-tab');

  function setMode(mode) {
    var copy = COPY[mode];
    waitlistHeadline.textContent = copy.headline;
    waitlistSub.textContent = copy.sub;
    waitlistInput.placeholder = copy.placeholder;
    parentTab.classList.toggle('is-active', mode === 'parent');
    schoolTab.classList.toggle('is-active', mode === 'school');
  }

  function goToWaitlist(mode) {
    setMode(mode);
    document.getElementById('waitlist').scrollIntoView({ behavior: 'smooth' });
  }

  parentTab.addEventListener('click', function () { setMode('parent'); });
  schoolTab.addEventListener('click', function () { setMode('school'); });

  document.querySelectorAll('[data-school-cta]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      goToWaitlist('school');
    });
  });

  heroForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = heroInput.value.trim();
    if (!email) return;
    heroBtn.textContent = "You're in";
    heroSuccess.hidden = false;
    waitlistInput.value = email;
    waitlistSuccess.hidden = false;
  });

  waitlistForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = waitlistInput.value.trim();
    if (!email) return;
    waitlistSuccess.hidden = false;
  });
})();

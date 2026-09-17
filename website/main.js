/* veye landing page behaviour.
   Mirrors the interaction logic of the approved design ("veye Landing Page.dc.html"):
   scroll reveal, a single-open FAQ accordion, and the two waitlist forms. */

(function () {
  'use strict';

  /* Where waitlist signups are sent.
     Left empty deliberately: the page confirms client-side, exactly as the
     design does, and nothing is stored yet. Point this at a collector (the
     veye API, a form service, whatever you pick) and submissions are POSTed
     as JSON {"email": "..."} before the confirmation shows. */
  var WAITLIST_ENDPOINT = '';

  var doc = document;

  /* ---------- scroll reveal ---------- */

  function initReveal() {
    doc.body.classList.add('veye-js');

    var targets = Array.prototype.slice.call(doc.querySelectorAll('[data-reveal]'));
    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.06 });

    targets.forEach(function (el) {
      // Anything already on screen at load reveals immediately.
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-in');
      else io.observe(el);
    });
  }

  /* ---------- FAQ accordion ---------- */

  function initFaq() {
    var buttons = Array.prototype.slice.call(doc.querySelectorAll('.faq-q'));
    if (!buttons.length) return;

    function setOpen(button, open) {
      var panel = doc.getElementById(button.getAttribute('aria-controls'));
      var sign = button.querySelector('.faq-sign');
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (panel) panel.hidden = !open;
      if (sign) sign.textContent = open ? '–' : '+';
    }

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        var wasOpen = button.getAttribute('aria-expanded') === 'true';
        // Single-open: close everything, then reopen unless this one was open.
        buttons.forEach(function (other) { setOpen(other, false); });
        if (!wasOpen) setOpen(button, true);
      });
    });
  }

  /* ---------- waitlist forms ---------- */

  function initForm(formId, noteId, doneText) {
    var form = doc.getElementById(formId);
    var note = doc.getElementById(noteId);
    if (!form || !note) return;

    var input = form.querySelector('input[type="email"]');
    var button = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!input || !input.checkValidity()) {
        if (input) input.reportValidity();
        return;
      }

      function showConfirmation() {
        note.textContent = doneText;
        note.classList.add('is-done');
        form.reset();
      }

      if (!WAITLIST_ENDPOINT) {
        showConfirmation();
        return;
      }

      if (button) button.disabled = true;
      fetch(WAITLIST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: input.value })
      }).then(function (response) {
        if (!response.ok) throw new Error('Signup failed: ' + response.status);
        showConfirmation();
      }).catch(function () {
        note.textContent = "That didn't go through. Please try again, or email hello@veye.app.";
        note.classList.remove('is-done');
      }).then(function () {
        if (button) button.disabled = false;
      });
    });
  }

  /* ---------- artwork fallback ---------- */

  /* The product screenshots are not committed (see screens/README.md).
     If one is missing, keep the layout intact instead of showing a broken icon. */
  function initShots() {
    Array.prototype.slice.call(doc.querySelectorAll('img.shot')).forEach(function (img) {
      img.addEventListener('error', function () { img.classList.add('is-missing'); });
      if (img.complete && img.naturalWidth === 0) img.classList.add('is-missing');
    });
  }

  function init() {
    initShots();
    initReveal();
    initFaq();
    initForm('hero-form', 'hero-note', "You're on the list. We'll email you the moment veye launches.");
    initForm('foot-form', 'foot-note', "Thanks, you're on the list. We'll be in touch soon.");
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();

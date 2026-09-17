/* veye landing page behaviour.
   Mirrors the interaction logic of the approved design ("veye Landing Page.dc.html"):
   scroll reveal and a single-open FAQ accordion, plus the Brevo waitlist
   submissions. */

(function () {
  'use strict';

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

  /* Both forms POST to Brevo. Brevo's endpoint sends no CORS headers, so the
     request goes out with mode:"no-cors" and the reply is opaque — we can tell
     that the request left the browser, never what Brevo said about it. Success
     is therefore optimistic: a server-side rejection still reads as sent. Only
     a network-level failure (offline, DNS, connection refused) rejects.

     The browser has already enforced required/type="email" by the time a
     submit event fires, so there is no validation to repeat here. */
  function initSignupForms() {
    Array.prototype.slice.call(doc.querySelectorAll('form.signup')).forEach(function (form) {
      var button = form.querySelector('button[type="submit"]');
      var ok = form.querySelector('.signup-status--ok');
      var error = form.querySelector('.signup-status--error');
      var busy = false;

      form.addEventListener('submit', function (event) {
        event.preventDefault();   // never navigate away to Brevo's raw JSON
        if (busy) return;
        busy = true;

        if (error) error.hidden = true;

        // Read the fields before anything is disabled, and encode exactly as a
        // native form POST would — urlencoded, which no-cors also permits.
        var body = new URLSearchParams(new FormData(form));

        var label = button ? button.textContent : '';
        if (button) {
          button.disabled = true;
          button.textContent = button.getAttribute('data-busy') || 'Sending…';
        }
        form.setAttribute('aria-busy', 'true');

        fetch(form.action, { method: 'POST', mode: 'no-cors', body: body })
          .then(function () {
            // Pin the height the form occupies right now, so swapping the
            // controls out for the message moves nothing below it.
            form.style.minHeight = form.getBoundingClientRect().height + 'px';
            form.classList.add('is-sent');
            if (ok) ok.hidden = false;
          })
          .catch(function () {
            // Leave what they typed alone so a retry costs nothing.
            if (error) error.hidden = false;
            if (button) {
              button.disabled = false;
              button.textContent = label;
            }
            busy = false;
          })
          .then(function () {
            form.removeAttribute('aria-busy');
          });
      });
    });
  }

  /* ---------- artwork fallback ---------- */

  /* If a file in screens/ ever goes missing, keep the layout intact instead of
     showing a broken icon. */
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
    initSignupForms();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();

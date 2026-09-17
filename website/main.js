/* veye landing page behaviour.
   Mirrors the interaction logic of the approved design ("veye Landing Page.dc.html"):
   scroll reveal and a single-open FAQ accordion. */

(function () {
  'use strict';

  /* The two waitlist forms POST straight to Brevo (see the action attributes
     in index.html), so there is no submit handler here — Brevo's end-form
     script, loaded at the bottom of the page, takes them from there. */

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
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();

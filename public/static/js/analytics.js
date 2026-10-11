/**
 * Google Analytics 4 with cookie consent.
 * GA is NOT loaded until the visitor clicks "Accept". The choice is remembered
 * in localStorage; "Cookie settings" in the footer lets them change it.
 * The Measurement ID comes from the GA_MEASUREMENT_ID environment variable
 * (rendered into this script tag's data-ga-id by base.html).
 */
(function () {
  'use strict';

  var script = document.currentScript;
  var GA_ID = script && script.getAttribute('data-ga-id');
  if (!GA_ID) return;

  var KEY = 'swapclub_cookie_consent'; // 'granted' | 'denied'
  var banner = document.getElementById('cookieBanner');

  function getChoice() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function setChoice(v) {
    try { localStorage.setItem(KEY, v); } catch (e) { /* private mode: ignore */ }
  }

  function loadAnalytics() {
    if (window.__gaLoaded) return;
    window.__gaLoaded = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
  }

  function showBanner() { if (banner) banner.hidden = false; }
  function hideBanner() { if (banner) banner.hidden = true; }

  function clearGaCookies() {
    // Remove GA cookies when consent is withdrawn.
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (name === '_ga' || name.indexOf('_ga_') === 0) {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.' + location.hostname;
      }
    });
  }

  var choice = getChoice();
  if (choice === 'granted') loadAnalytics();
  else if (choice !== 'denied') showBanner();

  var accept = document.getElementById('cookieAccept');
  var decline = document.getElementById('cookieDecline');
  var settings = document.getElementById('cookieSettings');

  if (accept) accept.addEventListener('click', function () {
    setChoice('granted'); hideBanner(); loadAnalytics();
  });
  if (decline) decline.addEventListener('click', function () {
    setChoice('denied'); hideBanner(); clearGaCookies();
  });
  if (settings) settings.addEventListener('click', showBanner);
})();

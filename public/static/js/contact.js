/**
 * Contact Form Validation & Analytics Tracking
 * (Spam protection is a hidden honeypot field checked on the server.)
 * The Swap Club
 */

(function() {
  'use strict';

  const form = document.getElementById('contactForm');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const topicSelect = document.getElementById('topic');
  const messageTextarea = document.getElementById('message');
  const charCounter = document.getElementById('charCount');
  const submitBtn = document.getElementById('submitBtn');

  // State
  let hasInteracted = false;

  // Email regex (matches the backend validation)
  const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  // ─── TRACKING FUNCTIONS ───
  function trackGAEvent(action, label) {
    if (window.gtag) {
      gtag('event', action, {
        'event_category': 'contact_form',
        'event_label': label,
        'non_interaction': false
      });
    }
  }

  // ─── VALIDATION FUNCTIONS ───
  function validateName() {
    const isValid = nameInput.value.trim().length >= 2;
    updateFieldValidation(nameInput, isValid);
    return isValid;
  }

  function validateEmail() {
    const isValid = EMAIL_REGEX.test(emailInput.value.trim());
    updateFieldValidation(emailInput, isValid);
    return isValid;
  }

  function validateTopic() {
    const isValid = topicSelect.value !== '';
    updateFieldValidation(topicSelect, isValid);
    return isValid;
  }

  function validateMessage() {
    const isValid = messageTextarea.value.trim().length >= 10;
    updateFieldValidation(messageTextarea, isValid);
    return isValid;
  }

  function updateFieldValidation(input, isValid) {
    const parent = input.closest('.form-field');
    const icon = parent?.querySelector('.field-validation-icon');

    input.classList.remove('valid', 'invalid');
    
    if (input.value.trim()) {
      input.classList.add(isValid ? 'valid' : 'invalid');
    }

    if (icon && input.matches(':focus')) {
      icon.style.opacity = '1';
    }
  }

  function checkFormValidity() {
    const nameValid = validateName();
    const emailValid = validateEmail();
    const topicValid = validateTopic();
    const messageValid = validateMessage();

    // Button only enabled when all fields are valid
    submitBtn.disabled = !(nameValid && emailValid && topicValid && messageValid);
  }

  // ─── EVENT LISTENERS ───
  document.addEventListener('DOMContentLoaded', function() {
    // Character counter
    if (messageTextarea && charCounter) {
      messageTextarea.addEventListener('input', function() {
        const count = messageTextarea.value.length;
        charCounter.textContent = count;
        
        if (count > 1800) {
          charCounter.parentElement.classList.add('warning');
        } else {
          charCounter.parentElement.classList.remove('warning');
        }

        // Track progress milestone
        if (count === 10 && !hasInteracted) {
          hasInteracted = true;
          trackGAEvent('form_started', 'first_typing');
        }
      });
    }

    // Real-time validation on blur
    if (nameInput) {
      nameInput.addEventListener('blur', function() {
        if (validateName() && !hasInteracted) {
          hasInteracted = true;
          trackGAEvent('form_started', 'name_input');
        }
      });
    }

    if (emailInput) {
      emailInput.addEventListener('blur', function() {
        if (validateEmail() && !hasInteracted) {
          hasInteracted = true;
          trackGAEvent('form_started', 'email_input');
        }
      });
    }

    if (messageTextarea) {
      messageTextarea.addEventListener('blur', function() {
        validateMessage();
        checkFormValidity();
      });
    }

    if (topicSelect) {
      topicSelect.addEventListener('change', function() {
        validateTopic();
        checkFormValidity();
        trackGAEvent('topic_selected', this.value);
      });
    }

    // Form submission
    if (form) {
      form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Final validation
        const nameValid = validateName();
        const emailValid = validateEmail();
        const topicValid = validateTopic();
        const messageValid = validateMessage();

        if (!(nameValid && emailValid && topicValid && messageValid)) {
          trackGAEvent('form_submit_failed', 'validation_error');
          return;
        }

        // Disable button and show loading
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        trackGAEvent('form_submit_started', 'pending');

        // Submit form normally (Flask handles POST)
        // The button disabled state prevents double-submission
        this.submit();
      });
    }

    // Keep the submit button state in sync while typing
    [nameInput, emailInput, messageTextarea].forEach(function (el) {
      if (el) el.addEventListener('input', checkFormValidity);
    });
    checkFormValidity();

    // Focus first input
    if (nameInput) {
      nameInput.focus();
    }
  });

})();
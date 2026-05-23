/**
 * ProteinPrice — alerts.js
 * Price alerts form logic: submit, validate, and success/error states.
 * Uses Supabase JS v2 via ESM CDN.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '/js/config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Helpers ────────────────────────────────────────────────

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.classList.add('ps-input--error');

  let err = field.parentElement.querySelector('.ps-form-error');
  if (!err) {
    err = document.createElement('span');
    err.className = 'ps-form-error';
    err.setAttribute('role', 'alert');
    field.parentElement.appendChild(err);
  }
  err.textContent = message;
}

function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.classList.remove('ps-input--error');
  const err = field.parentElement?.querySelector('.ps-form-error');
  if (err) err.remove();
}

function showBanner(container, type, html) {
  let banner = container.querySelector('.ps-alert-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.setAttribute('role', 'status');
    container.prepend(banner);
  }
  banner.className = `ps-alert-banner ps-alert-banner--${type}`;
  banner.innerHTML = html;
  banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function removeBanner(container) {
  container.querySelector('.ps-alert-banner')?.remove();
}

// ── Alert Form Submit ──────────────────────────────────────

async function handleAlertSubmit(e) {
  e.preventDefault();
  const form      = e.target;
  const card      = form.closest('.ps-alert-card') || form.parentElement;
  const submitBtn = form.querySelector('[data-ps-submit]');

  clearFieldError('alert-email');
  removeBanner(card);

  const email       = document.getElementById('alert-email')?.value.trim() || '';
  const productRef  = document.getElementById('alert-product')?.value.trim() || '';

  // Validate
  let valid = true;
  if (!email) {
    showFieldError('alert-email', 'Please enter your email address.');
    valid = false;
  } else if (!isValidEmail(email)) {
    showFieldError('alert-email', 'Please enter a valid email address.');
    valid = false;
  }

  if (!valid) return;

  // Disable button
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
  }

  try {
    // Find product_id by name if provided
    let productId = null;
    if (productRef) {
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .ilike('name', `%${productRef}%`)
        .limit(1)
        .single();
      if (products?.id) productId = products.id;
    }

    // Insert alert
    const { error } = await supabase.from('alerts').insert([
      {
        email:      email.toLowerCase(),
        product_id: productId,
        active:     true,
      }
    ]);

    if (error) throw error;

    // Success
    form.reset();
    showBanner(card, 'success',
      `<strong>You're on the list.</strong> We'll notify you at <strong>${escHtml(email)}</strong> when live prices launch.`
    );

    // Track event (safe no-op if analytics not present)
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'alert_set', { event_category: 'alerts' });
    }

  } catch (err) {
    console.error('Alert submission failed:', err);
    showBanner(card, 'warn',
      '<strong>Something went wrong.</strong> Please try again in a moment.'
    );
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Set Alert';
    }
  }
}

// ── Alert Lookup by Email ──────────────────────────────────

async function handleAlertLookup(e) {
  e.preventDefault();
  const form    = e.target;
  const results = document.getElementById('ps-alert-results');
  if (!results) return;

  const email = form.querySelector('#lookup-email')?.value.trim() || '';

  if (!email || !isValidEmail(email)) {
    results.innerHTML = `<p class="ps-text-soft ps-fs-sm">Please enter a valid email address.</p>`;
    return;
  }

  results.innerHTML = `<p class="ps-text-mute ps-fs-sm">Looking up alerts&hellip;</p>`;

  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('id, email, product_id, active, created_at')
      .eq('email', email.toLowerCase())
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      results.innerHTML = `
        <div class="ps-alert-banner ps-alert-banner--info">
          No active alerts found for <strong>${escHtml(email)}</strong>.
        </div>`;
      return;
    }

    results.innerHTML = `
      <p class="ps-fs-sm ps-text-soft" style="margin-bottom:12px">
        Found <strong>${data.length}</strong> active alert${data.length === 1 ? '' : 's'} for <strong>${escHtml(email)}</strong>.
      </p>
      <ul style="display:flex;flex-direction:column;gap:8px">
        ${data.map(alert => `
          <li style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--ps-surface);border:1px solid var(--ps-border);border-radius:var(--ps-radius-md);font-size:var(--ps-fs-sm)">
            <span style="color:var(--ps-ink-soft)">${alert.product_id ? `Product ID: ${escHtml(alert.product_id)}` : 'All new prices'}</span>
            <button
              class="ps-btn ps-btn--ghost ps-btn--sm"
              data-cancel-alert="${escHtml(alert.id)}"
              data-alert-email="${escHtml(email)}"
            >Cancel</button>
          </li>
        `).join('')}
      </ul>`;

    // Bind cancel buttons
    results.querySelectorAll('[data-cancel-alert]').forEach(btn => {
      btn.addEventListener('click', () => cancelAlert(btn.dataset.cancelAlert, btn.dataset.alertEmail, results));
    });

  } catch (err) {
    console.error('Alert lookup failed:', err);
    results.innerHTML = `<p class="ps-text-soft ps-fs-sm">Unable to look up alerts. Please try again.</p>`;
  }
}

async function cancelAlert(alertId, email, resultsEl) {
  try {
    const { error } = await supabase
      .from('alerts')
      .update({ active: false })
      .eq('id', alertId);

    if (error) throw error;

    // Re-run lookup to refresh list
    const fakeEvent = { preventDefault: () => {}, target: document.getElementById('ps-alert-lookup-form') };
    if (fakeEvent.target) await handleAlertLookup(fakeEvent);
    else if (resultsEl) {
      resultsEl.innerHTML = `<div class="ps-alert-banner ps-alert-banner--success">Alert cancelled.</div>`;
    }
  } catch (err) {
    console.error('Cancel failed:', err);
  }
}

// ── Init ──────────────────────────────────────────────────

function init() {
  const alertForm = document.getElementById('ps-alert-form');
  if (alertForm) {
    alertForm.addEventListener('submit', handleAlertSubmit);
  }

  const lookupForm = document.getElementById('ps-alert-lookup-form');
  if (lookupForm) {
    lookupForm.addEventListener('submit', handleAlertLookup);
  }
}

document.addEventListener('DOMContentLoaded', init);

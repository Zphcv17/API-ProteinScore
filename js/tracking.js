/**
 * ProteinPrice — tracking.js
 * Logs affiliate link clicks to Supabase for analytics.
 * Import and call trackClick() before navigating to an affiliate URL.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '/js/config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Log an affiliate click to the clicks table, then navigate.
 * @param {string} url          - The affiliate URL to open
 * @param {string} [productId]  - Product ID (optional)
 * @param {string} [retailerId] - Retailer ID (optional)
 */
export async function trackClick(url, productId = null, retailerId = null) {
  // Fire-and-forget — don't block navigation on network errors
  supabase.from('clicks').insert([{
    product_id:  productId  || null,
    retailer_id: retailerId || null,
    url:         url,
    referrer:    document.referrer || null,
    user_agent:  navigator.userAgent || null,
  }]).then(({ error }) => {
    if (error) console.warn('Click tracking failed:', error.message);
  });

  // Navigate immediately — don't await the insert
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Auto-bind all .ps-affiliate-link elements on the page.
 * Reads data-product-id and data-retailer-id attributes.
 */
export function bindAffiliateLinks() {
  document.querySelectorAll('.ps-affiliate-link').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const url        = el.getAttribute('href') || el.dataset.href;
      const productId  = el.dataset.productId  || null;
      const retailerId = el.dataset.retailerId || null;
      if (url) trackClick(url, productId, retailerId);
    });
  });
}

document.addEventListener('DOMContentLoaded', bindAffiliateLinks);

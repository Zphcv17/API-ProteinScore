/**
 * ProteinPrice — app.js
 * Homepage + shared UI logic.
 * Supabase JS v2 via ESM CDN.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '/js/config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Helpers ────────────────────────────────────────────────

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function categoryHref(category) {
  const map = {
    'protein-powder': '/protein-powder/',
    'protein-bar':    '/protein-bars/',
    'protein-drink':  '/protein-drinks/',
  };
  return map[category] || '/search/';
}

function productHref(product) {
  return `/products/?id=${esc(product.id)}`;
}

function skeletonCard() {
  return `<div class="pp-deal-card pp-skeleton-card" aria-hidden="true">
    <div class="pp-skeleton-card-img"></div>
    <div class="pp-skeleton-card-body">
      <div class="pp-skeleton-line pp-skeleton-line-short pp-skeleton-line-sm"></div>
      <div class="pp-skeleton-line pp-skeleton-line-full pp-skeleton-line-lg"></div>
      <div class="pp-skeleton-line pp-skeleton-line-medium"></div>
      <div class="pp-skeleton-line pp-skeleton-line-short pp-skeleton-line-sm" style="margin-top:8px"></div>
    </div>
  </div>`;
}

function productCard(p) {
  const brand   = esc(p.brands?.name || '');
  const name    = esc(p.name || 'Untitled Product');
  const img     = esc(p.img || '');
  const variant = [p.size_lb ? `${p.size_lb} lb` : '', p.flavor || ''].filter(Boolean).join(' · ');
  const href    = productHref(p);

  const imgMarkup = img
    ? `<img src="${img}" alt="" loading="lazy" onerror="this.style.display='none'">`
    : `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#A8A29E" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>`;

  return `<a href="${href}" class="pp-deal-card" role="listitem">
    <div class="pp-deal-card-img">${imgMarkup}</div>
    <div class="pp-deal-card-body">
      ${brand ? `<div class="pp-deal-card-brand">${brand}</div>` : ''}
      <div class="pp-deal-card-name">${name}</div>
      ${variant ? `<div class="pp-deal-card-variant">${esc(variant)}</div>` : ''}
      <div class="pp-deal-card-foot"><span class="pp-badge-soon">Live soon</span></div>
    </div>
  </a>`;
}

function emptyState(heading, body) {
  return `<div class="pp-empty" style="grid-column:1/-1">
    <div class="pp-empty-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
    </div>
    <h3>${esc(heading)}</h3>
    <p>${esc(body)}</p>
    <a href="/search/" class="pp-btn pp-btn-primary">Browse all products</a>
  </div>`;
}

// ── Featured products (homepage) ──────────────────────────

async function loadFeaturedProducts() {
  const row = document.getElementById('featured-row');
  if (!row) return;

  row.innerHTML = Array(6).fill(skeletonCard()).join('');

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, brands(name)')
      .eq('is_active', true)
      .limit(12)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      row.innerHTML = `<div class="pp-empty" style="width:100%;padding:40px 20px;text-align:center;color:var(--ink-mute)">
        <p style="font-size:15px">Products loading soon. <a href="/alerts/" style="color:var(--green);font-weight:700">Set an alert to be first to know.</a></p>
      </div>`;
      return;
    }

    row.innerHTML = data.map(productCard).join('');
  } catch (err) {
    console.error('loadFeaturedProducts:', err);
    row.innerHTML = `<div class="pp-empty" style="width:100%;padding:40px 20px;text-align:center;color:var(--ink-mute)">
      <p style="font-size:15px">Products loading soon. <a href="/alerts/" style="color:var(--green);font-weight:700">Set an alert.</a></p>
    </div>`;
  }
}

// ── Search form wiring ─────────────────────────────────────

function wireSearchForms() {
  document.querySelectorAll('form[action="/search/"]').forEach(form => {
    form.addEventListener('submit', e => {
      const input = form.querySelector('input[name="q"]');
      const q = input?.value.trim();
      if (!q) {
        e.preventDefault();
        return;
      }
      // Allow default form GET submission
    });
  });
}

// ── Category page product grid ─────────────────────────────

async function loadCategoryProducts() {
  const grid = document.getElementById('category-grid');
  if (!grid) return;

  const category = grid.dataset.category; // e.g. "protein-powder"
  if (!category) return;

  const skeletons = Array(12).fill(0).map(() =>
    `<div class="pp-skeleton-card" aria-hidden="true">
      <div class="pp-skeleton-card-img"></div>
      <div class="pp-skeleton-card-body">
        <div class="pp-skeleton-line pp-skeleton-line-short pp-skeleton-line-sm"></div>
        <div class="pp-skeleton-line pp-skeleton-line-full pp-skeleton-line-lg"></div>
        <div class="pp-skeleton-line pp-skeleton-line-medium"></div>
      </div>
    </div>`
  ).join('');
  grid.innerHTML = skeletons;

  const activeFilter = document.querySelector('.pp-filter-pill.is-active');
  const subCategory  = activeFilter?.dataset.sub || null;

  let query = supabase
    .from('products')
    .select('*, brands(name)')
    .eq('is_active', true)
    .eq('category', category)
    .limit(48)
    .order('name');

  if (subCategory) query = query.eq('sub_category', subCategory);

  try {
    const { data, error } = await query;
    if (error) throw error;

    const count = document.getElementById('category-count');
    if (count && data) count.textContent = `${data.length} products`;

    if (!data || data.length === 0) {
      grid.innerHTML = emptyState('No products yet', 'Check back soon as we build out this category.');
      return;
    }

    // Render as deal cards in grid
    grid.innerHTML = data.map(p => {
      const brand   = esc(p.brands?.name || '');
      const name    = esc(p.name || 'Untitled');
      const img     = esc(p.img || '');
      const variant = [p.size_lb ? `${p.size_lb} lb` : '', p.flavor || ''].filter(Boolean).join(' · ');
      const href    = productHref(p);

      const imgMarkup = img
        ? `<img src="${img}" alt="" loading="lazy" onerror="this.style.display='none'">`
        : `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#A8A29E" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>`;

      return `<a href="${href}" class="pp-deal-card">
        <div class="pp-deal-card-img">${imgMarkup}</div>
        <div class="pp-deal-card-body">
          ${brand ? `<div class="pp-deal-card-brand">${brand}</div>` : ''}
          <div class="pp-deal-card-name">${name}</div>
          ${variant ? `<div class="pp-deal-card-variant">${esc(variant)}</div>` : ''}
          <div class="pp-deal-card-foot"><span class="pp-badge-soon">Live soon</span></div>
        </div>
      </a>`;
    }).join('');

  } catch (err) {
    console.error('loadCategoryProducts:', err);
    grid.innerHTML = emptyState('Something went wrong', 'Could not load products. Please refresh.');
  }
}

// ── Search page ────────────────────────────────────────────

async function loadSearchResults() {
  const grid = document.getElementById('search-grid');
  if (!grid) return;

  const params = new URLSearchParams(window.location.search);
  const q = params.get('q')?.trim() || '';

  const queryDisplay = document.getElementById('search-query-display');
  if (queryDisplay) queryDisplay.textContent = q ? `"${q}"` : 'All products';

  const skeletons = Array(8).fill(0).map(() =>
    `<div class="pp-skeleton-card" aria-hidden="true">
      <div class="pp-skeleton-card-img"></div>
      <div class="pp-skeleton-card-body">
        <div class="pp-skeleton-line pp-skeleton-line-short pp-skeleton-line-sm"></div>
        <div class="pp-skeleton-line pp-skeleton-line-full pp-skeleton-line-lg"></div>
        <div class="pp-skeleton-line pp-skeleton-line-medium"></div>
      </div>
    </div>`
  ).join('');
  grid.innerHTML = skeletons;

  try {
    let query = supabase
      .from('products')
      .select('*, brands(name)')
      .eq('is_active', true)
      .limit(48)
      .order('name');

    if (q) {
      // Full text search on name + brand
      query = query.ilike('name', `%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const count = document.getElementById('search-count');
    if (count) count.textContent = data ? `${data.length} result${data.length !== 1 ? 's' : ''}` : '';

    if (!data || data.length === 0) {
      grid.innerHTML = emptyState(
        q ? `No results for "${q}"` : 'No products yet',
        q ? 'Try a different search term.' : 'Check back soon.'
      );
      return;
    }

    grid.innerHTML = data.map(p => {
      const brand   = esc(p.brands?.name || '');
      const name    = esc(p.name || 'Untitled');
      const img     = esc(p.img || '');
      const variant = [p.size_lb ? `${p.size_lb} lb` : '', p.flavor || ''].filter(Boolean).join(' · ');
      const href    = productHref(p);

      const imgMarkup = img
        ? `<img src="${img}" alt="" loading="lazy" onerror="this.style.display='none'">`
        : `<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#A8A29E" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>`;

      return `<a href="${href}" class="pp-deal-card">
        <div class="pp-deal-card-img">${imgMarkup}</div>
        <div class="pp-deal-card-body">
          ${brand ? `<div class="pp-deal-card-brand">${brand}</div>` : ''}
          <div class="pp-deal-card-name">${name}</div>
          ${variant ? `<div class="pp-deal-card-variant">${esc(variant)}</div>` : ''}
          <div class="pp-deal-card-foot"><span class="pp-badge-soon">Live soon</span></div>
        </div>
      </a>`;
    }).join('');

  } catch (err) {
    console.error('loadSearchResults:', err);
    grid.innerHTML = emptyState('Something went wrong', 'Could not load results. Please refresh.');
  }
}

// ── PDP (single product) ───────────────────────────────────

async function loadProduct() {
  const main = document.getElementById('pdp-main');
  if (!main) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    main.innerHTML = `<div class="pp-empty pp-text-center" style="padding:80px 20px">
      <h3>Product not found</h3>
      <p>No product ID supplied.</p>
      <a href="/search/" class="pp-btn pp-btn-primary pp-mt-4">Browse all products</a>
    </div>`;
    return;
  }

  main.innerHTML = `<div style="padding:60px 0;text-align:center;color:var(--ink-mute)">Loading product…</div>`;

  try {
    const { data: p, error } = await supabase
      .from('products')
      .select('*, brands(name)')
      .eq('id', id)
      .single();

    if (error || !p) throw error || new Error('not found');

    document.title = `${p.name} — ProteinPrice`;

    const brand   = esc(p.brands?.name || '');
    const name    = esc(p.name || '');
    const img     = esc(p.img || '');
    const variant = [p.size_lb ? `${p.size_lb} lb` : '', p.flavor || ''].filter(Boolean).join(' · ');

    const imgMarkup = img
      ? `<img src="${img}" alt="${name}" loading="eager">`
      : `<svg viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="#A8A29E" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>`;

    const catLabel = { 'protein-powder': 'Protein Powder', 'protein-bar': 'Protein Bar', 'protein-drink': 'Protein Drink' }[p.category] || p.category;
    const catHref  = categoryHref(p.category);

    main.innerHTML = `
      <nav class="pp-crumb" aria-label="Breadcrumb">
        <a href="/">Home</a><span class="pp-crumb-sep">›</span>
        <a href="${catHref}">${esc(catLabel)}</a><span class="pp-crumb-sep">›</span>
        <span aria-current="page">${name}</span>
      </nav>

      <div class="pp-pdp-hero">
        <div class="pp-pdp-image">${imgMarkup}</div>
        <div class="pp-pdp-info">
          ${brand ? `<div class="pp-pdp-brand">${brand}</div>` : ''}
          <h1 class="pp-pdp-title">${name}</h1>
          ${variant ? `<div class="pp-pdp-variant">${esc(variant)}</div>` : ''}
          <div class="pp-pdp-chips">
            ${p.protein_g ? `<span class="pp-pdp-stat-chip"><strong>${p.protein_g}g</strong> protein</span>` : ''}
            ${p.servings  ? `<span class="pp-pdp-stat-chip"><strong>${p.servings}</strong> servings</span>` : ''}
            ${p.calories  ? `<span class="pp-pdp-stat-chip"><strong>${p.calories}</strong> cal/serving</span>` : ''}
            ${p.size_lb   ? `<span class="pp-pdp-stat-chip"><strong>${p.size_lb} lb</strong></span>` : ''}
          </div>

          <div class="pp-cheapest">
            <div class="pp-cheapest-head"><h3>Price comparison</h3></div>
            <p style="color:var(--ink-mute);font-size:14px;line-height:1.5">Live prices from the biggest retailers are launching soon. <a href="/alerts/" style="color:var(--green);font-weight:700">Set a price alert</a> and we'll notify you the moment prices go live.</p>
            <div class="pp-cheapest-cta-row">
              <a href="/alerts/" class="pp-btn pp-btn-primary">Set price alert</a>
              <a href="${catHref}" class="pp-btn pp-btn-ghost">Browse ${esc(catLabel)}</a>
            </div>
          </div>

          ${p.description ? `<div style="margin-top:var(--s-5);font-size:var(--fs-md);color:var(--ink-soft);line-height:1.65">${esc(p.description)}</div>` : ''}
        </div>
      </div>
    `;

  } catch (err) {
    console.error('loadProduct:', err);
    main.innerHTML = `<div class="pp-empty pp-text-center" style="padding:80px 20px">
      <h3>Product not found</h3>
      <p>This product may have been removed or the link is invalid.</p>
      <a href="/search/" class="pp-btn pp-btn-primary pp-mt-4">Browse all products</a>
    </div>`;
  }
}

// ── Filter pill wiring (category pages) ───────────────────

function wireFilterPills() {
  document.querySelectorAll('.pp-filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.pp-filter-pill').forEach(p => p.classList.remove('is-active'));
      pill.classList.add('is-active');
      loadCategoryProducts();
    });
  });
}

// ── Init ───────────────────────────────────────────────────

function init() {
  wireSearchForms();

  if (document.getElementById('featured-row'))  loadFeaturedProducts();
  if (document.getElementById('category-grid')) { wireFilterPills(); loadCategoryProducts(); }
  if (document.getElementById('search-grid'))   loadSearchResults();
  if (document.getElementById('pdp-main'))      loadProduct();
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();

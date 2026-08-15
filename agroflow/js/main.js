// ============================================================
// AGROFLOW — shared UI behaviours (every page includes this)
// ============================================================

/* ---------- Mobile nav ---------- */
function initNav(){
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links){
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
  }
  const nav = document.querySelector('.nav');
  if (nav){
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 8);
    }, { passive:true });
  }
}

/* ---------- Scroll reveal ---------- */
function initReveal(){
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)){
    els.forEach(el => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold:.14, rootMargin:'0px 0px -60px 0px' });
  els.forEach(el => io.observe(el));
}

/* ---------- Floating WhatsApp / Call buttons ---------- */
function injectFloatButtons(){
  if (document.querySelector('.float-actions')) return;
  const wrap = document.createElement('div');
  wrap.className = 'float-actions';
  wrap.innerHTML = `
    <a class="float-btn call" href="tel:${typeof SUPPORT_CALL_NUMBER !== 'undefined' ? SUPPORT_CALL_NUMBER : ''}" aria-label="Call us" title="Call us">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1L6.6 10.8z" fill="currentColor"/></svg>
    </a>
    <a class="float-btn whatsapp" href="https://wa.me/${typeof WHATSAPP_NUMBER !== 'undefined' ? WHATSAPP_NUMBER : ''}?text=Hi%20AgroFlow!%20I%20have%20a%20question." target="_blank" rel="noopener" aria-label="Chat on WhatsApp" title="Chat on WhatsApp">
      <span class="float-pulse"></span>
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" style="position:relative"><path d="M16 3C9 3 3.3 8.7 3.3 15.7c0 2.5.7 4.8 1.9 6.8L3 29l6.7-2.1c1.9 1 4.1 1.6 6.3 1.6 7 0 12.7-5.7 12.7-12.7C28.7 8.7 23 3 16 3z" fill="white" fill-opacity=".0001"/><path d="M22.6 18.9c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.8.2-.2.3-.9 1.1-1.1 1.3-.2.2-.4.3-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-2-1.8-2.3-.2-.3 0-.5.1-.6.1-.1.3-.4.5-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.2-.8-1.9-1-2.6-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.3 1.4 3.5c.2.2 2.4 3.7 5.8 5.1.8.3 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 2-.8 2.3-1.6.3-.8.3-1.4.2-1.6-.1-.1-.3-.2-.6-.4z" fill="currentColor"/></svg>
    </a>
  `;
  document.body.appendChild(wrap);
}

/* ---------- Toasts ---------- */
function showToast(message, type='success', ms=3200){
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap){
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = message;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

/* ---------- Cart badge (uses cart.js helpers) ---------- */
function refreshCartBadge(){
  const badge = document.querySelector('.cart-count');
  if (!badge || typeof getCart !== 'function') return;
  const count = getCart().reduce((sum, i) => sum + i.qty, 0);
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

/* ---------- Init everything ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveal();
  injectFloatButtons();
  refreshCartBadge();
});

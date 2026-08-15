// ============================================================
// AGROFLOW — product data helpers (Supabase reads)
// ============================================================

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=800&auto=format&fit=crop';

async function fetchProducts({ featuredOnly = false, category = null, limit = null } = {}){
  let query = supabaseClient
    .from('products')
    .select('*, brands(name, slug)')
    .eq('is_available', true)
    .order('created_at', { ascending: false });

  if (featuredOnly) query = query.eq('is_featured', true);
  if (category && category !== 'all') query = query.eq('category', category);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error){ console.error('fetchProducts error', error); return []; }
  return data || [];
}

async function fetchProductBySlug(slug){
  const { data, error } = await supabaseClient
    .from('products')
    .select('*, brands(name, slug, tagline, description)')
    .eq('slug', slug)
    .single();
  if (error){ console.error('fetchProductBySlug error', error); return null; }
  return data;
}

async function fetchBrands(){
  const { data, error } = await supabaseClient
    .from('brands')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error){ console.error('fetchBrands error', error); return []; }
  return data || [];
}

function productCardHTML(p){
  const brandName = p.brands ? p.brands.name : '';
  const img = p.image_url && p.image_url.trim() ? p.image_url : FALLBACK_IMG;
  const outOfStock = !p.is_available || p.stock_qty <= 0;
  const discount = p.compare_at_price && p.compare_at_price > p.price
    ? Math.round(100 - (p.price / p.compare_at_price) * 100)
    : null;

  return `
  <div class="product-card reveal">
    <a href="product.html?slug=${p.slug}" class="product-thumb">
      ${discount ? `<span class="product-tag">${discount}% OFF</span>` : ''}
      ${outOfStock ? `<span class="product-tag out">SOLD OUT</span>` : ''}
      <img src="${img}" alt="${p.name}" loading="lazy">
    </a>
    <div class="product-body">
      <span class="product-brand">${brandName}</span>
      <a href="product.html?slug=${p.slug}"><h3 class="product-name">${p.name}</h3></a>
      <span class="product-meta">${p.size_ml} ml &middot; ${p.extraction_method || 'Cold-pressed'}</span>
      <div class="product-price-row">
        <span class="price">${formatINR(p.price)}</span>
        ${p.compare_at_price ? `<span class="price-compare">${formatINR(p.compare_at_price)}</span>` : ''}
      </div>
      <div class="product-actions">
        <button class="btn btn-primary btn-sm" ${outOfStock ? 'disabled' : ''} onclick='quickAdd(${JSON.stringify({id:p.id,name:p.name,brand:brandName,price:p.price,image_url:img,size_ml:p.size_ml,slug:p.slug})})'>
          ${outOfStock ? 'Sold out' : 'Add to cart'}
        </button>
        <a href="product.html?slug=${p.slug}" class="btn btn-outline btn-sm">View</a>
      </div>
    </div>
  </div>`;
}

function quickAdd(product){
  addToCart(product, 1);
}

function skeletonCardsHTML(n = 8){
  return Array.from({ length: n }).map(() => `
    <div class="product-card">
      <div class="product-thumb skeleton" style="aspect-ratio:1/1"></div>
      <div class="product-body">
        <div class="skeleton" style="height:12px;width:40%;border-radius:4px;margin-bottom:8px"></div>
        <div class="skeleton" style="height:18px;width:80%;border-radius:4px;margin-bottom:8px"></div>
        <div class="skeleton" style="height:22px;width:50%;border-radius:4px"></div>
      </div>
    </div>`).join('');
}

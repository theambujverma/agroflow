// ============================================================
// AGROFLOW — Cart (persisted in localStorage under 'agroflow_cart')
// Cart item shape: { id, name, brand, price, image_url, qty, size_ml, slug }
// ============================================================
const CART_KEY = 'agroflow_cart';
const SHIPPING_FEE = 49;
const FREE_SHIPPING_ABOVE = 799;

function getCart(){
  try{
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  }catch(e){ return []; }
}

function saveCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  refreshCartBadge();
}

function addToCart(product, qty = 1){
  const cart = getCart();
  const existing = cart.find(i => i.id === product.id);
  if (existing){
    existing.qty += qty;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      brand: product.brand || '',
      price: product.price,
      image_url: product.image_url || '',
      size_ml: product.size_ml || '',
      slug: product.slug,
      qty
    });
  }
  saveCart(cart);
  if (typeof showToast === 'function') showToast(`${product.name} added to cart`, 'success');
}

function removeFromCart(id){
  saveCart(getCart().filter(i => i.id !== id));
}

function updateQty(id, qty){
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, qty);
  saveCart(cart);
}

function clearCart(){ saveCart([]); }

function cartSubtotal(){
  return getCart().reduce((sum, i) => sum + i.price * i.qty, 0);
}

function cartShipping(){
  const sub = cartSubtotal();
  if (sub === 0) return 0;
  return sub >= FREE_SHIPPING_ABOVE ? 0 : SHIPPING_FEE;
}

function cartTotal(){
  return cartSubtotal() + cartShipping();
}

function formatINR(n){
  return '₹' + Number(n).toLocaleString('en-IN');
}

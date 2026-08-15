// ============================================================
// AGROFLOW — checkout logic
// ============================================================
let selectedPayment = 'cod';

function selectPayment(method){
  selectedPayment = method;
  document.querySelectorAll('.pay-option').forEach(el => el.classList.toggle('selected', el.dataset.method === method));
}

function renderCheckoutSummary(){
  const cart = getCart();
  if (!cart.length){
    location.href = 'cart.html';
    return;
  }
  document.getElementById('mini-items').innerHTML = cart.map(i => `
    <div class="mini-item"><span>${i.name} × ${i.qty}</span><b>${formatINR(i.price * i.qty)}</b></div>
  `).join('');
  const sub = cartSubtotal();
  const ship = cartShipping();
  document.getElementById('co-subtotal').textContent = formatINR(sub);
  document.getElementById('co-shipping').textContent = ship === 0 ? 'FREE' : formatINR(ship);
  document.getElementById('co-total').textContent = formatINR(sub + ship);
}

function edgeFunctionUrl(name){
  // SUPABASE_URL like https://xxxx.supabase.co -> functions at https://xxxx.functions.supabase.co
  const ref = SUPABASE_URL.replace('https://', '').split('.')[0];
  return `https://${ref}.functions.supabase.co/${name}`;
}

async function createOrderRow(payload){
  const { data, error } = await supabaseClient.from('orders').insert(payload).select().single();
  if (error){ console.error(error); throw error; }
  return data;
}

document.addEventListener('DOMContentLoaded', () => {
  renderCheckoutSummary();

  const form = document.getElementById('checkout-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('place-order-btn');
    btn.disabled = true;
    btn.textContent = 'Placing order…';

    const cart = getCart();
    const subtotal = cartSubtotal();
    const shipping = cartShipping();
    const total = subtotal + shipping;

    const orderPayload = {
      customer_name: document.getElementById('c-name').value.trim(),
      customer_phone: document.getElementById('c-phone').value.trim(),
      customer_email: document.getElementById('c-email').value.trim() || null,
      address_line: document.getElementById('c-address').value.trim(),
      city: document.getElementById('c-city').value.trim(),
      state: document.getElementById('c-state').value.trim(),
      pincode: document.getElementById('c-pincode').value.trim(),
      items: cart.map(i => ({ product_id: i.id, name: i.name, price: i.price, qty: i.qty, image_url: i.image_url })),
      subtotal, shipping_fee: shipping, total,
      payment_method: selectedPayment,
      payment_status: selectedPayment === 'cod' ? 'pending' : 'pending',
      status: 'new'
    };

    try{
      if (selectedPayment === 'cod'){
        const order = await createOrderRow(orderPayload);
        clearCart();
        location.href = `order-success.html?order=${order.order_number}`;
        return;
      }

      // Razorpay flow
      const order = await createOrderRow(orderPayload);

      const res = await fetch(edgeFunctionUrl('create-razorpay-order'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_in_rupees: total, receipt: order.order_number })
      });
      const data = await res.json();
      if (!res.ok || data.error){ throw new Error('Could not initiate payment'); }

      const rzp = new Razorpay({
        key: data.key_id,
        amount: data.order.amount,
        currency: 'INR',
        name: 'AgroFlow',
        description: `Order ${order.order_number}`,
        order_id: data.order.id,
        prefill: {
          name: orderPayload.customer_name,
          email: orderPayload.customer_email || '',
          contact: orderPayload.customer_phone
        },
        theme: { color: '#24361E' },
        handler: async function (response){
          try{
            const verifyRes = await fetch(edgeFunctionUrl('verify-razorpay-payment'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                order_id: order.id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.verified){
              clearCart();
              location.href = `order-success.html?order=${order.order_number}`;
            } else {
              showToast('Payment verification failed. Please contact support.', 'error');
              btn.disabled = false; btn.textContent = 'Place Order';
            }
          }catch(err){
            showToast('Payment verification error.', 'error');
            btn.disabled = false; btn.textContent = 'Place Order';
          }
        },
        modal: {
          ondismiss: function(){
            btn.disabled = false; btn.textContent = 'Place Order';
          }
        }
      });
      rzp.open();

    }catch(err){
      console.error(err);
      showToast('Something went wrong. Please try again.', 'error');
      btn.disabled = false;
      btn.textContent = 'Place Order';
    }
  });
});

// ============================================================
// AGROFLOW ADMIN — shared: auth guard, sidebar, live notifications
// ============================================================

/* ---------- Auth guard: redirect to login if not an admin ---------- */
async function requireAdmin(){
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session){
    location.href = 'login.html';
    return null;
  }
  const { data: adminRow, error } = await supabaseClient
    .from('admin_users')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error || !adminRow){
    await supabaseClient.auth.signOut();
    alert('This account is not registered as an admin. Ask a super-admin to add you to admin_users.');
    location.href = 'login.html';
    return null;
  }
  return { user: session.user, admin: adminRow };
}

function renderSidebar(active){
  const items = [
    { href:'dashboard.html', label:'Dashboard', key:'dashboard', icon:'📊' },
    { href:'products.html',  label:'Products',  key:'products',  icon:'🛢️' },
    { href:'orders.html',    label:'Orders',     key:'orders',    icon:'📦', badgeId:'badge-orders' },
    { href:'leads.html',     label:'Leads',      key:'leads',     icon:'📥', badgeId:'badge-leads' },
    { href:'support.html',   label:'Help & Support', key:'support', icon:'💬', badgeId:'badge-support' },
  ];
  const nav = document.getElementById('admin-nav');
  nav.innerHTML = items.map(it => `
    <a href="${it.href}" class="${it.key === active ? 'active' : ''}">
      <span>${it.icon}</span> ${it.label}
      ${it.badgeId ? `<span class="badge-count" id="${it.badgeId}">0</span>` : ''}
    </a>`).join('');
}

function initAdminLogout(){
  const btn = document.getElementById('logout-btn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    location.href = 'login.html';
  });
}

/* ---------- Sidebar unread badge counts ---------- */
async function refreshAdminCounts(){
  const [{ count: newOrders }, { count: unreadLeads }, { count: openTickets }] = await Promise.all([
    supabaseClient.from('orders').select('*', { count:'exact', head:true }).eq('status', 'new'),
    supabaseClient.from('leads').select('*', { count:'exact', head:true }).eq('is_read', false),
    supabaseClient.from('support_tickets').select('*', { count:'exact', head:true }).eq('status', 'open'),
  ]);
  setBadge('badge-orders', newOrders);
  setBadge('badge-leads', unreadLeads);
  setBadge('badge-support', openTickets);

  const dot = document.getElementById('notif-dot');
  if (dot){
    const total = (newOrders||0) + (unreadLeads||0) + (openTickets||0);
    dot.classList.toggle('show', total > 0);
  }
}
function setBadge(id, count){
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = count || 0;
  el.classList.toggle('show', !!count);
}

/* ---------- Realtime: browser notification + sound on new rows ---------- */
function initAdminRealtime(){
  if ('Notification' in window && Notification.permission === 'default'){
    Notification.requestPermission();
  }

  const ping = () => {
    try{
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(.08, ctx.currentTime);
      osc.start(); osc.stop(ctx.currentTime + .18);
    }catch(e){}
  };

  const notify = (title, body) => {
    refreshAdminCounts();
    ping();
    if (typeof showToast === 'function') showToast(`${title}: ${body}`, 'success', 5000);
    if ('Notification' in window && Notification.permission === 'granted'){
      new Notification(title, { body, icon: '' });
    }
  };

  supabaseClient
    .channel('admin-orders')
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'orders' }, (payload) => {
      notify('New order received', `${payload.new.order_number} — ₹${payload.new.total}`);
    })
    .subscribe();

  supabaseClient
    .channel('admin-leads')
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'leads' }, (payload) => {
      notify('New lead', `${payload.new.name} — ${payload.new.phone}`);
    })
    .subscribe();

  supabaseClient
    .channel('admin-tickets')
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'support_tickets' }, (payload) => {
      notify('New support ticket', `${payload.new.subject}`);
    })
    .subscribe();
}

function formatDate(iso){
  return new Date(iso).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

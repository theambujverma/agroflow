# AgroFlow — Farm-Direct Mustard & Coconut Oil Store

Full D2C e-commerce site: HTML/CSS/JS frontend + Supabase backend, deployable free on Vercel.

Includes: dynamic product catalogue (5 brands), single product pages, cart, checkout
(Razorpay online payment + Cash on Delivery), contact form (leads), help & support
tickets, a WhatsApp + Call floating button, and a full **admin panel** (products CRUD,
orders management with status updates, leads inbox, support tickets, live notifications).

---

## 1. Project structure

```
agroflow/
├── index.html            Home page
├── products.html         Shop / catalogue with filters
├── product.html          Dynamic single-product page (?slug=...)
├── cart.html              Cart
├── checkout.html          Checkout (Razorpay + COD)
├── order-success.html     Order confirmation
├── contact.html           Contact form → leads table
├── support.html           Help & support ticket form + FAQ
├── css/style.css          Global design system
├── js/
│   ├── supabase-client.js  ← put your Supabase URL & anon key here
│   ├── main.js              nav, reveal animations, WhatsApp/call buttons, toasts
│   ├── cart.js               localStorage cart engine
│   ├── products.js           product fetch/render helpers
│   ├── checkout.js           order placement + Razorpay flow
│   ├── contact.js / support.js
├── admin/                  Admin panel (separate mini-app)
│   ├── login.html
│   ├── dashboard.html
│   ├── products.html / product-edit.html
│   ├── orders.html
│   ├── leads.html
│   ├── support.html
│   └── js/admin-common.js   auth guard, sidebar, realtime notifications
└── supabase/
    ├── schema.sql                     ← run this first
    └── functions/
        ├── create-razorpay-order/     Edge Function
        └── verify-razorpay-payment/   Edge Function
```

---

## 2. Set up Supabase (backend)

1. Create a free project at https://supabase.com.
2. Open **SQL Editor** → paste the entire contents of `supabase/schema.sql` → Run.
   This creates all tables (`brands`, `products`, `orders`, `leads`,
   `support_tickets`, `admin_users`), Row Level Security policies, and seeds
   5 sample brands + 5 sample products.
3. Go to **Project Settings → API** and copy:
   - `Project URL`
   - `anon public` key
4. Paste them into `js/supabase-client.js`:
   ```js
   const SUPABASE_URL = "https://xxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJ...";
   ```
5. Also set your WhatsApp number and support phone number in the same file
   (`WHATSAPP_NUMBER`, `SUPPORT_CALL_NUMBER`).

### Create your admin login
1. Open `admin/login.html` locally (or after deploying) → click **"Create an
   account instead"** → sign up with your email/password.
2. In Supabase SQL Editor, run:
   ```sql
   insert into admin_users (id, full_name, phone)
   values ('<paste the user id from Authentication → Users>', 'Your Name', '+91XXXXXXXXXX');
   ```
3. Log in again at `admin/login.html` — you'll land on the dashboard.

You can repeat this to add more admin/staff accounts.

---

## 3. Set up Razorpay payments

Payments are verified server-side using two Supabase Edge Functions so your
Razorpay **secret key never reaches the browser**.

1. Get your Key ID & Key Secret from https://dashboard.razorpay.com → Settings → API Keys.
2. Install the Supabase CLI: `npm i -g supabase`
3. From the project folder:
   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase secrets set RAZORPAY_KEY_ID=rzp_live_xxx RAZORPAY_KEY_SECRET=xxx
   supabase functions deploy create-razorpay-order
   supabase functions deploy verify-razorpay-payment
   ```
   (`verify-razorpay-payment` also needs `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` — the CLI sets `SUPABASE_URL` automatically;
   add the service role key with:
   `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=xxx` — found in
   Project Settings → API → service_role.)
4. That's it — the "Pay Online" option in checkout will now open the real
   Razorpay popup. "Cash on Delivery" always works with zero extra setup.

---

## 4. Admin mobile notifications (orders / leads / support)

Out of the box, the admin dashboard uses **Supabase Realtime** + the browser
**Notifications API**: whenever a new order/lead/ticket is inserted, every
open admin dashboard tab gets an instant toast + sound + OS-level browser
notification (works great as a installed PWA / "Add to Home Screen" on a
phone, so it behaves like a push notification even when the phone is locked
on some Android browsers).

For guaranteed notifications even when the admin has the app fully closed
(true push to a phone), wire up one of these (not included, since it needs
your own account/API keys):
- **WhatsApp Cloud API** — send a template message to the admin's WhatsApp
  number whenever a row is inserted (trigger a Supabase Database Webhook →
  a small Edge Function that calls the WhatsApp Cloud API).
- **OneSignal** or **Firebase Cloud Messaging** — for true mobile push
  notifications to an installed app/PWA.

Both can be dropped in as one more Edge Function, called from the same
Database Webhook that already fires on `orders`, `leads`, and
`support_tickets` inserts.

---

## 5. Run locally

No build step needed — it's plain HTML/CSS/JS.
```bash
cd agroflow
npx serve .
```
Open the printed localhost URL. Admin panel is at `/admin/login.html`.

---

## 6. Deploy

**Frontend → Vercel**
```bash
npm i -g vercel
cd agroflow
vercel --prod
```
(Root directory = this folder. No build command needed — it's static.)

**Backend → already live on Supabase** once you've run `schema.sql` and
deployed the two Edge Functions above.

---

## 7. Managing the store day-to-day

- **Add/edit/delete oils & brands** → `admin/products.html`
  (image, price, stock, brand, availability, "featured" toggle — all editable,
  changes reflect on the live site instantly).
- **Orders** → `admin/orders.html`: view items + address, update status
  (new → confirmed → packed → shipped → delivered), see COD vs online
  payment status.
- **Leads** → `admin/leads.html`: everyone who filled the Contact form.
- **Help & Support** → `admin/support.html`: customer support tickets, with
  order number reference and one-click WhatsApp reply.

To add a 6th brand or more products, just use the admin panel — no code
changes required.

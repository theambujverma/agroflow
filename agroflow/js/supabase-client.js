// ============================================================
// AGROFLOW — Supabase client
// Fill these two values after creating your Supabase project:
// Project Settings → API → Project URL / anon public key
// These are SAFE to expose in frontend JS (protected by RLS).
// ============================================================
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";

// supabase-js is loaded via CDN script tag in every HTML page:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// WhatsApp business number (with country code, no + or spaces) shown on floating button
const WHATSAPP_NUMBER = "919999999999";
const SUPPORT_CALL_NUMBER = "+919999999999";

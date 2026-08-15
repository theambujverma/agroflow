// @ts-nocheck
// Supabase Edge Function: create-razorpay-order
// Creates a Razorpay order server-side so the secret key never touches the browser.
//
// Deploy:   supabase functions deploy create-razorpay-order
// Secrets:  supabase secrets set RAZORPAY_KEY_ID=xxx RAZORPAY_KEY_SECRET=xxx
//
// Called from js/checkout.js with: { amount_in_rupees, receipt }

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { amount_in_rupees, receipt } = await req.json();

    if (!amount_in_rupees || amount_in_rupees <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    const rpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body: JSON.stringify({
        amount: Math.round(amount_in_rupees * 100), // paise
        currency: "INR",
        receipt: receipt ?? `af_${Date.now()}`,
        payment_capture: 1,
      }),
    });

    const rpData = await rpRes.json();

    if (!rpRes.ok) {
      return new Response(JSON.stringify({ error: rpData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ order: rpData, key_id: RAZORPAY_KEY_ID }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

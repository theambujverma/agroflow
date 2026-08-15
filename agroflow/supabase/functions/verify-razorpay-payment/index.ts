// @ts-nocheck
// Supabase Edge Function: verify-razorpay-payment
// Verifies the Razorpay payment signature (HMAC SHA256) and marks the order as paid.
//
// Deploy:   supabase functions deploy verify-razorpay-payment
// Secrets:  supabase secrets set RAZORPAY_KEY_SECRET=xxx SUPABASE_SERVICE_ROLE_KEY=xxx SUPABASE_URL=xxx
//
// Called from js/checkout.js after Razorpay checkout success with:
// { order_id (our orders.id), razorpay_order_id, razorpay_payment_id, razorpay_signature }

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hmacHex(secret: string, message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      order_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await req.json();

    const expected = await hmacHex(
      RAZORPAY_KEY_SECRET,
      `${razorpay_order_id}|${razorpay_payment_id}`
    );

    const isValid = expected === razorpay_signature;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    if (!isValid) {
      await supabase
        .from("orders")
        .update({ payment_status: "failed" })
        .eq("id", order_id);

      return new Response(JSON.stringify({ verified: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        status: "confirmed",
        razorpay_order_id,
        razorpay_payment_id,
      })
      .eq("id", order_id);

    return new Response(JSON.stringify({ verified: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * create-payment-intent — Supabase Edge Function
 *
 * สร้าง Stripe PaymentIntent และคืน clientSecret กลับไปยัง frontend
 *
 * POST /functions/v1/create-payment-intent
 * Body: { productId: string }
 * Headers: Authorization: Bearer <user-jwt>
 *
 * Env vars (ตั้งใน Supabase Dashboard → Edge Functions → Secrets):
 *   SUPABASE_URL              (auto-injected)
 *   SUPABASE_ANON_KEY         (auto-injected)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   STRIPE_SECRET_KEY         (sk_test_... สำหรับ test mode)
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, corsResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    let body: { productId: string };
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body");
    }

    const { productId } = body;
    if (!productId || typeof productId !== "string") {
      return errorResponse("Missing or invalid productId");
    }

    // ── Verify user JWT ──────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Missing authorization header", 401);
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    // ── Get product via service role ─────────────────────────────────────────
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      return errorResponse("Server misconfigured: missing service key", 500);
    }

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, name, price_amount, currency, is_active")
      .eq("id", productId)
      .eq("is_active", true)
      .maybeSingle();

    if (productError || !product) {
      return errorResponse("Product not found or inactive");
    }

    // ── Create Stripe PaymentIntent ──────────────────────────────────────────
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return errorResponse("Stripe is not configured", 503);
    }

    const params = new URLSearchParams({
      amount: product.price_amount.toString(),
      currency: product.currency.toLowerCase(),
      "automatic_payment_methods[enabled]": "true",
      "metadata[user_id]": user.id,
      "metadata[product_id]": product.id,
      "metadata[product_name]": product.name,
    });

    const stripeRes = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!stripeRes.ok) {
      const err = await stripeRes.json();
      console.error("Stripe error:", err);
      return errorResponse("Failed to create payment intent", 502);
    }

    const pi = await stripeRes.json();

    return corsResponse(
      JSON.stringify({
        clientSecret: pi.client_secret,
        paymentIntentId: pi.id,
      }),
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return errorResponse("Internal server error", 500);
  }
});

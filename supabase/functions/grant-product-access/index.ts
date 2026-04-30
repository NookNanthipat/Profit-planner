/**
 * grant-product-access — Supabase Edge Function
 *
 * ทำหน้าที่แทน client-side upsert ที่เคยอยู่ใน Checkout.tsx
 * ใช้ service_role เขียน user_products เพื่อปิดช่องโหว่ RLS
 *
 * POST /functions/v1/grant-product-access
 * Body:
 *   { productId: string, mode: "demo" | "trial" | "stripe", stripePaymentIntentId?: string }
 *
 * Headers:
 *   Authorization: Bearer <user-jwt>
 *
 * Env vars ที่ต้องตั้งใน Supabase Dashboard → Edge Functions → Secrets:
 *   SUPABASE_URL              (auto-injected)
 *   SUPABASE_ANON_KEY         (auto-injected)
 *   SUPABASE_SERVICE_ROLE_KEY (ต้องตั้งเอง — ห้ามใส่ใน client code)
 *   DEMO_MODE                 (ตั้งเป็น "true" สำหรับ demo, ลบออกก่อน production)
 *   STRIPE_SECRET_KEY         (ตั้งเมื่อเชื่อม Stripe จริง)
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, corsResponse, errorResponse } from "../_shared/cors.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

type GrantMode = "demo" | "trial" | "stripe";

interface RequestBody {
  productId: string;
  mode: GrantMode;
  stripePaymentIntentId?: string;
}

interface Product {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  app_route: string | null;
  is_active: boolean;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    // ── 1. Parse & validate request body ──────────────────────────────────
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body");
    }

    const { productId, mode, stripePaymentIntentId } = body;

    if (!productId || typeof productId !== "string") {
      return errorResponse("Missing or invalid productId");
    }
    if (!["demo", "trial", "stripe"].includes(mode)) {
      return errorResponse("Invalid mode. Must be: demo | trial | stripe");
    }

    // ── 2. Verify user JWT ─────────────────────────────────────────────────
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

    // ── 3. Service-role client (สำหรับ DB writes เท่านั้น) ────────────────
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      return errorResponse("Server misconfigured: missing service key", 500);
    }
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceKey,
    );

    // ── 4. ตรวจสอบ product ────────────────────────────────────────────────
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, name, price_cents, currency, app_route, is_active")
      .eq("id", productId)
      .eq("is_active", true)
      .maybeSingle();

    if (productError || !product) {
      return errorResponse("Product not found or inactive");
    }

    // ── 5. ตรวจสอบตาม mode ────────────────────────────────────────────────
    let status: "active" | "trial";
    let expired_at: string | null = null;

    if (mode === "trial") {
      // Trial: 7 วัน ไม่ต้องชำระเงิน
      status = "trial";
      expired_at = new Date(Date.now() + 7 * 86_400_000).toISOString();

    } else if (mode === "demo") {
      // Demo: ต้องเปิด DEMO_MODE ใน env (ปิดก่อน production)
      const isDemoEnabled = Deno.env.get("DEMO_MODE") === "true";
      if (!isDemoEnabled) {
        return errorResponse("Demo mode is disabled. Please complete payment.", 403);
      }
      status = "active";

    } else {
      // Stripe: ตรวจสอบ Payment Intent กับ Stripe API
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) {
        return errorResponse("Stripe is not configured yet", 503);
      }
      if (!stripePaymentIntentId) {
        return errorResponse("Missing stripePaymentIntentId");
      }

      const stripeRes = await fetch(
        `https://api.stripe.com/v1/payment_intents/${stripePaymentIntentId}`,
        { headers: { Authorization: `Bearer ${stripeKey}` } },
      );

      if (!stripeRes.ok) {
        return errorResponse("Failed to verify payment with Stripe");
      }

      const pi = await stripeRes.json();

      // ตรวจสอบว่าชำระสำเร็จ
      if (pi.status !== "succeeded") {
        return errorResponse(`Payment not completed. Status: ${pi.status}`);
      }

      // ตรวจสอบ amount (ป้องกัน pay น้อยกว่าราคาจริง)
      if (pi.amount < product.price_cents) {
        return errorResponse("Payment amount is less than product price");
      }

      // ตรวจสอบ metadata user_id (ถ้า Payment Intent สร้างพร้อม metadata)
      if (pi.metadata?.user_id && pi.metadata.user_id !== user.id) {
        return errorResponse("Payment user mismatch", 403);
      }

      status = "active";
    }

    // ── 6. Grant access ด้วย service_role ────────────────────────────────
    const { error: grantError } = await supabaseAdmin
      .from("user_products")
      .upsert(
        {
          user_id: user.id,
          product_id: product.id,
          status,
          purchased_at: new Date().toISOString(),
          expired_at,
        },
        { onConflict: "user_id,product_id" },
      );

    if (grantError) {
      console.error("Grant error:", grantError);
      return errorResponse("Failed to grant access", 500);
    }

    // ── 7. บันทึก audit log ───────────────────────────────────────────────
    const logType = mode === "trial" ? "trial_started" : "product_purchased";
    await supabaseAdmin.from("activity_log").insert({
      user_id: user.id,
      actor_id: user.id,
      type: logType,
      metadata: {
        product_id: product.id,
        product_name: product.name,
        mode,
        status,
        ...(stripePaymentIntentId && { stripe_pi: stripePaymentIntentId }),
      },
    });

    // ── 8. ตอบกลับ ───────────────────────────────────────────────────────
    return corsResponse(
      JSON.stringify({
        success: true,
        status,
        redirectUrl: product.app_route || "/portal",
        message: mode === "trial"
          ? "Your 7-day trial is now active."
          : "Access granted successfully.",
      }),
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    return errorResponse("Internal server error", 500);
  }
});

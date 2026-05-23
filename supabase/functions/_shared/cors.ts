// Restrict CORS to production domain.
// Set ALLOWED_ORIGIN secret in Supabase Dashboard → Edge Functions → Secrets.
// e.g. https://your-site.netlify.app (no trailing slash)
// Falls back to "*" when not set (local dev / unset).
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

export const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function corsResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(message: string, status = 400) {
  return corsResponse(JSON.stringify({ error: message }), status);
}

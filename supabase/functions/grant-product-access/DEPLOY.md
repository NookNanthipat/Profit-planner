# Deploy: grant-product-access Edge Function

## ขั้นตอนที่ 1 — ติดตั้ง Supabase CLI

```bash
# Windows (via Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# หรือผ่าน npm
npm install -g supabase
```

## ขั้นตอนที่ 2 — Login และ Link Project

```bash
supabase login
supabase link --project-ref ydaogwwblzjmjsbadivv
```

## ขั้นตอนที่ 3 — ตั้งค่า Environment Variables (Secrets)

ทำใน Supabase Dashboard → Project → Edge Functions → Manage secrets
หรือผ่าน CLI:

```bash
# จำเป็นต้องตั้ง (SUPABASE_URL และ SUPABASE_ANON_KEY inject อัตโนมัติ)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Demo mode — ตั้งตอนนี้, ลบออกก่อน production
supabase secrets set DEMO_MODE=true

# Stripe — ตั้งเมื่อพร้อม (ยังไม่ต้องตั้งตอนนี้)
# supabase secrets set STRIPE_SECRET_KEY=sk_live_...
```

หา Service Role Key ได้ที่:
Supabase Dashboard → Project Settings → API → service_role key

## ขั้นตอนที่ 4 — Deploy Function

```bash
supabase functions deploy grant-product-access --no-verify-jwt
```

หมายเหตุ: ใช้ `--no-verify-jwt` เพราะ function จัดการ JWT เอง
(ตรวจจาก Authorization header แทน Supabase auto-verify)

## ขั้นตอนที่ 5 — ทดสอบ

```bash
# ทดสอบ trial mode
curl -X POST https://ydaogwwblzjmjsbadivv.supabase.co/functions/v1/grant-product-access \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"productId": "<PRODUCT_UUID>", "mode": "trial"}'

# ทดสอบ demo mode (ต้องตั้ง DEMO_MODE=true ก่อน)
curl -X POST https://ydaogwwblzjmjsbadivv.supabase.co/functions/v1/grant-product-access \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"productId": "<PRODUCT_UUID>", "mode": "demo"}'
```

ผลลัพธ์ที่คาดหวัง:
```json
{
  "success": true,
  "status": "active",
  "redirectUrl": "/app/profit-planner",
  "message": "Access granted successfully."
}
```

## ขั้นตอนก่อน Production (เมื่อเชื่อม Stripe จริง)

1. ลบ `DEMO_MODE` secret ออก:
   ```bash
   supabase secrets unset DEMO_MODE
   ```

2. ตั้ง `STRIPE_SECRET_KEY`:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
   ```

3. แก้ Checkout.tsx ให้สร้าง Payment Intent ก่อน → redirect ไป Stripe Checkout
   → หลังจ่ายสำเร็จ → เรียก `grant-product-access` ด้วย `mode: "stripe"` และ `stripePaymentIntentId`

4. Deploy อีกครั้ง:
   ```bash
   supabase functions deploy grant-product-access --no-verify-jwt
   ```

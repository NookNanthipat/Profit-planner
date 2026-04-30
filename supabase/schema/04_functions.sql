-- ============================================================
-- 04_functions.sql — All Database Functions & Triggers
-- Project: ProfitPlanner (ydaogwwblzjmjsbadivv)
-- Last synced: 2026-04-30
-- ============================================================

-- ─── Utility ─────────────────────────────────────────────────────────────────

-- ตรวจสอบว่า user มี role ที่กำหนดหรือไม่
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ตรวจสอบว่า user มีสิทธิ์ใช้งาน product ที่กำหนดหรือไม่
CREATE OR REPLACE FUNCTION public.user_has_product_access(_user_id uuid, _product_slug text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_products up
    JOIN public.products p ON p.id = up.product_id
    WHERE up.user_id = _user_id
      AND p.slug = _product_slug
      AND up.status IN ('active', 'trial')
      AND (up.expired_at IS NULL OR up.expired_at > now())
  )
$$;

-- ─── Trigger Functions ────────────────────────────────────────────────────────

-- สร้าง profile อัตโนมัติเมื่อ user ลงทะเบียน (TRIGGER: after INSERT on auth.users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$;

-- บันทึก activity log เมื่อ user ลงทะเบียน (TRIGGER: after INSERT on auth.users)
CREATE OR REPLACE FUNCTION public.log_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.activity_log (user_id, type, metadata)
  VALUES (new.id, 'signup', jsonb_build_object('email', new.email));
  RETURN new;
END;
$$;

-- บันทึก activity log เมื่อ product status เปลี่ยน (TRIGGER: after UPDATE on products)
CREATE OR REPLACE FUNCTION public.log_product_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (old.is_active IS DISTINCT FROM new.is_active) OR
     (old.is_coming_soon IS DISTINCT FROM new.is_coming_soon) THEN
    INSERT INTO public.activity_log (actor_id, type, metadata)
    VALUES (auth.uid(), 'product_status_changed',
      jsonb_build_object(
        'product_id', new.id,
        'slug', new.slug,
        'is_active', new.is_active,
        'is_coming_soon', new.is_coming_soon
      ));
  END IF;
  RETURN new;
END;
$$;

-- ─── ProfitPlanner RPCs ───────────────────────────────────────────────────────

-- Monthly dashboard summary: income / expense / net / savings_rate / by_category / daily
CREATE OR REPLACE FUNCTION public.pp_monthly_summary(_user_id uuid, _month date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  start_d       date    := date_trunc('month', _month)::date;
  end_d         date    := (date_trunc('month', _month) + interval '1 month' - interval '1 day')::date;
  income_total  numeric := 0;
  expense_total numeric := 0;
  by_category   jsonb   := '[]'::jsonb;
  daily         jsonb   := '[]'::jsonb;
BEGIN
  SELECT COALESCE(SUM(amount),0) INTO income_total
    FROM pp_transactions
    WHERE user_id = _user_id AND type = 'income' AND occurred_on BETWEEN start_d AND end_d;

  SELECT COALESCE(SUM(amount),0) INTO expense_total
    FROM pp_transactions
    WHERE user_id = _user_id AND type = 'expense' AND occurred_on BETWEEN start_d AND end_d;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO by_category FROM (
    SELECT c.id AS category_id, COALESCE(c.name, 'Uncategorized') AS name,
           c.color, c.icon, SUM(tx.amount)::numeric AS total
    FROM pp_transactions tx
    LEFT JOIN pp_categories c ON c.id = tx.category_id
    WHERE tx.user_id = _user_id AND tx.type = 'expense'
      AND tx.occurred_on BETWEEN start_d AND end_d
    GROUP BY c.id, c.name, c.color, c.icon
    ORDER BY total DESC
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(d)), '[]'::jsonb) INTO daily FROM (
    SELECT occurred_on AS date,
           SUM(CASE WHEN type='income'  THEN amount ELSE 0 END)::numeric AS income,
           SUM(CASE WHEN type='expense' THEN amount ELSE 0 END)::numeric AS expense
    FROM pp_transactions
    WHERE user_id = _user_id AND occurred_on BETWEEN start_d AND end_d
    GROUP BY occurred_on ORDER BY occurred_on
  ) d;

  RETURN jsonb_build_object(
    'income',       income_total,
    'expense',      expense_total,
    'net',          income_total - expense_total,
    'savings_rate', CASE WHEN income_total > 0
                    THEN (income_total - expense_total) / income_total ELSE 0 END,
    'by_category',  by_category,
    'daily',        daily,
    'start',        start_d,
    'end',          end_d
  );
END;
$$;

-- Budget summary: planned vs actual per category สำหรับเดือนที่กำหนด
CREATE OR REPLACE FUNCTION public.pp_budget_summary(_user_id uuid, _month text)
RETURNS TABLE (
  category_id    uuid,
  category_name  text,
  category_icon  text,
  category_color text,
  category_type  text,
  planned_amount numeric,
  actual_amount  numeric
) LANGUAGE sql SECURITY DEFINER AS $$
  WITH budget_rows AS (
    SELECT b.category_id, b.planned_amount
    FROM pp_budgets b
    WHERE b.user_id = _user_id AND b.month = _month
  ),
  tx_rows AS (
    SELECT t.category_id, SUM(t.amount) AS actual_amount
    FROM pp_transactions t
    WHERE t.user_id = _user_id
      AND to_char(t.occurred_on, 'YYYY-MM') = _month
      AND t.type = 'expense'
    GROUP BY t.category_id
  ),
  all_cats AS (
    SELECT DISTINCT COALESCE(b.category_id, tx.category_id) AS cid
    FROM budget_rows b FULL JOIN tx_rows tx ON tx.category_id = b.category_id
  )
  SELECT
    ac.cid,
    COALESCE(c.name, 'Uncategorized'),
    c.icon,
    c.color,
    COALESCE(c.type::text, 'expense'),
    COALESCE(br.planned_amount, 0),
    COALESCE(tx.actual_amount, 0)
  FROM all_cats ac
  LEFT JOIN pp_categories c  ON c.id = ac.cid AND c.user_id = _user_id
  LEFT JOIN budget_rows   br ON br.category_id = ac.cid
  LEFT JOIN tx_rows       tx ON tx.category_id = ac.cid
  ORDER BY COALESCE(c.sort_order, 99), COALESCE(c.name, 'Uncategorized');
$$;

-- คำนวณวันครบกำหนดถัดไปของ recurring payment
CREATE OR REPLACE FUNCTION public.pp_next_due(_start date, _freq text, _end date)
RETURNS date LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  d            date     := _start;
  td           date     := CURRENT_DATE;
  interval_val interval;
BEGIN
  interval_val := CASE _freq
    WHEN 'daily'     THEN interval '1 day'
    WHEN 'weekly'    THEN interval '1 week'
    WHEN 'biweekly'  THEN interval '2 weeks'
    WHEN 'monthly'   THEN interval '1 month'
    WHEN 'quarterly' THEN interval '3 months'
    WHEN 'biannual'  THEN interval '6 months'
    WHEN 'yearly'    THEN interval '1 year'
    ELSE interval '1 month'
  END;
  WHILE d < td LOOP d := d + interval_val; END LOOP;
  IF _end IS NOT NULL AND d > _end THEN RETURN NULL; END IF;
  RETURN d;
END;
$$;

-- ─── User Data Management ─────────────────────────────────────────────────────

-- ลบข้อมูลทั้งหมดและบัญชี (PDPA Right to Erasure)
-- ✅ Fixed 2026-04-30: แก้ลำดับ FK, profiles bug, เพิ่ม pp_budgets + pp_asset_lots
CREATE OR REPLACE FUNCTION public.delete_user_data_and_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

  DELETE FROM public.pp_split_participants
    WHERE split_id IN (SELECT id FROM public.pp_splits WHERE user_id = uid);
  DELETE FROM public.pp_split_payments      WHERE user_id = uid;
  DELETE FROM public.pp_splits              WHERE user_id = uid;
  DELETE FROM public.pp_transactions        WHERE user_id = uid;
  DELETE FROM public.pp_debts               WHERE user_id = uid;
  DELETE FROM public.pp_recurring           WHERE user_id = uid;
  DELETE FROM public.pp_budgets             WHERE user_id = uid;
  DELETE FROM public.pp_accounts            WHERE user_id = uid;
  UPDATE public.pp_categories SET parent_id = NULL WHERE user_id = uid;
  DELETE FROM public.pp_categories          WHERE user_id = uid;
  DELETE FROM public.pp_asset_lots          WHERE user_id = uid;
  DELETE FROM public.pp_asset_price_history WHERE user_id = uid;
  DELETE FROM public.pp_assets              WHERE user_id = uid;
  DELETE FROM public.pp_simulations         WHERE user_id = uid;
  DELETE FROM public.pp_people              WHERE user_id = uid;
  DELETE FROM public.user_roles             WHERE user_id = uid;
  DELETE FROM public.user_products          WHERE user_id = uid;
  DELETE FROM public.profiles               WHERE user_id = uid;
  DELETE FROM auth.users                    WHERE id = uid;
END;
$$;

-- รีเซ็ตข้อมูลการเงิน (เก็บบัญชีและสิทธิ์ไว้)
-- ✅ Fixed 2026-04-30: แก้ลำดับ FK, เพิ่ม pp_budgets + pp_asset_lots
CREATE OR REPLACE FUNCTION public.reset_user_financial_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

  DELETE FROM public.pp_split_participants
    WHERE split_id IN (SELECT id FROM public.pp_splits WHERE user_id = uid);
  DELETE FROM public.pp_split_payments      WHERE user_id = uid;
  DELETE FROM public.pp_splits              WHERE user_id = uid;
  DELETE FROM public.pp_transactions        WHERE user_id = uid;
  DELETE FROM public.pp_debts               WHERE user_id = uid;
  DELETE FROM public.pp_recurring           WHERE user_id = uid;
  DELETE FROM public.pp_budgets             WHERE user_id = uid;
  DELETE FROM public.pp_accounts            WHERE user_id = uid;
  UPDATE public.pp_categories SET parent_id = NULL WHERE user_id = uid;
  DELETE FROM public.pp_categories          WHERE user_id = uid;
  DELETE FROM public.pp_asset_lots          WHERE user_id = uid;
  DELETE FROM public.pp_asset_price_history WHERE user_id = uid;
  DELETE FROM public.pp_assets              WHERE user_id = uid;
  DELETE FROM public.pp_simulations         WHERE user_id = uid;
END;
$$;

-- ─── Admin RPCs ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_dashboard_metrics()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE _result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT jsonb_build_object(
    'total_users',    (SELECT COUNT(*) FROM auth.users),
    'new_users_7d',   (SELECT COUNT(*) FROM auth.users WHERE created_at > now() - interval '7 days'),
    'active_subs',    (SELECT COUNT(*) FROM public.user_products WHERE status = 'active' AND (expired_at IS NULL OR expired_at > now())),
    'trials',         (SELECT COUNT(*) FROM public.user_products WHERE status = 'trial' AND (expired_at IS NULL OR expired_at > now())),
    'total_products', (SELECT COUNT(*) FROM public.products WHERE is_active = true),
    'signups_30d', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('date', d::date, 'count', cnt) ORDER BY d), '[]'::jsonb)
      FROM (
        SELECT date_trunc('day', gs)::date AS d,
          (SELECT COUNT(*) FROM auth.users u WHERE date_trunc('day', u.created_at) = date_trunc('day', gs)) AS cnt
        FROM generate_series(now() - interval '29 days', now(), interval '1 day') gs
      ) s
    ),
    'top_products', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('slug', slug, 'name', name, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT p.slug, p.name, COUNT(up.id)::int AS cnt
        FROM public.products p LEFT JOIN public.user_products up ON up.product_id = p.id
        GROUP BY p.slug, p.name ORDER BY cnt DESC LIMIT 5
      ) tp
    )
  ) INTO _result;
  RETURN _result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  user_id           uuid,
  email             text,
  display_name      text,
  avatar_url        text,
  is_admin          boolean,
  created_at        timestamptz,
  last_sign_in_at   timestamptz,
  entitlement_count integer
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT u.id, u.email::text,
    COALESCE(p.display_name, split_part(u.email::text, '@', 1)),
    p.avatar_url, public.has_role(u.id, 'admin'), u.created_at, u.last_sign_in_at,
    (SELECT COUNT(*)::int FROM public.user_products up WHERE up.user_id = u.id)
  FROM auth.users u LEFT JOIN public.profiles p ON p.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_recent_activity(_limit integer)
RETURNS TABLE (
  id uuid, user_id uuid, user_email text, actor_id uuid, actor_email text,
  type activity_type, metadata jsonb, created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT a.id, a.user_id, u1.email::text, a.actor_id, u2.email::text,
         a.type, a.metadata, a.created_at
  FROM public.activity_log a
  LEFT JOIN auth.users u1 ON u1.id = a.user_id
  LEFT JOIN auth.users u2 ON u2.id = a.actor_id
  ORDER BY a.created_at DESC LIMIT _limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_entitlement(
  _user_id uuid, _product_id uuid,
  _status entitlement_status, _expired_at timestamptz
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  INSERT INTO public.user_products (user_id, product_id, status, expired_at)
  VALUES (_user_id, _product_id, _status, _expired_at)
  ON CONFLICT (user_id, product_id)
    DO UPDATE SET status = EXCLUDED.status, expired_at = EXCLUDED.expired_at
  RETURNING id INTO _id;
  INSERT INTO public.activity_log (user_id, actor_id, type, metadata)
  VALUES (_user_id, auth.uid(), 'entitlement_granted',
    jsonb_build_object('product_id', _product_id, 'status', _status));
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_entitlement(_user_product_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE _user_id uuid; _product_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT user_id, product_id INTO _user_id, _product_id
    FROM public.user_products WHERE id = _user_product_id;
  DELETE FROM public.user_products WHERE id = _user_product_id;
  INSERT INTO public.activity_log (user_id, actor_id, type, metadata)
  VALUES (_user_id, auth.uid(), 'entitlement_revoked',
    jsonb_build_object('product_id', _product_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_role(_user_id uuid, _make_admin boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _make_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_user_entitlements(_user_id uuid)
RETURNS TABLE (
  id uuid, product_id uuid, product_slug text, product_name text,
  status entitlement_status, purchased_at timestamptz, expired_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT up.id, up.product_id, p.slug, p.name, up.status, up.purchased_at, up.expired_at
  FROM public.user_products up JOIN public.products p ON p.id = up.product_id
  WHERE up.user_id = _user_id ORDER BY up.purchased_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_product_sort_order(
  product_ids uuid[], new_orders integer[]
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  FOR i IN 1 .. array_upper(product_ids, 1) LOOP
    UPDATE public.products SET sort_order = new_orders[i] WHERE id = product_ids[i];
  END LOOP;
END;
$$;

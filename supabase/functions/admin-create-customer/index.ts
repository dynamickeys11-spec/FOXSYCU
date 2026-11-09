import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

function secretKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!raw) throw new Error("SUPABASE_SECRET_KEYS is not configured");
  return JSON.parse(raw).default;
}

const db = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, secretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

async function requireAdmin(req: Request, client: ReturnType<typeof db>) {
  const header = req.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: role } = await client
    .from("admin_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("role", "admin")
    .maybeSingle();

  return role ? data.user : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, message: "Method not allowed" }, 405);

  const client = db();
  const admin = await requireAdmin(req, client);
  if (!admin) return json({ ok: false, message: "Admin authorization required" }, 403);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, message: "Invalid request" }, 400);
  }

  const email = String(body?.email || "").trim().toLowerCase();
  const fullName = String(body?.full_name || "").trim();
  const phone = String(body?.phone || "").trim() || null;
  const country = String(body?.country || "United States").trim() || "United States";
  const accountName = String(body?.account_name || "USD Savings Account").trim() || "USD Savings Account";
  const accountType = String(body?.account_type || "checking").trim().toLowerCase();
  const password = String(body?.password || "");

  if (!/^\S+@\S+\.\S+$/.test(email))
    return json({ ok: false, message: "Enter a valid customer email address" }, 400);
  if (!fullName) return json({ ok: false, message: "Customer name is required" }, 400);
  if (!["checking", "savings"].includes(accountType))
    return json({ ok: false, message: "Account type must be checking or savings" }, 400);
  if (password.length < 10 || password.length > 128)
    return json({ ok: false, message: "Temporary password must be 10-128 characters" }, 400);

  const rawCredit = body?.credit_details && typeof body.credit_details === "object"
    ? body.credit_details
    : {};

  const amount = Number(rawCredit?.amount ?? 0);
  if (!Number.isFinite(amount) || amount < 0)
    return json({ ok: false, message: "Initial credit amount cannot be negative" }, 400);

  const creditDetails = {
    ...rawCredit,
    amount: Math.round(amount * 100) / 100,
  };

  const { data: created, error: createError } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      preferred_name: fullName,
      phone,
      country,
      account_name: accountName,
      provisioned_by_admin: admin.id,
    },
  });

  if (createError || !created.user) {
    const message = createError?.message?.toLowerCase().includes("already")
      ? "A customer with this email already exists"
      : "Could not create the customer login";
    return json({ ok: false, message }, 400);
  }

  const userId = created.user.id;

  const { data: provisioned, error: provisionError } = await client.rpc(
    "admin_provision_customer_clean",
    {
      p_admin_id: admin.id,
      p_user_id: userId,
      p_full_name: fullName,
      p_email: email,
      p_phone: phone,
      p_country: country,
      p_account_name: accountName,
      p_account_type: accountType,
      p_credit_details: creditDetails,
    },
  );

  if (provisionError || !provisioned) {
    await client.auth.admin.deleteUser(userId);
    return json(
      {
        ok: false,
        message: provisionError?.message || "Customer setup could not be completed. No customer account was created.",
      },
      500,
    );
  }

  return json({
    ok: true,
    user_id: userId,
    email,
    account_id: provisioned.account_id,
    account_number_last4: provisioned.account_number_last4,
    reference: provisioned.reference,
    opening_balance: Number(provisioned.opening_balance || 0),
    final_balance: Number(provisioned.final_balance || 0),
    history_count: Number(provisioned.history_count || 0),
    history_inherited: Boolean(provisioned.history_inherited),
    initial_credit_transaction_id: provisioned.initial_credit_transaction_id || null,
  });
});

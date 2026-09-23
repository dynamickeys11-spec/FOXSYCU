import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
function secretKey(){const raw=Deno.env.get("SUPABASE_SECRET_KEYS");if(raw)return JSON.parse(raw).default;return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}
const db=()=>createClient(Deno.env.get("SUPABASE_URL")!,secretKey(),{auth:{autoRefreshToken:false,persistSession:false}});
async function requireAdmin(req:Request,client:ReturnType<typeof db>){const h=req.headers.get("Authorization")||"";const token=h.startsWith("Bearer ")?h.slice(7):"";if(!token)return null;const {data,error}=await client.auth.getUser(token);if(error||!data.user)return null;const {data:role}=await client.from("admin_roles").select("role").eq("user_id",data.user.id).eq("role","admin").maybeSingle();return role?data.user:null}
Deno.serve(async(req)=>{
if(req.method==="OPTIONS")return new Response("ok",{headers:cors});if(req.method!=="POST")return json({ok:false,message:"Method not allowed"},405);
const client=db();const admin=await requireAdmin(req,client);if(!admin)return json({ok:false,message:"Admin authorization required"},403);
let body:any;try{body=await req.json()}catch{return json({ok:false,message:"Invalid request"},400)}
const email=String(body?.email||"").trim().toLowerCase(),fullName=String(body?.full_name||"").trim(),phone=String(body?.phone||"").trim(),country=String(body?.country||"United States").trim()||"United States",accountName=String(body?.account_name||"USD Savings Account").trim()||"USD Savings Account",password=String(body?.password||""),openingBalance=Number(body?.opening_balance??0),reference=String(body?.reference||"").trim()||null;
if(!/^\S+@\S+\.\S+$/.test(email))return json({ok:false,message:"Enter a valid customer email address"},400);if(!fullName)return json({ok:false,message:"Customer name is required"},400);if(password.length<10||password.length>128)return json({ok:false,message:"Temporary password must be 10-128 characters"},400);if(!Number.isFinite(openingBalance)||openingBalance<0)return json({ok:false,message:"Opening balance cannot be negative"},400);
const {data:created,error:createError}=await client.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:fullName,preferred_name:fullName,phone:phone||null,country,account_name:accountName,provisioned_by_admin:admin.id}});
if(createError||!created.user){const message=createError?.message?.toLowerCase().includes("already")?"A customer with this email already exists":"Could not create the customer login";return json({ok:false,message},400)}
const userId=created.user.id;
const {data:provisioned,error:provisionError}=await client.rpc("admin_provision_customer",{p_admin_id:admin.id,p_user_id:userId,p_full_name:fullName,p_email:email,p_phone:phone||null,p_country:country,p_account_name:accountName,p_opening_balance:openingBalance,p_reference:reference});
if(provisionError||!provisioned){await client.auth.admin.deleteUser(userId);return json({ok:false,message:"Customer setup could not be completed. No customer account was created."},500)}
return json({ok:true,user_id:userId,email,account_id:provisioned.account_id,account_number_last4:provisioned.account_number_last4,reference:provisioned.reference,opening_balance:Number(provisioned.opening_balance||0),transaction_id:provisioned.transaction_id||null});
});
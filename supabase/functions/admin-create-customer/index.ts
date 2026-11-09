import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
function secretKey(){const raw=Deno.env.get("SUPABASE_SECRET_KEYS");if(!raw)throw new Error("SUPABASE_SECRET_KEYS is not configured");return JSON.parse(raw).default}
const db=()=>createClient(Deno.env.get("SUPABASE_URL")!,secretKey(),{auth:{autoRefreshToken:false,persistSession:false}});
async function requireAdmin(req:Request,client:ReturnType<typeof db>){const header=req.headers.get("Authorization")||"";const token=header.startsWith("Bearer ")?header.slice(7):"";if(!token)return null;const{data,error}=await client.auth.getUser(token);if(error||!data.user)return null;const{data:role}=await client.from("admin_roles").select("role").eq("user_id",data.user.id).eq("role","admin").maybeSingle();return role?data.user:null}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});if(req.method!=="POST")return json({ok:false,message:"Method not allowed"},405);
 let client:ReturnType<typeof db>;try{client=db()}catch{return json({ok:false,message:"Server configuration error"},500)}
 const admin=await requireAdmin(req,client);if(!admin)return json({ok:false,message:"Admin authorization required"},403);
 let body:any;try{body=await req.json()}catch{return json({ok:false,message:"Invalid request"},400)}
 const email=String(body?.email||"").trim().toLowerCase(),fullName=String(body?.full_name||"").trim(),phone=String(body?.phone||"").trim()||null,country=String(body?.country||"United States").trim()||"United States",accountName=String(body?.account_name||"USD Savings Account").trim()||"USD Savings Account",accountType=String(body?.account_type||"checking").trim().toLowerCase(),password=String(body?.password||""),accountCreatedDate=String(body?.account_created_date||"").trim();
 if(!/^\S+@\S+\\.\S+$/.test(email))return json({ok:false,message:"Enter a valid customer email address"},400);
 if(!fullName)return json({ok:false,message:"Customer name is required"},400);
 if(!["checking","savings"].includes(accountType))return json({ok:false,message:"Account type must be checking or savings"},400);
 if(password.length<10||password.length>128)return json({ok:false,message:"Temporary password must be 10-128 characters"},400);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(accountCreatedDate))return json({ok:false,message:"Account opening date is required"},400);
 const rawCredit=body?.credit_details&&typeof body.credit_details==="object"?body.credit_details:{},amount=Number(rawCredit?.amount??0);
 if(!Number.isFinite(amount)||amount<0)return json({ok:false,message:"Initial credit amount cannot be negative"},400);
 const creditDetails={...rawCredit,amount:Math.round(amount*100)/100};
 const rawPolicy=body?.history_policy&&typeof body.history_policy==="object"?body.history_policy:{};
 const includeHistory=rawPolicy.include_history===true;
 const period=rawPolicy.period_months==null?null:Number(rawPolicy.period_months);
 const customStart=String(rawPolicy.start_date||"").trim()||null;
 const customEnd=String(rawPolicy.end_date||"").trim()||null;
 const supportedPeriods=[3,6,12,24,36,60];
 if(includeHistory){
   if(period!==null&&(!supportedPeriods.includes(period)||customStart||customEnd))return json({ok:false,message:"Choose 3, 6, 12, 24, 36 or 60 months, or use a custom date range"},400);
   if(period===null&&(!customStart||!customEnd||!/^\d{4}-\d{2}-\d{2}$/.test(customStart)||!/^\d{4}-\d{2}-\d{2}$/.test(customEnd)||customStart>customEnd||customEnd>accountCreatedDate))return json({ok:false,message:"Enter a valid custom history range ending on or before the account opening date"},400);
 }else if(period!==null||customStart||customEnd){return json({ok:false,message:"History period must be empty when historical activity is disabled"},400)}
 const{data:created,error:createError}=await client.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:fullName,preferred_name:fullName,phone,country,account_name:accountName,provisioned_by_admin:admin.id}});
 if(createError||!created.user){const message=createError?.message?.toLowerCase().includes("already")?"A customer with this email already exists":"Could not create the customer login";return json({ok:false,message},400)}
 const userId=created.user.id;
 const{data:provisioned,error:provisionError}=await client.rpc("admin_provision_customer_clean",{p_admin_id:admin.id,p_user_id:userId,p_full_name:fullName,p_email:email,p_phone:phone,p_country:country,p_account_name:accountName,p_account_type:accountType,p_credit_details:creditDetails,p_account_created_date:accountCreatedDate});
 if(provisionError||!provisioned){await client.auth.admin.deleteUser(userId);return json({ok:false,message:provisionError?.message||"Customer setup could not be completed. No customer account was created."},500)}
 const{data:policy,error:policyError}=await client.rpc("admin_set_account_history_policy",{p_admin_id:admin.id,p_account_id:provisioned.account_id,p_include_history:includeHistory,p_history_period_months:period,p_history_start_date:customStart,p_history_end_date:customEnd});
 if(policyError){return json({ok:false,message:"The account was created, but its history policy could not be saved. Contact support before adding any historical records.",account_id:provisioned.account_id,user_id:userId,policy_error:policyError.message},500)}
 return json({ok:true,user_id:userId,email,account_id:provisioned.account_id,account_number_last4:provisioned.account_number_last4,reference:provisioned.reference,opening_balance:Number(provisioned.opening_balance||0),final_balance:Number(provisioned.final_balance||0),history_count:Number(provisioned.history_count||0),history_inherited:Boolean(provisioned.history_inherited),history_policy:policy,initial_credit_transaction_id:provisioned.initial_credit_transaction_id||null,account_created_date:provisioned.account_created_date});
});
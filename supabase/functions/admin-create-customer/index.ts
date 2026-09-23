import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const round2=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
function secretKey(){const raw=Deno.env.get("SUPABASE_SECRET_KEYS");if(raw)return JSON.parse(raw).default;return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}
const db=()=>createClient(Deno.env.get("SUPABASE_URL")!,secretKey(),{auth:{autoRefreshToken:false,persistSession:false}});

type HistoryRow={reference:string;transaction_type:string;direction:"credit"|"debit";amount:number;fee:number;status:"completed"|"pending"|"failed"|"reversed";counterparty:string;description:string;memo:string;effective_date:string;initiated_at:string;posted_at:string|null;metadata:Record<string,unknown>};

function dateIso(year:number,month:number,day:number,hour=12){
  return new Date(Date.UTC(year,month-1,day,hour,0,0)).toISOString();
}

function buildReconciledHistory(target:number){
  const BASE_BALANCE=5000000;
  const BASE_OPENING=2679325;
  const factor=BASE_BALANCE===0?0:target/BASE_BALANCE;
  const rows:HistoryRow[]=[];
  let monthIndex=0;

  const push=(year:number,month:number,day:number,direction:"credit"|"debit",baseAmount:number,type:string,category:string,description:string,counterparty:string,refPrefix:string)=>{
    const amount=round2(Math.abs(baseAmount)*factor);
    const iso=dateIso(year,month,day, direction==="credit"?9:14);
    rows.push({
      reference:`${refPrefix}-${year}${String(month).padStart(2,"0")}-${String(monthIndex+1).padStart(4,"0")}`,
      transaction_type:type,direction,amount,fee:0,status:"completed",counterparty,description,
      memo:"Synthetic historical activity",effective_date:iso.slice(0,10),initiated_at:iso,
      posted_at:iso,metadata:{synthetic:true,demo_data:true,category,historical_template:"FNCU-2021-2026-v1"}
    });
  };

  for(let year=2021;year<=2026;year++){
    const first=year===2021?4:1;
    const last=year===2026?9:12;
    for(let month=first;month<=last;month++){
      const baseCredit=42000+(monthIndex%6)*8500+(monthIndex%4)*1250;
      const debit=18000+(monthIndex%5)*4200+(monthIndex%3)*900;
      const cardMonths=new Set([5,17,29,41,53,65]);
      const isCardMonth=cardMonths.has(monthIndex);
      const credit=isCardMonth?baseCredit-debit+2000:baseCredit;
      const effectiveDebit=isCardMonth?2000:debit;

      push(year,month,1,"credit",credit,monthIndex%4===0?"ACH_CREDIT":"TRANSFER",monthIndex%4===0?"Income":"Client settlement",monthIndex%4===0?"Business proceeds received":"Client settlement received",monthIndex%4===0?"External funding source":"Client settlement","CR");
      push(year,month,6,"debit",effectiveDebit,isCardMonth?"CARD_PURCHASE":monthIndex%3===0?"CARD_PURCHASE":"TRANSFER",isCardMonth?"Card / merchant payment":monthIndex%3===0?"Card / merchant payment":"Outgoing transfer",isCardMonth?"Everyday card purchase":monthIndex%3===0?"Card and merchant payments":"Outgoing account transfer",isCardMonth?"Merchant network": "External beneficiary","DR");

      if(monthIndex%9===0){
        const largeDebit=35000+monthIndex*250;
        push(year,month,12,"debit",largeDebit,"WIRE_OUT","Large transfer","Scheduled portfolio transfer","Investment account","TRF");
      }
      if(monthIndex%7===3){
        const settlement=12500+monthIndex*175;
        push(year,month,18,"credit",settlement,"ACH_CREDIT","Settlement","Additional client settlement","Client settlement account","SET");
      }
      monthIndex++;
    }
  }

  const recentBase=[
    {ref:"DEP-202609-0001",dir:"credit" as const,amount:5000,status:"pending" as const,date:dateIso(2026,9,8,11),type:"ACH_CREDIT",desc:"Incoming funding under review",cp:"External funding source",cat:"Pending funding"},
    {ref:"PAY-202609-0002",dir:"debit" as const,amount:5000,status:"pending" as const,date:dateIso(2026,9,9,15),type:"CARD_PURCHASE",desc:"Card payment authorization",cp:"Merchant network",cat:"Pending card payment"},
    {ref:"DEP-202608-0017",dir:"credit" as const,amount:7200,status:"failed" as const,date:dateIso(2026,8,20,10),type:"ACH_CREDIT",desc:"External funding attempt",cp:"External funding source",cat:"Failed deposit"},
    {ref:"PAY-202608-0018",dir:"debit" as const,amount:7200,status:"failed" as const,date:dateIso(2026,8,21,13),type:"CARD_PURCHASE",desc:"Merchant payment declined",cp:"Merchant network",cat:"Failed payment"},
    {ref:"REV-202607-0031",dir:"credit" as const,amount:9100,status:"reversed" as const,date:dateIso(2026,7,14,9),type:"ACH_CREDIT",desc:"Reversed incoming transfer",cp:"External funding source",cat:"Reversal"},
    {ref:"REV-202607-0032",dir:"debit" as const,amount:9100,status:"reversed" as const,date:dateIso(2026,7,15,14),type:"TRANSFER",desc:"Reversed account transfer",cp:"External beneficiary",cat:"Reversal"},
  ];
  for(const x of recentBase){
    rows.push({
      reference:x.ref,transaction_type:x.type,direction:x.dir,amount:round2(x.amount*factor),fee:0,status:x.status,
      counterparty:x.cp,description:x.desc,memo:"Synthetic historical activity",effective_date:x.date.slice(0,10),
      initiated_at:x.date,posted_at:null,metadata:{synthetic:true,demo_data:true,category:x.cat,historical_template:"FNCU-2021-2026-v1"}
    });
  }

  const opening=round2(BASE_OPENING*factor);
  let running=opening;
  for(const row of rows){
    if(row.status==="completed") running=round2(running+(row.direction==="credit"?row.amount:-row.amount));
  }
  const drift=round2(target-running);
  const last=rows.filter(r=>r.status==="completed").at(-1);
  if(last && drift!==0){
    last.amount=round2(last.amount+(last.direction==="credit"?drift:-drift));
  }
  return {opening,rows,templateBaseBalance:BASE_BALANCE,finalBalance:target,reconciliationDriftApplied:drift};
}

async function requireAdmin(req:Request,client:ReturnType<typeof db>){
  const h=req.headers.get("Authorization")||"";
  const token=h.startsWith("Bearer ")?h.slice(7):"";
  if(!token)return null;
  const {data,error}=await client.auth.getUser(token);
  if(error||!data.user)return null;
  const {data:role}=await client.from("admin_roles").select("role").eq("user_id",data.user.id).eq("role","admin").maybeSingle();
  return role?data.user:null;
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({ok:false,message:"Method not allowed"},405);

  const client=db();
  const admin=await requireAdmin(req,client);
  if(!admin)return json({ok:false,message:"Admin authorization required"},403);

  let body:any;
  try{body=await req.json()}catch{return json({ok:false,message:"Invalid request"},400)}

  const email=String(body?.email||"").trim().toLowerCase();
  const fullName=String(body?.full_name||"").trim();
  const phone=String(body?.phone||"").trim();
  const country=String(body?.country||"United States").trim()||"United States";
  const accountName=String(body?.account_name||"USD Savings Account").trim()||"USD Savings Account";
  const password=String(body?.password||"");
  const openingBalance=Number(body?.opening_balance??0);
  const reference=String(body?.reference||"").trim()||null;

  if(!/^\S+@\S+\.\S+$/.test(email))return json({ok:false,message:"Enter a valid customer email address"},400);
  if(!fullName)return json({ok:false,message:"Customer name is required"},400);
  if(password.length<10||password.length>128)return json({ok:false,message:"Temporary password must be 10-128 characters"},400);
  if(!Number.isFinite(openingBalance)||openingBalance<0)return json({ok:false,message:"Opening balance cannot be negative"},400);

  const history=buildReconciledHistory(round2(openingBalance));
  const {data:created,error:createError}=await client.auth.admin.createUser({
    email,password,email_confirm:true,
    user_metadata:{full_name:fullName,preferred_name:fullName,phone:phone||null,country,account_name:accountName,provisioned_by_admin:admin.id}
  });
  if(createError||!created.user){
    const message=createError?.message?.toLowerCase().includes("already")?"A customer with this email already exists":"Could not create the customer login";
    return json({ok:false,message},400);
  }

  const userId=created.user.id;
  const {data:provisioned,error:provisionError}=await client.rpc("admin_provision_customer",{
    p_admin_id:admin.id,p_user_id:userId,p_full_name:fullName,p_email:email,p_phone:phone||null,
    p_country:country,p_account_name:accountName,p_opening_balance:history.opening,p_reference:reference,p_history:history.rows
  });

  if(provisionError||!provisioned){
    await client.auth.admin.deleteUser(userId);
    return json({ok:false,message:"Customer setup could not be completed. No customer account was created."},500);
  }

  return json({
    ok:true,user_id:userId,email,account_id:provisioned.account_id,
    account_number_last4:provisioned.account_number_last4,reference:provisioned.reference,
    opening_balance:Number(provisioned.opening_balance||0),final_balance:Number(provisioned.final_balance||0),
    history_count:Number(provisioned.history_count||0),posted_history_count:Number(provisioned.posted_history_count||0),
    reconciliation_drift_applied:history.reconciliationDriftApplied
  });
});
"use strict";

/* Stage 7.4 - Supabase frontend integration.
   Adds account auth, private Master CV storage, retrieval, and tailored-version history. */

const S74_SUPABASE_URL="https://ugnvvrgztvwuinhhipjs.supabase.co";
const S74_PUBLISHABLE_KEY="sb_publishable_bjdj6_80JOUqL27b7Qdk-A_6p6E2zpU";
const S74_BUCKET="cv-files";
const S74_PROFILE_KEY="irelandJobHuntOS_profileV1";
const S74_APP_KEY="irelandJobHuntOS";
let s74Client=null;
let s74Session=null;
let s74ActiveMaster=null;

const s74q=id=>document.getElementById(id);
const s74esc=value=>String(value||"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const s74safeName=name=>String(name||"cv").replace(/[^a-z0-9._-]+/gi,"-").replace(/-+/g,"-");

function s74LoadLibrary(){
  if(window.supabase?.createClient) return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const existing=[...document.scripts].find(s=>s.src.includes("@supabase/supabase-js"));
    if(existing){existing.addEventListener("load",resolve,{once:true});existing.addEventListener("error",reject,{once:true});return;}
    const script=document.createElement("script");
    script.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
    script.async=true;
    script.onload=resolve;
    script.onerror=()=>reject(new Error("Could not load the Supabase client library."));
    document.head.appendChild(script);
  });
}

async function s74GetClient(){
  if(s74Client) return s74Client;
  await s74LoadLibrary();
  s74Client=window.supabase.createClient(S74_SUPABASE_URL,S74_PUBLISHABLE_KEY,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  return s74Client;
}

function s74ReadLocalProfile(){
  try{return JSON.parse(localStorage.getItem(S74_PROFILE_KEY)||"{}");}catch{return {};}
}
function s74ReadJobs(){
  try{const state=JSON.parse(localStorage.getItem(S74_APP_KEY)||"{}");return Array.isArray(state.jobs)?state.jobs:[];}catch{return [];}
}

function s74EnsureStyles(){
  if(s74q("stage74Styles"))return;
  const style=document.createElement("style");style.id="stage74Styles";
  style.textContent=`
  .s74-panel{border-color:rgba(40,209,124,.24)}.s74-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.s74-auth-form{display:grid;grid-template-columns:1fr 1fr auto auto;gap:10px;align-items:end}.s74-account{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}.s74-status{font-size:11px;color:var(--muted);margin-top:8px;line-height:1.5}.s74-status.good{color:var(--accent)}.s74-status.bad{color:#ff8d8d}.s74-master-card{display:grid;gap:9px;padding:14px;border:1px solid var(--border);border-radius:12px;background:var(--surface2)}.s74-master-head{display:flex;justify-content:space-between;gap:12px;align-items:start}.s74-master-meta{font-size:11px;color:var(--muted);line-height:1.5}.s74-actions{display:flex;gap:8px;flex-wrap:wrap}.s74-history{display:grid;gap:8px}.s74-version{display:grid;grid-template-columns:1fr auto;gap:12px;padding:11px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface2)}.s74-version small{display:block;color:var(--muted);margin-top:3px}.s74-upload input[type=file]{width:100%}.s74-disabled{opacity:.55;pointer-events:none}.s74-badge{display:inline-flex;padding:4px 7px;border-radius:999px;border:1px solid rgba(40,209,124,.3);color:var(--accent);font-size:10px}.s74-cloud-tailor{margin-top:12px;border-top:1px solid var(--border);padding-top:12px}@media(max-width:850px){.s74-grid{grid-template-columns:1fr}.s74-auth-form{grid-template-columns:1fr 1fr}}@media(max-width:600px){.s74-auth-form{grid-template-columns:1fr}.s74-version{grid-template-columns:1fr}.s74-actions .btn,.s74-actions .secondary-btn{flex:1}}
  `;
  document.head.appendChild(style);
}

function s74CreateProfilePanels(){
  const page=s74q("profilePage"); if(!page||s74q("s74CloudPanel"))return false;
  s74EnsureStyles();
  const layout=page.querySelector(".profile-layout")||page;
  const wrap=document.createElement("div");wrap.id="s74CloudPanel";wrap.className="s74-grid";
  wrap.innerHTML=`
    <section class="panel s74-panel">
      <div class="eyebrow">CLOUD ACCOUNT</div><h3>Sign in to sync private CVs</h3>
      <div id="s74SignedOut">
        <div class="s74-auth-form">
          <div class="field"><label for="s74Email">Email</label><input id="s74Email" type="email" autocomplete="email" placeholder="you@example.com"></div>
          <div class="field"><label for="s74Password">Password</label><input id="s74Password" type="password" autocomplete="current-password" minlength="6" placeholder="At least 6 characters"></div>
          <button class="btn" id="s74SignIn" type="button">Sign in</button>
          <button class="secondary-btn" id="s74SignUp" type="button">Create account</button>
        </div>
        <div class="s74-status" id="s74AuthStatus">Your CV files are private and protected by your Supabase account.</div>
      </div>
      <div id="s74SignedIn" hidden>
        <div class="s74-account"><div><span class="s74-badge">SIGNED IN</span><h3 id="s74AccountEmail" style="margin:8px 0 0"></h3></div><button class="secondary-btn" id="s74SignOut" type="button">Sign out</button></div>
        <div class="s74-status good">Cloud CV storage is connected for this account.</div>
      </div>
    </section>
    <section class="panel s74-panel" id="s74MasterPanel">
      <div class="eyebrow">MASTER CV</div><h3>Private source document</h3>
      <p class="s74-status">Upload the CV you want the tailoring system to preserve. The original file remains unchanged and is used as the source of truth.</p>
      <div id="s74MasterBody"><div class="s74-status">Sign in to upload or retrieve your Master CV.</div></div>
    </section>`;
  layout.insertBefore(wrap,layout.firstChild);
  s74q("s74SignIn")?.addEventListener("click",()=>s74Auth("signin"));
  s74q("s74SignUp")?.addEventListener("click",()=>s74Auth("signup"));
  s74q("s74SignOut")?.addEventListener("click",s74SignOut);
  return true;
}

function s74AuthMessage(message,bad=false){const el=s74q("s74AuthStatus");if(el){el.textContent=message;el.className=`s74-status${bad?" bad":" good"}`;}}

async function s74Auth(mode){
  const email=s74q("s74Email")?.value.trim();const password=s74q("s74Password")?.value||"";
  if(!email||password.length<6){s74AuthMessage("Enter a valid email and a password of at least 6 characters.",true);return;}
  try{
    const client=await s74GetClient();
    s74AuthMessage(mode==="signup"?"Creating account…":"Signing in…");
    const result=mode==="signup"
      ?await client.auth.signUp({email,password})
      :await client.auth.signInWithPassword({email,password});
    if(result.error)throw result.error;
    if(mode==="signup"&&!result.data.session){s74AuthMessage("Account created. Check your email if confirmation is required, then return here and sign in.");}
    else{s74AuthMessage("Signed in successfully.");}
  }catch(error){s74AuthMessage(error.message||"Authentication failed.",true);}
}

async function s74SignOut(){
  try{const client=await s74GetClient();await client.auth.signOut();}catch(error){console.error(error);}
}

async function s74RefreshSession(sessionOverride){
  const client=await s74GetClient();
  if(sessionOverride!==undefined)s74Session=sessionOverride;
  else{const {data}=await client.auth.getSession();s74Session=data.session;}
  const signedIn=Boolean(s74Session?.user);
  if(s74q("s74SignedOut"))s74q("s74SignedOut").hidden=signedIn;
  if(s74q("s74SignedIn"))s74q("s74SignedIn").hidden=!signedIn;
  if(s74q("s74AccountEmail"))s74q("s74AccountEmail").textContent=s74Session?.user?.email||"Signed-in user";
  if(signedIn){await s74EnsureCloudProfile();await Promise.all([s74LoadMaster(),s74LoadHistory()]);}
  else{s74ActiveMaster=null;s74RenderMaster();s74RenderTailorCloud();}
}

async function s74EnsureCloudProfile(){
  if(!s74Session?.user)return;
  const client=await s74GetClient();const local=s74ReadLocalProfile();
  const {error}=await client.from("job_hunt_profiles").upsert({user_id:s74Session.user.id,display_name:local.fullName||null,updated_at:new Date().toISOString()},{onConflict:"user_id"});
  if(error)console.warn("Cloud profile sync skipped",error);
}

function s74FileTypeAllowed(file){
  const lower=file.name.toLowerCase();return lower.endsWith(".pdf")||lower.endsWith(".docx")||lower.endsWith(".txt");
}

async function s74UploadMaster(file){
  if(!s74Session?.user){alert("Sign in before uploading a Master CV.");return;}
  if(!file||!s74FileTypeAllowed(file)){alert("Please choose a PDF, DOCX or TXT CV.");return;}
  if(file.size>10*1024*1024){alert("Master CV must be 10 MB or smaller.");return;}
  const status=s74q("s74MasterStatus");if(status){status.textContent=`Uploading ${file.name}…`;status.className="s74-status";}
  const client=await s74GetClient();const uid=s74Session.user.id;
  const path=`${uid}/master/${Date.now()}-${s74safeName(file.name)}`;
  try{
    let extracted="";
    if(typeof extractCvText==="function"){
      try{extracted=await extractCvText(file);}catch(error){console.warn("CV text extraction skipped",error);}
    }
    const upload=await client.storage.from(S74_BUCKET).upload(path,file,{upsert:false,contentType:file.type||undefined});
    if(upload.error)throw upload.error;
    const localProfile=s74ReadLocalProfile();
    const deactivate=await client.from("master_cvs").update({is_active:false,updated_at:new Date().toISOString()}).eq("user_id",uid).eq("is_active",true);
    if(deactivate.error)throw deactivate.error;
    const insert=await client.from("master_cvs").insert({
      user_id:uid,file_name:file.name,storage_path:path,mime_type:file.type||null,file_size:file.size,
      extracted_text:extracted||null,structured_data:localProfile,is_active:true
    }).select().single();
    if(insert.error)throw insert.error;
    s74ActiveMaster=insert.data;
    if(extracted&&s74q("profile_resumeText")&&!s74q("profile_resumeText").value.trim())s74q("profile_resumeText").value=extracted;
    s74RenderMaster();s74RenderTailorCloud();
  }catch(error){
    console.error(error);if(status){status.textContent=error.message||"Upload failed.";status.className="s74-status bad";}
    try{await client.storage.from(S74_BUCKET).remove([path]);}catch{}
  }
}

async function s74LoadMaster(){
  if(!s74Session?.user)return;
  const client=await s74GetClient();
  const {data,error}=await client.from("master_cvs").select("*").eq("user_id",s74Session.user.id).eq("is_active",true).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(error){console.error(error);return;}
  s74ActiveMaster=data||null;s74RenderMaster();s74RenderTailorCloud();
}

function s74RenderMaster(){
  const host=s74q("s74MasterBody");if(!host)return;
  if(!s74Session?.user){host.innerHTML='<div class="s74-status">Sign in to upload or retrieve your Master CV.</div>';return;}
  if(!s74ActiveMaster){
    host.innerHTML=`<div class="s74-upload"><div class="field"><label for="s74MasterFile">Choose Master CV</label><input id="s74MasterFile" type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"></div><button class="btn" id="s74UploadMaster" type="button">Upload Master CV</button><div class="s74-status" id="s74MasterStatus">PDF, DOCX or TXT · Maximum 10 MB.</div></div>`;
  }else{
    const date=new Date(s74ActiveMaster.created_at).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});
    const size=s74ActiveMaster.file_size?`${Math.max(1,Math.round(Number(s74ActiveMaster.file_size)/1024))} KB`:"";
    host.innerHTML=`<div class="s74-master-card"><div class="s74-master-head"><div><strong>${s74esc(s74ActiveMaster.file_name)}</strong><div class="s74-master-meta">Uploaded ${s74esc(date)}${size?` · ${s74esc(size)}`:""}<br>Original file is preserved unchanged.</div></div><span class="s74-badge">ACTIVE MASTER</span></div><div class="s74-actions"><button class="secondary-btn" id="s74ViewMaster" type="button">Open Master CV</button><label class="btn" for="s74MasterFile">Replace Master CV</label><input id="s74MasterFile" style="display:none" type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"></div><div class="s74-status" id="s74MasterStatus"></div></div>`;
  }
  s74q("s74UploadMaster")?.addEventListener("click",()=>{const f=s74q("s74MasterFile")?.files?.[0];if(f)s74UploadMaster(f);});
  s74q("s74MasterFile")?.addEventListener("change",event=>{const f=event.target.files?.[0];if(f&&s74ActiveMaster)s74UploadMaster(f);});
  s74q("s74ViewMaster")?.addEventListener("click",s74OpenMaster);
}

async function s74OpenMaster(){
  if(!s74ActiveMaster)return;
  const client=await s74GetClient();const {data,error}=await client.storage.from(S74_BUCKET).createSignedUrl(s74ActiveMaster.storage_path,120);
  if(error){alert(error.message);return;}window.open(data.signedUrl,"_blank","noopener,noreferrer");
}

function s74EnsureTailorCloudPanel(){
  const page=s74q("tailorPage");if(!page||s74q("s74TailorCloud"))return false;
  const section=document.createElement("section");section.className="panel s74-panel s74-cloud-tailor";section.id="s74TailorCloud";
  section.innerHTML='<div class="eyebrow">CLOUD CV VERSIONS</div><h3>Master CV & tailored history</h3><div id="s74TailorCloudBody" class="s74-status">Sign in from Profile to connect private CV storage.</div>';
  page.appendChild(section);s74RenderTailorCloud();return true;
}

function s74RenderTailorCloud(){
  const host=s74q("s74TailorCloudBody");if(!host)return;
  if(!s74Session?.user){host.innerHTML='Sign in from <strong>Profile</strong> to connect private CV storage.';return;}
  if(!s74ActiveMaster){host.innerHTML='Upload a <strong>Master CV</strong> from Profile before saving tailored versions.';return;}
  host.innerHTML=`<div class="s74-master-card"><div><span class="s74-badge">MASTER SOURCE</span><strong style="display:block;margin-top:7px">${s74esc(s74ActiveMaster.file_name)}</strong><div class="s74-master-meta">This original file remains untouched.</div></div><div class="s74-actions"><button class="btn" id="s74SaveTailored" type="button">Save Current Tailored Version</button><button class="secondary-btn" id="s74RefreshHistory" type="button">Refresh history</button></div></div><div style="margin-top:12px"><h3>Saved tailored versions</h3><div class="s74-history" id="s74History"><div class="s74-status">Loading…</div></div></div>`;
  s74q("s74SaveTailored")?.addEventListener("click",s74SaveTailoredVersion);s74q("s74RefreshHistory")?.addEventListener("click",s74LoadHistory);s74LoadHistory();
}

async function s74SaveTailoredVersion(){
  if(!s74Session?.user||!s74ActiveMaster){alert("Sign in and upload a Master CV first.");return;}
  const select=s74q("s7JobSelect");const jobId=select?.value;const job=s74ReadJobs().find(j=>j.id===jobId);
  if(!job){alert("Choose a saved job and generate the tailored CV first.");return;}
  const model=window.__s73PreserveModel||window.__s72Model;
  let text="";
  if(window.__s73PreserveText)text=window.__s73PreserveText;
  else if(model&&typeof s72Text==="function")text=s72Text(model);
  else text=s74q("s73Preview")?.innerText||s74q("s72Preview")?.innerText||"";
  if(text.trim().length<80){alert("Generate the tailored CV before saving a cloud version.");return;}
  const client=await s74GetClient();const uid=s74Session.user.id;
  const stem=`${s74safeName(job.position||"tailored-cv")}-${s74safeName(job.company||"company")}-${Date.now()}`;
  const path=`${uid}/tailored/${stem}.txt`;
  const blob=new Blob([text],{type:"text/plain;charset=utf-8"});
  try{
    const upload=await client.storage.from(S74_BUCKET).upload(path,blob,{contentType:"text/plain",upsert:false});if(upload.error)throw upload.error;
    const manifest={
      source_master_cv_id:s74ActiveMaster.id,
      preserve_first:true,
      summary_tailored:Boolean(s74q("s73TailorSummary")?.checked),
      skills_reordered:Boolean(s74q("s73ReorderSkills")?.checked),
      protected_sections:["employment","job_titles","dates","education","certifications","projects"]
    };
    const insert=await client.from("tailored_cvs").insert({
      user_id:uid,master_cv_id:s74ActiveMaster.id,job_id:String(job.id||""),company:job.company||null,position:job.position||null,
      file_name:`${job.position||"Tailored CV"} - ${job.company||"Company"}.txt`,storage_path:path,tailoring_mode:"conservative",change_manifest:manifest
    });
    if(insert.error)throw insert.error;
    await s74LoadHistory();
  }catch(error){console.error(error);alert(error.message||"Could not save the tailored version.");try{await client.storage.from(S74_BUCKET).remove([path]);}catch{}}
}

async function s74LoadHistory(){
  const host=s74q("s74History");if(!s74Session?.user){if(host)host.innerHTML='<div class="s74-status">Sign in to view history.</div>';return;}
  const client=await s74GetClient();const {data,error}=await client.from("tailored_cvs").select("*").eq("user_id",s74Session.user.id).order("created_at",{ascending:false}).limit(20);
  if(error){if(host)host.innerHTML=`<div class="s74-status bad">${s74esc(error.message)}</div>`;return;}
  if(!host)return;if(!data?.length){host.innerHTML='<div class="s74-status">No cloud-tailored versions saved yet.</div>';return;}
  host.innerHTML=data.map(row=>{const date=new Date(row.created_at).toLocaleString();return `<div class="s74-version"><div><strong>${s74esc(row.position||"Tailored CV")}${row.company?` — ${s74esc(row.company)}`:""}</strong><small>${s74esc(date)} · Preserve-first source ${s74esc(String(row.master_cv_id).slice(0,8))}…</small></div><button class="secondary-btn" type="button" data-s74-open="${s74esc(row.storage_path||"")}">Open</button></div>`;}).join("");
  host.querySelectorAll("[data-s74-open]").forEach(button=>button.addEventListener("click",()=>s74OpenPath(button.dataset.s74Open)));
}

async function s74OpenPath(path){
  if(!path)return;const client=await s74GetClient();const {data,error}=await client.storage.from(S74_BUCKET).createSignedUrl(path,120);if(error){alert(error.message);return;}window.open(data.signedUrl,"_blank","noopener,noreferrer");
}

async function s74Init(){
  s74CreateProfilePanels();s74EnsureTailorCloudPanel();
  try{
    const client=await s74GetClient();
    const {data}=await client.auth.getSession();await s74RefreshSession(data.session);
    client.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>s74RefreshSession(session),0);});
  }catch(error){console.error(error);s74AuthMessage("Could not connect to cloud CV storage.",true);}
  let tries=0;const timer=setInterval(()=>{tries++;s74CreateProfilePanels();s74EnsureTailorCloudPanel();if(tries>40)clearInterval(timer);},200);
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",s74Init);else s74Init();

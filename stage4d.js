"use strict";

/* Stage 4D - Job-specific ATS Checker.
   Compares a saved Profile CV or uploaded tailored PDF against one saved/analyzed job.
   Browser-only; reuses the existing PDF extractor from the Profile workflow. */
(function stage4dJobSpecificAtsChecker(){
  const PROFILE_KEY="irelandJobHuntOS_profileV1";
  const APP_KEY="irelandJobHuntOS";
  const STOP=new Set("the a an and or to of in on for with from by as at is are be this that you your our we they it role job work working required preferred desirable essential have has ability strong excellent good knowledge experience skills skill years year within across using use provide support manage management responsible responsibilities candidate company opportunity looking including related relevant successful must should can who their through into about".split(" "));
  let uploadedPdfText="";
  let uploadedPdfName="";

  const q=id=>document.getElementById(id);
  const uniq=values=>[...new Set(values.filter(Boolean))];
  const split=value=>String(value||"").split(/\n|,|\|/).map(v=>v.trim()).filter(Boolean);
  const esc=value=>String(value||"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const norm=value=>String(value||"").toLowerCase().replace(/[^a-z0-9+#. ]/g," ").replace(/\s+/g," ").trim();
  const tokens=value=>norm(value).split(" ").filter(v=>v.length>2&&!STOP.has(v));

  function readProfile(){try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||"{}");}catch{return {};}}
  function readJobs(){try{const state=JSON.parse(localStorage.getItem(APP_KEY)||"{}");return Array.isArray(state.jobs)?state.jobs:[];}catch{return [];}}
  function profileText(){const p=readProfile();return [p.fullName,p.location,p.yearsExperience,p.targetRoles,p.industries,p.workAuthorisation,p.drivingLicence,p.languages,p.education,p.certifications,p.professionalSkills,p.softSkills,p.experienceSummary,p.resumeText].filter(Boolean).join("\n");}

  function valueAfter(notes,label){
    const m=String(notes||"").match(new RegExp(`${label}:\\s*([^\\n]+)`,"i"));
    return m?m[1].trim():"";
  }
  function analyzerData(job){
    const notes=String(job?.notes||"");
    const requirements=split(valueAfter(notes,"Key requirements")).filter(v=>!/none explicitly detected/i.test(v));
    const qualifications=split(valueAfter(notes,"Qualifications")).filter(v=>!/none explicitly detected/i.test(v));
    const keywords=split(valueAfter(notes,"ATS keywords")).filter(v=>!/none detected/i.test(v));
    const requiredSkills=Array.isArray(job?.requiredSkills)?job.requiredSkills:split(job?.requiredSkills||"");
    return {requirements,qualifications,keywords,requiredSkills};
  }

  function classifyRequirements(items){
    const required=[],preferred=[],unclear=[];
    items.forEach(item=>{
      if(/\b(preferred|desirable|nice to have|advantage|bonus)\b/i.test(item)) preferred.push(item);
      else if(/\b(required|essential|must|mandatory|minimum)\b/i.test(item)) required.push(item);
      else unclear.push(item);
    });
    return {required,preferred,unclear};
  }

  function match(item,source){
    const target=norm(item), hay=norm(source);
    if(!target||!hay) return false;
    if(hay.includes(target)) return true;
    const words=tokens(item);
    if(!words.length) return false;
    return words.filter(w=>hay.includes(w)).length/words.length>=0.65;
  }

  function coverage(items,source){
    const set=uniq(items);
    if(!set.length) return {score:null,matched:[],missing:[],total:0};
    const matched=set.filter(v=>match(v,source));
    const missing=set.filter(v=>!match(v,source));
    return {score:Math.round(matched.length/set.length*100),matched,missing,total:set.length};
  }

  function titleScore(job,source){
    const title=String(job?.position||"").trim();
    if(!title) return {score:null,matched:[],missing:[],total:0};
    if(match(title,source)) return {score:100,matched:[title],missing:[],total:1};
    const titleWords=tokens(title);
    const hay=norm(source);
    const hits=titleWords.filter(w=>hay.includes(w)).length;
    const score=titleWords.length?Math.round(hits/titleWords.length*100):0;
    return {score,matched:hits?[title]:[],missing:hits===titleWords.length?[]:[title],total:1};
  }

  function educationItems(job,data){
    const all=[...data.qualifications,...data.requirements];
    return all.filter(v=>/\b(degree|bachelor|master|msc|bsc|diploma|education|university|college|graduate)\b/i.test(v));
  }

  function certificationItems(data){
    return uniq([...data.qualifications,...data.requirements].filter(v=>/\b(certif|license|licence|ccna|cissp|comptia|security\+|azure|aws|itil|pmp|cisa|cism|ceh)\b/i.test(v)));
  }

  function roleResponsibilityItems(data){
    return uniq(data.requirements.filter(v=>! /\b(degree|bachelor|master|certif|license|licence)\b/i.test(v)));
  }

  function calculate(job,source){
    const data=analyzerData(job);
    const classes=classifyRequirements(data.requirements);
    const requiredItems=uniq([...data.requiredSkills,...classes.required,...classes.unclear]);
    const preferredItems=classes.preferred;
    const certs=certificationItems(data);
    const edu=educationItems(job,data);
    const responsibilities=roleResponsibilityItems(data);
    const keyword=coverage(data.keywords,source);
    const required=coverage(requiredItems,source);
    const preferred=coverage(preferredItems,source);
    const responsibility=coverage(responsibilities,source);
    const qualification=coverage(certs.length?certs:data.qualifications,source);
    const title=titleScore(job,source);
    const education=coverage(edu,source);

    const components=[
      {key:"keywords",label:"ATS keyword coverage",weight:30,...keyword},
      {key:"required",label:"Required / essential skills",weight:25,...required},
      {key:"responsibility",label:"Experience & responsibility alignment",weight:20,...responsibility},
      {key:"qualification",label:"Qualifications / certifications",weight:10,...qualification},
      {key:"title",label:"Role / title relevance",weight:10,...title},
      {key:"education",label:"Education",weight:5,...education}
    ];
    const available=components.filter(c=>c.score!==null);
    const weight=available.reduce((s,c)=>s+c.weight,0);
    const overall=weight?Math.round(available.reduce((s,c)=>s+c.score*c.weight,0)/weight):0;
    const missingRequired=uniq([...required.missing,...qualification.missing,...education.missing]);
    const missingPreferred=uniq(preferred.missing);
    return {overall,components,missingRequired,missingPreferred,data,preferred};
  }

  function ensureStyles(){
    if(q("s4dStyles")) return;
    const style=document.createElement("style");style.id="s4dStyles";
    style.textContent=`.s4d-shell{display:grid;gap:16px}.s4d-controls{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,.7fr);gap:14px}.s4d-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.s4d-file{font-size:11px;color:var(--muted)}.s4d-summary{display:grid;grid-template-columns:190px 1fr;gap:18px;align-items:center}.s4d-score{font-size:44px;font-weight:700}.s4d-score small{font-size:12px;color:var(--muted);display:block}.s4d-components{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.s4d-card{padding:14px;border:1px solid var(--border);border-radius:10px;background:var(--surface2)}.s4d-card span{display:block;font-size:10px;color:var(--muted)}.s4d-card strong{display:block;font-size:20px;margin:4px 0}.s4d-card small{font-size:10px;color:var(--muted2);line-height:1.4}.s4d-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.s4d-list{display:grid;gap:7px}.s4d-item{padding:9px 10px;border:1px solid var(--border);border-radius:8px;font-size:11px;background:var(--surface2)}.s4d-item.bad{border-color:rgba(245,96,96,.35)}.s4d-item.warn{border-color:rgba(245,186,69,.35)}.s4d-item.good{border-color:rgba(40,209,124,.32)}.s4d-note{font-size:11px;line-height:1.5;color:var(--muted)}@media(max-width:900px){.s4d-controls,.s4d-summary,.s4d-grid{grid-template-columns:1fr}.s4d-components{grid-template-columns:1fr 1fr}}@media(max-width:600px){.s4d-components{grid-template-columns:1fr}}`;
    document.head.appendChild(style);
  }

  function addPage(){
    if(q("atsCheckerPage")) return;
    const placeholder=q("placeholderPage");if(!placeholder) return;
    ensureStyles();
    const page=document.createElement("section");page.id="atsCheckerPage";page.className="page";
    page.innerHTML=`<div class="page-heading"><div><div class="eyebrow">JOB-SPECIFIC ATS CHECK</div><h1>ATS Checker</h1><p>Compare your saved Profile CV or a tailored PDF against one specific saved/analyzed job.</p></div></div><div class="s4d-shell"><section class="panel"><div class="s4d-controls"><div class="field"><label for="s4dJob">Saved / analyzed job</label><select id="s4dJob"><option value="">Choose a job…</option></select></div><div class="field"><label for="s4dSource">CV source</label><select id="s4dSource"><option value="profile">Saved Profile / Master CV</option><option value="pdf">Uploaded tailored PDF</option></select></div></div><div class="s4d-actions"><input id="s4dPdf" type="file" accept=".pdf,application/pdf" hidden><button class="secondary-btn" id="s4dUpload" type="button">Upload Tailored PDF</button><button class="btn" id="s4dRun" type="button">Run ATS Check</button><span id="s4dFileName" class="s4d-file">No tailored PDF selected.</span></div><p class="s4d-note">The score is a transparent evidence-coverage estimate, not a prediction of any employer's ATS. Missing terms are shown separately so unsupported claims are not added to your CV.</p></section><section id="s4dOutput"><div class="panel s4d-note">Choose a saved job, select the CV source, then run the ATS check.</div></section></div>`;
    placeholder.parentNode.insertBefore(page,placeholder);
  }

  function addNav(){
    const nav=document.querySelector(".nav");if(!nav||nav.querySelector('[data-page="ats"]')) return;
    const button=document.createElement("button");button.dataset.page="ats";button.textContent="✓ ATS Checker";
    const tailor=nav.querySelector('[data-page="tailor"]');
    if(tailor?.nextSibling) nav.insertBefore(button,tailor.nextSibling); else nav.appendChild(button);
    button.addEventListener("click",showPage);
  }

  function populateJobs(){
    const select=q("s4dJob");if(!select) return;
    const current=select.value;select.innerHTML='<option value="">Choose a job…</option>';
    readJobs().forEach(job=>{const o=document.createElement("option");o.value=job.id;o.textContent=`${job.position||"Untitled role"} — ${job.company||"Unknown company"}`;select.appendChild(o);});
    if([...select.options].some(o=>o.value===current)) select.value=current;
  }

  function showPage(){
    document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
    document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.page==="ats"));
    q("atsCheckerPage")?.classList.add("active");
    if(q("pageTitle")) q("pageTitle").textContent="ATS Checker";
    q("sidebar")?.classList.remove("open");
    populateJobs();window.scrollTo({top:0,behavior:"smooth"});
  }

  function renderList(title,items,type){
    return `<section class="panel"><h3>${esc(title)}</h3><div class="s4d-list">${items.length?items.map(v=>`<div class="s4d-item ${type}">${esc(v)}</div>`).join(""):'<div class="s4d-note">None identified.</div>'}</div></section>`;
  }

  function render(result,job,sourceLabel){
    const out=q("s4dOutput");if(!out) return;
    const componentHtml=result.components.map(c=>`<div class="s4d-card"><span>${esc(c.label)} · ${c.weight}% weight</span><strong>${c.score===null?"N/A":`${c.score}%`}</strong><small>${c.total?`${c.matched.length}/${c.total} items found in CV evidence.`:"No usable job requirement in this category."}</small></div>`).join("");
    const matched=uniq(result.components.flatMap(c=>c.matched||[])).slice(0,30);
    out.innerHTML=`<section class="panel s4d-summary"><div class="s4d-score">${result.overall}%<small>JOB-SPECIFIC ATS EVIDENCE SCORE</small></div><div><div class="eyebrow">${esc(job.position||"")} · ${esc(job.company||"")}</div><h3>${result.overall>=80?"Strong evidence coverage":result.overall>=65?"Good evidence coverage":result.overall>=50?"Moderate evidence coverage":"Important gaps to review"}</h3><p class="s4d-note">CV source: ${esc(sourceLabel)}. The checker only credits evidence actually found in this CV source.</p></div></section><section class="s4d-components">${componentHtml}</section><div class="s4d-grid">${renderList("Matched evidence",matched,"good")}${renderList("Missing required / essential terms",result.missingRequired,"bad")}</div><div class="s4d-grid">${renderList("Missing preferred / desirable terms",result.missingPreferred,"warn")}${renderList("ATS keywords not found",result.components.find(c=>c.key==="keywords")?.missing||[],"warn")}</div>`;
  }

  async function handlePdf(file){
    if(!file) return;
    if(!(file.type==="application/pdf"||/\.pdf$/i.test(file.name||""))){alert("Please upload a PDF CV.");return;}
    if(typeof window.extractPdfText!=="function"){alert("PDF reader is not ready. Open Profile once, then try again.");return;}
    const button=q("s4dUpload");const old=button?.textContent;if(button) button.textContent="Reading PDF…";
    try{uploadedPdfText=await window.extractPdfText(file);uploadedPdfName=file.name;q("s4dFileName").textContent=file.name;q("s4dSource").value="pdf";}
    catch(err){uploadedPdfText="";uploadedPdfName="";alert(`Could not read this PDF: ${err?.message||"Unknown error"}`);}
    finally{if(button) button.textContent=old||"Upload Tailored PDF";}
  }

  function run(){
    const job=readJobs().find(j=>String(j.id)===String(q("s4dJob")?.value||""));
    if(!job){alert("Choose a saved/analyzed job first.");return;}
    const mode=q("s4dSource")?.value||"profile";
    const source=mode==="pdf"?uploadedPdfText:profileText();
    if(source.trim().length<80){alert(mode==="pdf"?"Upload a readable tailored PDF first.":"Complete or import your Profile CV first.");return;}
    render(calculate(job,source),job,mode==="pdf"?(uploadedPdfName||"Uploaded tailored PDF"):"Saved Profile / Master CV");
  }

  function bind(){
    q("s4dUpload")?.addEventListener("click",()=>q("s4dPdf")?.click());
    q("s4dPdf")?.addEventListener("change",e=>handlePdf(e.target.files?.[0]));
    q("s4dRun")?.addEventListener("click",run);
  }

  function init(){addPage();addNav();populateJobs();bind();}
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true}); else init();
})();

"use strict";

/* Stage 4D.1 - Calibrated job-specific ATS Checker.
   Scores evidence against one saved/analyzed job using concept-level matching,
   deduplicated requirements, calibrated weights, and transparent gap reporting. */
(function stage4dJobSpecificAtsChecker(){
  const PROFILE_KEY="irelandJobHuntOS_profileV1";
  const APP_KEY="irelandJobHuntOS";
  const STOP=new Set("the a an and or to of in on for with from by as at is are be this that you your our we they it role job work working required preferred desirable essential have has ability strong excellent good knowledge experience skills skill years year within across using use provide support manage management responsible responsibilities candidate company opportunity looking including related relevant successful must should can who their through into about".split(" "));
  const TECH_TERMS=["tcp/ip","dns","dhcp","vlan","vlans","routing","switching","cisco ios","cisco","wireshark","splunk","wazuh","siem","active directory","windows server","linux","windows","vpn","firewall","firewalls","acl","acls","aws","azure","ccna","security+","comptia security+","itil","servicenow","solarwinds","prtg","nagios","zabbix","snmp","bgp","ospf","mpls","lan","wan","voip","incident response","alert triage","network monitoring","log analysis","troubleshooting","technical support","customer support","escalation","ticketing","network security","soc","noc"];
  const ALIASES=[
    ["network monitoring",["network monitoring","monitor network","monitoring network","network operations","noc monitoring","infrastructure monitoring"]],
    ["incident response",["incident response","incident management","incident handling","security incident","incident investigation"]],
    ["troubleshooting",["troubleshooting","troubleshoot","diagnose","diagnosis","investigate","investigation","fault finding"]],
    ["alert triage",["alert triage","security alerts","alert monitoring","monitoring alerts","alert investigation"]],
    ["siem",["siem","security information and event management","log monitoring","log analysis"]],
    ["active directory",["active directory","windows active directory","microsoft active directory"]],
    ["technical support",["technical support","network support","it support","user support","customer support"]],
    ["network operations",["network operations","network operation center","network operations center","noc","network support"]]
  ];
  let uploadedPdfText="";
  let uploadedPdfName="";

  const q=id=>document.getElementById(id);
  const esc=value=>String(value||"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const norm=value=>String(value||"").toLowerCase().replace(/[^a-z0-9+#./ -]/g," ").replace(/\s+/g," ").trim();
  const tokens=value=>norm(value).split(/[\s/]+/).filter(v=>v.length>2&&!STOP.has(v));
  const split=value=>String(value||"").split(/\n|,|\||;/).map(v=>v.trim()).filter(Boolean);

  function uniq(values){
    const seen=new Set();
    return values.filter(value=>{
      const key=norm(value).replace(/\b(required|essential|must|mandatory|minimum|preferred|desirable|nice to have|advantage|bonus)\b/g,"").trim();
      if(!key||seen.has(key)) return false;
      seen.add(key);return true;
    });
  }

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

  function extractConcepts(items){
    const out=[];
    items.forEach(item=>{
      const text=String(item||"").trim();
      if(!text) return;
      const lower=norm(text);
      const found=TECH_TERMS.filter(term=>lower.includes(norm(term)));
      if(found.length) out.push(...found);
      const fragments=text.split(/\band\b|\bor\b|\/|•|·/i).map(v=>v.trim()).filter(v=>v.length>=3&&v.length<=80);
      if(!found.length&&fragments.length>1) out.push(...fragments);
      else if(!found.length) out.push(text);
    });
    return uniq(out.map(v=>v.replace(/^[-–—•\s]+|[-–—•\s]+$/g,"")));
  }

  function aliasesFor(item){
    const key=norm(item);
    const group=ALIASES.find(([canonical,forms])=>key.includes(norm(canonical))||forms.some(form=>key.includes(norm(form))||norm(form).includes(key)));
    return group?group[1]:[];
  }

  function certificationStatus(item,source){
    const target=norm(item), hay=norm(source);
    const certLike=/\b(ccna|cissp|security\+|comptia|itil|cisa|cism|ceh|certif|license|licence)\b/i.test(item);
    if(!certLike) return null;
    const names=tokens(target).filter(t=>!/[0-9]/.test(t));
    const present=target&&hay.includes(target) || names.some(name=>hay.includes(name));
    if(!present) return 0;
    const compact=String(source||"").toLowerCase();
    const certWord=names.find(name=>compact.includes(name))||target;
    const idx=compact.indexOf(certWord);
    const windowText=idx>=0?compact.slice(Math.max(0,idx-80),idx+140):compact;
    return /in progress|pursuing|expected\s+20\d{2}|currently pursuing/.test(windowText)?0.7:1;
  }

  function evidenceScore(item,source){
    const target=norm(item), hay=norm(source);
    if(!target||!hay) return 0;
    const cert=certificationStatus(item,source);
    if(cert!==null) return cert;
    if(hay.includes(target)) return 1;
    if(aliasesFor(item).some(alias=>hay.includes(norm(alias)))) return 1;
    const words=tokens(item);
    if(!words.length) return 0;
    const hits=words.filter(w=>hay.includes(w)).length;
    const ratio=hits/words.length;
    if(words.length<=2) return ratio===1?1:0;
    if(ratio>=0.8) return 1;
    if(ratio>=0.6) return 0.75;
    if(ratio>=0.45) return 0.5;
    return 0;
  }

  function coverage(items,source){
    const set=uniq(items);
    if(!set.length) return {score:null,matched:[],partial:[],missing:[],total:0,points:0};
    const rows=set.map(item=>({item,value:evidenceScore(item,source)}));
    const points=rows.reduce((sum,row)=>sum+row.value,0);
    return {
      score:Math.round(points/set.length*100),
      matched:rows.filter(r=>r.value>=0.95).map(r=>r.item),
      partial:rows.filter(r=>r.value>0&&r.value<0.95).map(r=>`${r.item} — partial evidence`),
      missing:rows.filter(r=>r.value===0).map(r=>r.item),
      total:set.length,points
    };
  }

  function titleScore(job,source){
    const title=String(job?.position||"").trim();
    if(!title) return {score:null,matched:[],partial:[],missing:[],total:0};
    const hay=norm(source);
    if(hay.includes(norm(title))) return {score:100,matched:[title],partial:[],missing:[],total:1};
    const titleWords=tokens(title);
    const hits=titleWords.filter(w=>hay.includes(w)).length;
    let score=titleWords.length?Math.round(hits/titleWords.length*100):0;
    if(/\bnoc\b|network operations?/i.test(title) && /(network operations?|network support|network security|routing|switching|tcp\/ip|cisco)/i.test(source)) score=Math.max(score,75);
    else if(/\bsoc\b|security analyst/i.test(title) && /(siem|incident response|alert triage|security monitoring|splunk|wazuh)/i.test(source)) score=Math.max(score,75);
    return {score,matched:score>=80?[title]:[],partial:score>=40&&score<80?[`${title} — transferable title evidence`]:[],missing:score<40?[title]:[],total:1};
  }

  function educationItems(data){
    return extractConcepts([...data.qualifications,...data.requirements].filter(v=>/\b(degree|bachelor|master|msc|bsc|diploma|education|university|college|graduate)\b/i.test(v)));
  }

  function certificationItems(data){
    return extractConcepts([...data.qualifications,...data.requirements].filter(v=>/\b(certif|license|licence|ccna|cissp|comptia|security\+|azure|aws|itil|pmp|cisa|cism|ceh)\b/i.test(v)));
  }

  function roleResponsibilityItems(data){
    return extractConcepts(data.requirements.filter(v=>!/\b(degree|bachelor|master|certif|license|licence)\b/i.test(v)));
  }

  function calculate(job,source){
    const data=analyzerData(job);
    const classes=classifyRequirements(data.requirements);
    const requiredItems=extractConcepts([...data.requiredSkills,...classes.required,...classes.unclear]);
    const preferredItems=extractConcepts(classes.preferred);
    const keywords=extractConcepts(data.keywords);
    const certs=certificationItems(data);
    const edu=educationItems(data);
    const responsibilities=roleResponsibilityItems(data);

    const keyword=coverage(keywords,source);
    const required=coverage(requiredItems,source);
    const preferred=coverage(preferredItems,source);
    const responsibility=coverage(responsibilities,source);
    const qualification=coverage(certs.length?certs:extractConcepts(data.qualifications),source);
    const title=titleScore(job,source);
    const education=coverage(edu,source);

    const components=[
      {key:"keywords",label:"ATS keyword coverage",weight:25,...keyword},
      {key:"required",label:"Required / essential skills",weight:35,...required},
      {key:"responsibility",label:"Experience & responsibility alignment",weight:20,...responsibility},
      {key:"qualification",label:"Qualifications / certifications",weight:10,...qualification},
      {key:"title",label:"Role / title relevance",weight:5,...title},
      {key:"education",label:"Education",weight:5,...education}
    ];
    const available=components.filter(c=>c.score!==null);
    const weight=available.reduce((s,c)=>s+c.weight,0);
    const overall=weight?Math.round(available.reduce((s,c)=>s+c.score*c.weight,0)/weight):0;
    const missingRequired=uniq([...required.missing,...qualification.missing,...education.missing]);
    const partialEvidence=uniq(components.flatMap(c=>c.partial||[]));
    const missingPreferred=uniq(preferred.missing);
    return {overall,components,missingRequired,missingPreferred,partialEvidence};
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
    page.innerHTML=`<div class="page-heading"><div><div class="eyebrow">JOB-SPECIFIC ATS CHECK</div><h1>ATS Checker</h1><p>Compare your saved Profile CV or a tailored PDF against one specific saved/analyzed job.</p></div></div><div class="s4d-shell"><section class="panel"><div class="s4d-controls"><div class="field"><label for="s4dJob">Saved / analyzed job</label><select id="s4dJob"><option value="">Choose a job…</option></select></div><div class="field"><label for="s4dSource">CV source</label><select id="s4dSource"><option value="profile">Saved Profile / Master CV</option><option value="pdf">Uploaded tailored PDF</option></select></div></div><div class="s4d-actions"><input id="s4dPdf" type="file" accept=".pdf,application/pdf" hidden><button class="secondary-btn" id="s4dUpload" type="button">Upload Tailored PDF</button><button class="btn" id="s4dRun" type="button">Run ATS Check</button><span id="s4dFileName" class="s4d-file">No tailored PDF selected.</span></div><p class="s4d-note">Calibrated scoring checks whether your CV contains evidence for each job requirement. Required criteria carry more weight than wording similarity; repeated concepts are counted once.</p></section><section id="s4dOutput"><div class="panel s4d-note">Choose a saved job, select the CV source, then run the ATS check.</div></section></div>`;
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
    const componentHtml=result.components.map(c=>`<div class="s4d-card"><span>${esc(c.label)} · ${c.weight}% weight</span><strong>${c.score===null?"N/A":`${c.score}%`}</strong><small>${c.total?`${c.matched.length} full + ${(c.partial||[]).length} partial / ${c.total} concepts.`:"No explicit job requirement in this category."}</small></div>`).join("");
    const matched=uniq(result.components.flatMap(c=>c.matched||[])).slice(0,30);
    const verdict=result.overall>=80?"Strong alignment":result.overall>=65?"Competitive alignment":result.overall>=50?"Partial alignment":"Substantial genuine gaps";
    out.innerHTML=`<section class="panel s4d-summary"><div class="s4d-score">${result.overall}%<small>CALIBRATED JOB-SPECIFIC ATS SCORE</small></div><div><div class="eyebrow">${esc(job.position||"")} · ${esc(job.company||"")}</div><h3>${verdict}</h3><p class="s4d-note">CV source: ${esc(sourceLabel)}. This is an evidence-coverage estimate, not a reproduction of an employer ATS algorithm. Job-title wording has only 5% weight.</p></div></section><section class="s4d-components">${componentHtml}</section><div class="s4d-grid">${renderList("Matched evidence",matched,"good")}${renderList("Partial / transferable evidence",result.partialEvidence,"warn")}</div><div class="s4d-grid">${renderList("Missing required / essential evidence",result.missingRequired,"bad")}${renderList("Missing preferred / desirable evidence",result.missingPreferred,"warn")}</div><div class="s4d-grid">${renderList("ATS keywords not found",result.components.find(c=>c.key==="keywords")?.missing||[],"warn")}${renderList("Why points were lost",uniq([...result.missingRequired,...result.missingPreferred,...(result.components.find(c=>c.key==="keywords")?.missing||[])]).map(v=>`${v} — no supporting CV evidence detected`),"bad")}</div>`;
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
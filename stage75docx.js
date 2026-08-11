"use strict";

/* Stage 7.5 - Master CV document tailoring.
   DOCX-first: retrieve the actual private Master CV, modify only approved sections in word/document.xml,
   preserve the rest of the OOXML package, and save a separate tailored DOCX version. */

const S75_JSZIP_URL="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
const S75_DOCX_MIME="application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const S75_APP_KEY="irelandJobHuntOS";
const S75_PROFILE_KEY="irelandJobHuntOS_profileV1";
const S75_W_NS="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
let s75Prepared=null;
let s75LastMasterId="";

const s75q=id=>document.getElementById(id);
const s75esc=value=>String(value||"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const s75norm=value=>String(value||"").toLowerCase().replace(/[^a-z0-9+#. ]/g," ").replace(/\s+/g," ").trim();
const s75uniq=values=>[...new Set(values.filter(Boolean))];
const s75safe=name=>String(name||"tailored-cv").replace(/[^a-z0-9._-]+/gi,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");

const S75_HEADINGS={
  summary:/^(professional summary|profile|personal profile|career profile|career summary|executive summary|summary|objective)$/i,
  skills:/^(skills|key skills|core skills|technical skills|professional skills|core competencies|competencies|tools & technologies)$/i,
  experience:/^(work experience|professional experience|employment history|employment|experience|career history)$/i,
  education:/^(education|academic background|academic qualifications|education & qualifications)$/i,
  projects:/^(projects|selected projects|personal projects|academic projects)$/i,
  certifications:/^(certifications|certificates|professional qualifications|licenses & certifications|licences & certifications)$/i,
  languages:/^(languages|language skills)$/i,
  additional:/^(additional information|interests|volunteering|volunteer experience|awards|achievements|publications|references)$/i
};

function s75Cloud(){return window.JobHuntCloudCV||null;}
function s75Profile(){try{return JSON.parse(localStorage.getItem(S75_PROFILE_KEY)||"{}");}catch{return {};}}
function s75Jobs(){try{const state=JSON.parse(localStorage.getItem(S75_APP_KEY)||"{}");return Array.isArray(state.jobs)?state.jobs:[];}catch{return [];}}
function s75SelectedJob(){const id=s75q("s7JobSelect")?.value;return s75Jobs().find(job=>String(job.id)===String(id));}
function s75IsDocx(master){return Boolean(master&&(/\.docx$/i.test(master.file_name||"")||master.mime_type===S75_DOCX_MIME));}

function s75LoadJsZip(){
  if(window.JSZip)return Promise.resolve(window.JSZip);
  return new Promise((resolve,reject)=>{
    const existing=[...document.scripts].find(script=>script.src.includes("jszip@3.10.1"));
    if(existing){existing.addEventListener("load",()=>resolve(window.JSZip),{once:true});existing.addEventListener("error",reject,{once:true});return;}
    const script=document.createElement("script");script.src=S75_JSZIP_URL;script.async=true;
    script.onload=()=>resolve(window.JSZip);script.onerror=()=>reject(new Error("Could not load the DOCX editing library."));
    document.head.appendChild(script);
  });
}

function s75Paragraphs(doc){return [...doc.getElementsByTagNameNS("*","p")];}
function s75Text(node){return [...node.getElementsByTagNameNS("*","t")].map(t=>t.textContent||"").join("").replace(/\s+/g," ").trim();}
function s75HeadingKey(text){const clean=String(text||"").trim().replace(/:$/," ").trim();return Object.entries(S75_HEADINGS).find(([,rx])=>rx.test(clean))?.[0]||"";}
function s75FindSection(doc,key){
  const paras=s75Paragraphs(doc);let start=-1;
  for(let i=0;i<paras.length;i++){if(s75HeadingKey(s75Text(paras[i]))===key){start=i;break;}}
  if(start<0)return null;
  let end=paras.length;
  for(let i=start+1;i<paras.length;i++){if(s75HeadingKey(s75Text(paras[i]))){end=i;break;}}
  return {paras,start,end,heading:paras[start],content:paras.slice(start+1,end)};
}

function s75JobTerms(job){
  if(typeof s73JobTerms==="function")return s73JobTerms(job);
  const skills=Array.isArray(job?.requiredSkills)?job.requiredSkills:String(job?.requiredSkills||"").split(",");
  const notes=String(job?.notes||"");const extras=[];
  ["ATS keywords","Qualifications","Key requirements"].forEach(label=>{const m=notes.match(new RegExp(`${label}:\\s*([^\\n]+)`,`i`));if(m)extras.push(...m[1].split(/,|\|/));});
  return s75uniq([job?.position,...skills,...extras].map(v=>String(v||"").trim()).filter(Boolean));
}

function s75Score(text,terms){
  const n=s75norm(text);let score=0;
  terms.forEach(term=>{const t=s75norm(term);if(!t)return;if(n===t)score+=10;else if(n.includes(t)||t.includes(n))score+=6;else score+=t.split(" ").filter(w=>w.length>2&&n.includes(w)).length;});
  return score;
}

function s75ProposedSummary(job){
  const profile=s75Profile();
  if(typeof s73TailoredSummary==="function")return String(s73TailoredSummary(job,profile)||"").trim();
  return String(profile.experienceSummary||"").trim();
}

function s75AnalyseXml(xmlText,job){
  const doc=new DOMParser().parseFromString(xmlText,"application/xml");
  if(doc.getElementsByTagName("parsererror").length)throw new Error("The DOCX document XML could not be parsed safely.");
  const summary=s75FindSection(doc,"summary");
  const skills=s75FindSection(doc,"skills");
  const proposed=s75ProposedSummary(job);
  const summaryParas=summary?summary.content.filter(p=>s75Text(p)):[];
  const originalSummary=summaryParas.map(s75Text).join(" ").trim();
  const skillParas=skills?skills.content.filter(p=>s75Text(p)):[];
  const originalSkills=skillParas.map(s75Text);
  let reorderedSkills=[...originalSkills];let canReorder=false;
  if(skillParas.length>1&&skillParas.every(p=>p.parentNode===skillParas[0].parentNode)){
    const terms=s75JobTerms(job);
    reorderedSkills=skillParas.map((p,index)=>({text:s75Text(p),index,score:s75Score(s75Text(p),terms)})).sort((a,b)=>b.score-a.score||a.index-b.index).map(x=>x.text);
    canReorder=reorderedSkills.some((text,index)=>text!==originalSkills[index]);
  }
  return {
    summary:{found:Boolean(summary),original:originalSummary,proposed,change:Boolean(summary&&summaryParas.length&&proposed&&proposed!==originalSummary)},
    skills:{found:Boolean(skills),original:originalSkills,proposed:reorderedSkills,change:canReorder,paragraphMode:skillParas.length>1},
    protected:["Work experience","Employers","Job titles","Dates","Education","Certifications","Projects","Languages","All unselected content"]
  };
}

function s75SetParagraphText(doc,p,text){
  let nodes=[...p.getElementsByTagNameNS("*","t")];
  if(!nodes.length){
    const run=doc.createElementNS(S75_W_NS,"w:r");const t=doc.createElementNS(S75_W_NS,"w:t");run.appendChild(t);p.appendChild(run);nodes=[t];
  }
  nodes[0].textContent=text;nodes[0].setAttributeNS("http://www.w3.org/XML/1998/namespace","xml:space","preserve");
  nodes.slice(1).forEach(node=>node.textContent="");
}

function s75ApplyXml(xmlText,job,options){
  const doc=new DOMParser().parseFromString(xmlText,"application/xml");
  if(doc.getElementsByTagName("parsererror").length)throw new Error("The DOCX document XML could not be parsed safely.");
  const manifest={source_type:"docx",preserve_document:true,summary:{changed:false},skills:{changed:false},protected_sections:["employment","job_titles","dates","education","certifications","projects","languages","unselected_content"]};

  if(options.summary){
    const section=s75FindSection(doc,"summary");const content=section?section.content.filter(p=>s75Text(p)):[];const proposed=s75ProposedSummary(job);
    if(section&&content.length&&proposed){
      const original=content.map(s75Text).join(" ").trim();
      s75SetParagraphText(doc,content[0],proposed);
      content.slice(1).forEach(p=>p.parentNode?.removeChild(p));
      manifest.summary={changed:proposed!==original,original,tailored:proposed};
    }else manifest.summary={changed:false,reason:section?"No editable summary text found":"Summary heading not found"};
  }

  if(options.skills){
    const section=s75FindSection(doc,"skills");const content=section?section.content.filter(p=>s75Text(p)):[];
    if(section&&content.length>1&&content.every(p=>p.parentNode===content[0].parentNode)){
      const parent=content[0].parentNode;const terms=s75JobTerms(job);const before=content.map(s75Text);
      const ranked=content.map((p,index)=>({p,index,score:s75Score(s75Text(p),terms)})).sort((a,b)=>b.score-a.score||a.index-b.index);
      const boundary=section.paras[section.end]||null;
      ranked.forEach(item=>parent.insertBefore(item.p,boundary&&boundary.parentNode===parent?boundary:null));
      const after=ranked.map(item=>s75Text(item.p));
      manifest.skills={changed:after.some((text,index)=>text!==before[index]),original_order:before,tailored_order:after,wording_changed:false};
    }else manifest.skills={changed:false,reason:section?(content.length<=1?"Skills are stored in one paragraph; wording is left untouched":"Skills layout is not safe to reorder") : "Skills heading not found"};
  }

  return {xml:new XMLSerializer().serializeToString(doc),manifest};
}

function s75EnsureStyles(){
  if(s75q("stage75Styles"))return;const style=document.createElement("style");style.id="stage75Styles";
  style.textContent=`.s75-panel{border-color:rgba(40,209,124,.38);background:linear-gradient(145deg,rgba(40,209,124,.055),var(--surface))}.s75-head{display:flex;justify-content:space-between;gap:18px;align-items:start;flex-wrap:wrap}.s75-badge{display:inline-flex;padding:4px 8px;border-radius:999px;border:1px solid rgba(40,209,124,.35);color:var(--accent);font-size:10px}.s75-status{margin-top:8px;color:var(--muted);font-size:11px;line-height:1.55}.s75-status.bad{color:#ff8d8d}.s75-status.good{color:var(--accent)}.s75-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:13px}.s75-options{display:flex;gap:16px;flex-wrap:wrap;margin-top:13px}.s75-options label{display:flex;gap:8px;align-items:center;font-size:12px}.s75-diff{display:grid;gap:12px;margin-top:14px}.s75-diff-card{padding:13px;border:1px solid var(--border);border-radius:10px;background:var(--surface2)}.s75-diff-card h4{margin:0 0 8px}.s75-compare{display:grid;grid-template-columns:1fr 1fr;gap:10px}.s75-compare>div{padding:10px;border:1px solid var(--border);border-radius:8px;font-size:11px;line-height:1.55;white-space:pre-wrap}.s75-compare strong{display:block;margin-bottom:5px;color:var(--muted)}.s75-protected{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.s75-protected span{font-size:10px;padding:4px 7px;border:1px solid var(--border);border-radius:999px;color:var(--muted)}.s75-legacy{margin-top:10px;font-size:11px}#s74SaveTailored{display:none!important}.s75-hidden{display:none!important}@media(max-width:760px){.s75-compare{grid-template-columns:1fr}.s75-actions .btn,.s75-actions .secondary-btn{width:100%}}`;
  document.head.appendChild(style);
}

function s75Legacy(show){const legacy=s75q("s72Generator");if(legacy)legacy.classList.toggle("s75-hidden",!show);const btn=s75q("s75LegacyToggle");if(btn)btn.textContent=show?"Hide legacy text preview":"Show legacy text preview";}

function s75Inject(){
  const page=s75q("tailorPage");const legacy=s75q("s72Generator");if(!page||!legacy||s75q("s75Panel"))return false;
  s75EnsureStyles();const panel=document.createElement("section");panel.id="s75Panel";panel.className="panel s75-panel";
  panel.innerHTML=`<div class="s75-head"><div><div class="eyebrow">MASTER DOCUMENT TAILORING</div><h3>Tailor the actual Master CV document</h3><p class="s75-status">DOCX mode edits only approved Word document sections and keeps the original private Master CV untouched.</p></div><span class="s75-badge">DOCX PRESERVE MODE</span></div><div id="s75State" class="s75-status">Connecting to Master CV storage…</div><div class="s75-options"><label><input id="s75Summary" type="checkbox" checked> Tailor Professional Summary</label><label><input id="s75Skills" type="checkbox" checked> Reorder existing skill paragraphs only</label></div><div class="s75-actions"><button class="btn" id="s75Prepare" type="button">Prepare document changes</button><button class="btn" id="s75Generate" type="button" disabled>Generate & save tailored DOCX</button><button class="secondary-btn" id="s75OpenMaster" type="button">Open Master CV</button><button class="secondary-btn" id="s75LegacyToggle" type="button">Show legacy text preview</button></div><div id="s75Diff" class="s75-diff"></div>`;
  page.insertBefore(panel,legacy);s75Legacy(false);
  s75q("s75Prepare")?.addEventListener("click",s75Prepare);
  s75q("s75Generate")?.addEventListener("click",s75Generate);
  s75q("s75OpenMaster")?.addEventListener("click",()=>s75Cloud()?.openMaster?.());
  s75q("s75LegacyToggle")?.addEventListener("click",()=>s75Legacy(legacy.classList.contains("s75-hidden")));
  s75q("s75Summary")?.addEventListener("change",()=>{s75Prepared=null;s75q("s75Generate").disabled=true;});
  s75q("s75Skills")?.addEventListener("change",()=>{s75Prepared=null;s75q("s75Generate").disabled=true;});
  return true;
}

function s75RenderState(){
  const cloud=s75Cloud();const state=s75q("s75State");if(!state)return;
  if(!cloud){state.textContent="Waiting for cloud CV integration…";return;}
  const session=cloud.getSession?.();const master=cloud.getActiveMaster?.();
  if(!session?.user){state.className="s75-status bad";state.innerHTML='Sign in from <strong>Profile</strong> before using document tailoring.';return;}
  if(!master){state.className="s75-status bad";state.innerHTML='Upload a private <strong>Master CV</strong> from Profile first.';return;}
  if(!s75IsDocx(master)){state.className="s75-status bad";state.innerHTML=`Active Master CV: <strong>${s75esc(master.file_name)}</strong>. It is preserved in Supabase, but exact document-preserving tailoring currently requires a DOCX Master CV.`;return;}
  state.className="s75-status good";state.innerHTML=`Active source: <strong>${s75esc(master.file_name)}</strong>. The original will not be overwritten.`;
  if(s75LastMasterId&&s75LastMasterId!==master.id){s75Prepared=null;s75q("s75Generate").disabled=true;s75q("s75Diff").innerHTML="";}
  s75LastMasterId=master.id;
}

async function s75DownloadMaster(){
  const cloud=s75Cloud();if(!cloud)throw new Error("Cloud CV integration is not ready.");const session=cloud.getSession?.();const master=cloud.getActiveMaster?.();
  if(!session?.user)throw new Error("Sign in from Profile first.");if(!master)throw new Error("Upload a Master CV first.");if(!s75IsDocx(master))throw new Error("Document-preserving tailoring currently requires a DOCX Master CV.");
  const client=await cloud.getClient();const result=await client.storage.from(cloud.bucket).download(master.storage_path);if(result.error)throw result.error;return {blob:result.data,master,client,session};
}

function s75RenderDiff(changes,job,master){
  const host=s75q("s75Diff");if(!host)return;
  const summary=changes.summary;const skills=changes.skills;
  const summaryHtml=summary.found?`<div class="s75-diff-card"><h4>Professional Summary ${summary.change?"— proposed change":"— unchanged"}</h4>${summary.change?`<div class="s75-compare"><div><strong>Original</strong>${s75esc(summary.original)}</div><div><strong>Tailored</strong>${s75esc(summary.proposed)}</div></div>`:`<div class="s75-status">${summary.original?"No different evidence-based summary was produced.":"No editable summary text was found."}</div>`}</div>`:`<div class="s75-diff-card"><h4>Professional Summary — not found</h4><div class="s75-status">No recognised Summary/Profile heading was found, so the app will not insert a new section automatically.</div></div>`;
  const skillsHtml=skills.found?`<div class="s75-diff-card"><h4>Skills ${skills.change?"— paragraph order will change":"— unchanged"}</h4>${skills.change?`<div class="s75-compare"><div><strong>Original order</strong>${s75esc(skills.original.join("\n"))}</div><div><strong>Tailored order</strong>${s75esc(skills.proposed.join("\n"))}</div></div>`:`<div class="s75-status">${skills.paragraphMode?"Existing skill paragraphs are already in the best detected order.":"Skills are stored in a single paragraph or complex layout, so wording and formatting will be left untouched."}</div>`}</div>`:`<div class="s75-diff-card"><h4>Skills — not found</h4><div class="s75-status">No recognised Skills heading was found, so no skill content will be changed.</div></div>`;
  host.innerHTML=`<div class="s75-diff-card"><strong>${s75esc(master.file_name)}</strong><div class="s75-status">Target: ${s75esc(job.position||"Saved job")}${job.company?` · ${s75esc(job.company)}`:""}. Review the changes below before generating the tailored copy.</div><div class="s75-protected">${changes.protected.map(v=>`<span>🔒 ${s75esc(v)}</span>`).join("")}</div></div>${summaryHtml}${skillsHtml}`;
}

async function s75Prepare(){
  const button=s75q("s75Prepare"),state=s75q("s75State");const job=s75SelectedJob();
  if(!job){state.className="s75-status bad";state.textContent="Choose a saved job in the CV Tailoring Assistant first.";return;}
  button.disabled=true;button.textContent="Preparing…";
  try{
    await s75LoadJsZip();const source=await s75DownloadMaster();const zip=await window.JSZip.loadAsync(source.blob);const xmlFile=zip.file("word/document.xml");if(!xmlFile)throw new Error("This DOCX does not contain the expected Word document XML.");
    const xmlText=await xmlFile.async("string");const changes=s75AnalyseXml(xmlText,job);
    s75Prepared={...source,zip,xmlText,changes,job};s75RenderDiff(changes,job,source.master);s75q("s75Generate").disabled=false;
    state.className="s75-status good";state.textContent="Document analysed. Review the proposed changes before generating the tailored DOCX.";
  }catch(error){console.error(error);state.className="s75-status bad";state.textContent=error.message||"Could not prepare the Master CV.";s75q("s75Generate").disabled=true;}
  finally{button.disabled=false;button.textContent="Prepare document changes";}
}

function s75DownloadBlob(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}

async function s75Generate(){
  const button=s75q("s75Generate"),state=s75q("s75State");if(!s75Prepared){await s75Prepare();if(!s75Prepared)return;}
  button.disabled=true;button.textContent="Generating…";
  try{
    const options={summary:s75q("s75Summary")?.checked!==false,skills:s75q("s75Skills")?.checked!==false};
    const applied=s75ApplyXml(s75Prepared.xmlText,s75Prepared.job,options);s75Prepared.zip.file("word/document.xml",applied.xml);
    const blob=await s75Prepared.zip.generateAsync({type:"blob",mimeType:S75_DOCX_MIME,compression:"DEFLATE"});
    const base=(s75Prepared.master.file_name||"Master-CV.docx").replace(/\.docx$/i,"");const company=s75safe(s75Prepared.job.company||"company");const role=s75safe(s75Prepared.job.position||"role");const fileName=`${base}-${company}-${role}-tailored.docx`;
    const uid=s75Prepared.session.user.id;const path=`${uid}/tailored/${Date.now()}-${s75safe(fileName)}`;
    const upload=await s75Prepared.client.storage.from(s75Cloud().bucket).upload(path,blob,{contentType:S75_DOCX_MIME,upsert:false});if(upload.error)throw upload.error;
    const insert=await s75Prepared.client.from("tailored_cvs").insert({user_id:uid,master_cv_id:s75Prepared.master.id,job_id:String(s75Prepared.job.id||""),company:s75Prepared.job.company||null,position:s75Prepared.job.position||null,file_name:fileName,storage_path:path,tailoring_mode:"conservative",change_manifest:{...applied.manifest,source_master_filename:s75Prepared.master.file_name}});
    if(insert.error){await s75Prepared.client.storage.from(s75Cloud().bucket).remove([path]);throw insert.error;}
    s75DownloadBlob(blob,fileName);state.className="s75-status good";state.textContent="Tailored DOCX created and saved as a separate cloud version. The Master CV remains unchanged.";
    s75Cloud().refreshHistory?.();
  }catch(error){console.error(error);state.className="s75-status bad";state.textContent=error.message||"Could not generate the tailored DOCX.";}
  finally{button.disabled=false;button.textContent="Generate & save tailored DOCX";}
}

function s75Init(){
  if(!s75Inject()){let tries=0;const timer=setInterval(()=>{tries++;if(s75Inject()||tries>80)clearInterval(timer);},150);}
  let checks=0;const stateTimer=setInterval(()=>{checks++;s75RenderState();if(checks>120)clearInterval(stateTimer);},500);
  document.addEventListener("click",event=>{if(event.target.closest('[data-page="tailor"], [data-page="profile"]'))setTimeout(s75RenderState,250);});
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",s75Init);else s75Init();

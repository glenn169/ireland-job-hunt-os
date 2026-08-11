"use strict";

/* Stage 7.2 - Two-page Irish/Jake-inspired CV Generator.
   Browser-only. Uses saved profile/job evidence and never invents content. */

const S72_PROFILE_KEY="irelandJobHuntOS_profileV1";
const S72_APP_KEY="irelandJobHuntOS";
const s72q=id=>document.getElementById(id);
const s72esc=value=>String(value||"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const s72uniq=values=>[...new Set(values.filter(Boolean))];
const s72split=value=>String(value||"").split(/\n|,|\|/).map(v=>v.trim()).filter(Boolean);

function s72Profile(){try{return JSON.parse(localStorage.getItem(S72_PROFILE_KEY)||"{}");}catch{return {};}}
function s72Jobs(){try{const state=JSON.parse(localStorage.getItem(S72_APP_KEY)||"{}");return Array.isArray(state.jobs)?state.jobs:[];}catch{return [];}}
function s72Trim(value,max=220){const text=String(value||"").replace(/\s+/g," ").trim();return text.length<=max?text:`${text.slice(0,max-1).replace(/\s+\S*$/,'')}…`;}
function s72Contact(text){
  const raw=String(text||"");
  const email=(raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)||[])[0]||"";
  const phone=(raw.match(/(?:\+353|0)\s?\d(?:[\s-]?\d){7,9}/)||[])[0]||"";
  const linkedin=(raw.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+/i)||[])[0]||"";
  const github=(raw.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+/i)||[])[0]||"";
  return {email,phone,linkedin,github};
}
function s72Section(text,heads,stops){
  const lines=String(text||"").split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
  const hrx=new RegExp(`^(${heads.join("|")})\\s*:?$`,`i`); const srx=new RegExp(`^(${stops.join("|")})\\s*:?$`,`i`);
  let active=false; const out=[];
  for(const line of lines){if(hrx.test(line)){active=true;continue;} if(active&&srx.test(line)) break; if(active) out.push(line);}
  return out;
}
function s72Model(job,profile){
  const raw=profile.resumeText||"";
  const tailored=(typeof s7TailorJob==="function")?s7TailorJob(job,profile):null;
  const contacts=s72Contact(raw);
  const verified=tailored?.useItems||[];
  const skills=s72uniq([...verified,...s72split(profile.professionalSkills),...s72split(profile.softSkills)]).slice(0,14);
  const evidence=(tailored?.evidence||[]).map(v=>s72Trim(v,230)).slice(0,10);
  const expSection=s72Section(raw,["work experience","professional experience","employment history","employment","experience","career history"],["education","skills","certifications","projects","languages","references","interests","additional information"]);
  const fallbackExp=expSection.filter(v=>v.length>18).map(v=>s72Trim(v,230)).slice(0,10);
  const bullets=evidence.length?evidence:fallbackExp;
  const education=s72split(profile.education).slice(0,5);
  const certs=s72split(profile.certifications).filter(c=>!tailored?.avoidItems?.some(a=>a.toLowerCase()===c.toLowerCase())).slice(0,6);
  const languages=s72split(profile.languages).slice(0,6);
  const summaryBase=tailored?.summary||profile.experienceSummary||"";
  const summary=s72Trim(summaryBase.replace(/This draft uses only information.*$/i,"").replace(/should be edited.*$/i,""),430);
  const page1Bullets=bullets.slice(0,6); const page2Bullets=bullets.slice(6,10);
  return {
    name:profile.fullName||"Candidate Name", headline:job.position||s72split(profile.targetRoles)[0]||"Target Role",
    location:profile.location||"", contacts, summary, skills, education, certs, languages,
    workAuthorisation:profile.workAuthorisation||"", drivingLicence:profile.drivingLicence||"",
    page1Bullets,page2Bullets,company:job.company||"",position:job.position||""
  };
}
function s72SectionHtml(title,body){return body?`<section class="cvsec"><h2>${s72esc(title)}</h2>${body}</section>`:"";}
function s72List(items){return items.length?`<ul>${items.map(v=>`<li>${s72esc(v)}</li>`).join("")}</ul>`:"";}
function s72Inline(items){return items.length?`<p class="cvinline">${items.map(s72esc).join(" • ")}</p>`:"";}
function s72PageHeader(m){
  const contact=[m.location,m.contacts.phone,m.contacts.email,m.contacts.linkedin,m.contacts.github].filter(Boolean).map(s72esc).join(" • ");
  return `<header class="cvhead"><h1>${s72esc(m.name)}</h1><p class="cvrole">${s72esc(m.headline)}</p>${contact?`<p class="cvcontact">${contact}</p>`:""}</header>`;
}
function s72RenderCv(model){
  const p1=`${s72PageHeader(model)}${s72SectionHtml("Professional Summary",model.summary?`<p>${s72esc(model.summary)}</p>`:"")}${s72SectionHtml("Core Skills",s72Inline(model.skills))}${s72SectionHtml("Relevant Experience",s72List(model.page1Bullets))}`;
  const extras=s72uniq([model.workAuthorisation?`Work authorisation: ${model.workAuthorisation}`:"",model.drivingLicence?`Driving licence: ${model.drivingLicence}`:"",...model.languages.map(v=>`Language: ${v}`)]);
  const p2Sections=[
    model.page2Bullets.length?s72SectionHtml("Additional Relevant Experience",s72List(model.page2Bullets)):"",
    s72SectionHtml("Education",s72List(model.education)),
    s72SectionHtml("Certifications & Professional Qualifications",s72List(model.certs)),
    s72SectionHtml("Additional Information",s72List(extras.slice(0,7)))
  ].join("");
  const usePage2=Boolean(p2Sections.replace(/<[^>]+>/g,"").trim());
  return `<div class="cvpages"><article class="cvpage">${p1}</article>${usePage2?`<article class="cvpage">${p2Sections}</article>`:""}</div>`;
}
function s72Css(){return `
  .s72-builder{display:grid;gap:14px;margin-top:16px}.s72-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.s72-pagecount{margin-left:auto;color:var(--muted);font-size:11px}.cvpages{display:grid;gap:18px;justify-content:center;padding:8px 0}.cvpage{width:210mm;min-height:297mm;max-height:297mm;overflow:hidden;box-sizing:border-box;background:#fff;color:#111;padding:14mm 16mm;font-family:Arial,Helvetica,sans-serif;font-size:10.1pt;line-height:1.34;box-shadow:0 10px 30px rgba(0,0,0,.28)}.cvhead{text-align:center;margin-bottom:8px}.cvhead h1{font-size:22pt;line-height:1.05;margin:0;font-weight:700;letter-spacing:.1px}.cvrole{font-size:11pt;font-weight:700;margin:4px 0 3px}.cvcontact{font-size:8.6pt;margin:0;word-break:break-word}.cvsec{margin-top:9px}.cvsec h2{font-size:10.5pt;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #222;padding-bottom:2px;margin:0 0 4px}.cvsec p{margin:0}.cvsec ul{margin:3px 0 0 17px;padding:0}.cvsec li{margin:0 0 3px}.cvinline{font-size:9.4pt}.s72-warning{font-size:11px;color:var(--muted);line-height:1.5}.s72-warning strong{color:var(--warn)}@media(max-width:900px){.cvpages{justify-content:start;overflow:auto}.cvpage{transform-origin:top left}}`}
function s72Text(model){
  const parts=[model.name,model.headline,[model.location,model.contacts.phone,model.contacts.email,model.contacts.linkedin,model.contacts.github].filter(Boolean).join(" | "),"\nPROFESSIONAL SUMMARY",model.summary,"\nCORE SKILLS",model.skills.join(" | "),"\nRELEVANT EXPERIENCE",...model.page1Bullets,...model.page2Bullets,"\nEDUCATION",...model.education,"\nCERTIFICATIONS",...model.certs,"\nADDITIONAL INFORMATION",model.workAuthorisation,model.drivingLicence,model.languages.join(", ")];
  return parts.filter(Boolean).join("\n");
}
function s72Print(){
  const preview=s72q("s72Preview"); if(!preview)return;
  const win=window.open("","_blank","noopener,noreferrer"); if(!win){alert("Please allow pop-ups to print or save the tailored CV as PDF.");return;}
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Tailored CV</title><style>@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#fff}.cvpages{display:block}.cvpage{width:210mm;height:297mm;overflow:hidden;padding:14mm 16mm;font-family:Arial,Helvetica,sans-serif;font-size:10.1pt;line-height:1.34;page-break-after:always;color:#111;background:#fff}.cvpage:last-child{page-break-after:auto}.cvhead{text-align:center;margin-bottom:8px}.cvhead h1{font-size:22pt;line-height:1.05;margin:0}.cvrole{font-size:11pt;font-weight:700;margin:4px 0 3px}.cvcontact{font-size:8.6pt;margin:0}.cvsec{margin-top:9px}.cvsec h2{font-size:10.5pt;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #222;padding-bottom:2px;margin:0 0 4px}.cvsec p{margin:0}.cvsec ul{margin:3px 0 0 17px;padding:0}.cvsec li{margin:0 0 3px}.cvinline{font-size:9.4pt}</style></head><body>${preview.innerHTML}</body></html>`);
  win.document.close(); setTimeout(()=>win.print(),250);
}
function s72Build(){
  const jobId=s72q("s7JobSelect")?.value; const host=s72q("s72Preview"); if(!host)return;
  const job=s72Jobs().find(j=>j.id===jobId); const profile=s72Profile();
  if(!job){host.innerHTML='<div class="panel s7-empty">Choose a saved job first.</div>';return;}
  if(!profile.fullName&&!profile.resumeText){host.innerHTML='<div class="panel s7-empty">Complete or import your Profile before generating a CV.</div>';return;}
  const model=s72Model(job,profile); window.__s72Model=model; host.innerHTML=s72RenderCv(model);
  const pages=host.querySelectorAll(".cvpage").length; const count=s72q("s72PageCount"); if(count)count.textContent=`${pages} / 2 pages`;
}
async function s72Copy(){if(!window.__s72Model)return;try{await navigator.clipboard.writeText(s72Text(window.__s72Model));const b=s72q("s72Copy");if(b){const old=b.textContent;b.textContent="Copied";setTimeout(()=>b.textContent=old,1500);}}catch{alert("Copy failed. Please select the preview text manually.");}}
function s72Inject(){
  const page=s72q("tailorPage"); if(!page||s72q("s72Generator"))return false;
  if(!s72q("stage72Styles")){const style=document.createElement("style");style.id="stage72Styles";style.textContent=s72Css();document.head.appendChild(style);}
  const section=document.createElement("section"); section.id="s72Generator"; section.className="panel s72-builder";
  section.innerHTML=`<div><div class="eyebrow">TWO-PAGE CV GENERATOR</div><h3>Irish / Jake-style tailored CV</h3><p class="s72-warning">Single-column, ATS-safe and limited to a maximum of <strong>2 A4 pages</strong>. Content is condensed from verified profile evidence; unsupported requirements are never added.</p></div><div class="s72-toolbar"><button class="btn" id="s72Generate" type="button">Generate Tailored CV</button><button class="secondary-btn" id="s72Copy" type="button">Copy CV Text</button><button class="secondary-btn" id="s72Print" type="button">Print / Save PDF</button><span class="s72-pagecount" id="s72PageCount">0 / 2 pages</span></div><div id="s72Preview"></div>`;
  const output=s72q("s7Output"); (output?.parentNode||page).insertBefore(section,output?output.nextSibling:null);
  s72q("s72Generate")?.addEventListener("click",s72Build); s72q("s72Copy")?.addEventListener("click",s72Copy); s72q("s72Print")?.addEventListener("click",s72Print);
  s72q("s7BuildButton")?.addEventListener("click",()=>setTimeout(s72Build,20));
  return true;
}
function s72Init(){if(s72Inject())return;let tries=0;const timer=setInterval(()=>{tries++;if(s72Inject()||tries>40)clearInterval(timer);},150);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",s72Init);else s72Init();

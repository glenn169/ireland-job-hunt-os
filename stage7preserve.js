"use strict";

/* Stage 7.3 - Preserve-first CV tailoring.
   The uploaded CV is the source of truth. Existing factual sections are preserved verbatim;
   only explicitly enabled sections are tailored. */

const S73_PROFILE_KEY="irelandJobHuntOS_profileV1";
const S73_APP_KEY="irelandJobHuntOS";
const s73q=id=>document.getElementById(id);
const s73esc=value=>String(value||"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const s73norm=value=>String(value||"").toLowerCase().replace(/[^a-z0-9+#. ]/g," ").replace(/\s+/g," ").trim();
const s73uniq=values=>[...new Set(values.filter(Boolean))];

function s73Profile(){try{return JSON.parse(localStorage.getItem(S73_PROFILE_KEY)||"{}");}catch{return {};}}
function s73Jobs(){try{const s=JSON.parse(localStorage.getItem(S73_APP_KEY)||"{}");return Array.isArray(s.jobs)?s.jobs:[];}catch{return [];}}

const S73_HEADINGS={
  summary:/^(professional summary|profile|personal profile|career profile|career summary|summary|objective)$/i,
  skills:/^(skills|key skills|core skills|technical skills|professional skills|core competencies|competencies|tools & technologies)$/i,
  experience:/^(work experience|professional experience|employment history|employment|experience|career history)$/i,
  education:/^(education|academic background|academic qualifications|education & qualifications)$/i,
  projects:/^(projects|selected projects|personal projects|academic projects)$/i,
  certifications:/^(certifications|certificates|professional qualifications|licenses & certifications|licences & certifications)$/i,
  languages:/^(languages|language skills)$/i,
  additional:/^(additional information|interests|volunteering|volunteer experience|awards|achievements|publications|references)$/i
};

function s73Lines(text){return String(text||"").split(/\r?\n/).map(v=>v.replace(/\s+$/g,"")).filter(v=>v.trim());}
function s73HeadingKey(line){const clean=line.trim().replace(/:$/," ").trim();return Object.entries(S73_HEADINGS).find(([,rx])=>rx.test(clean))?.[0]||"";}

function s73ParseSource(text){
  const lines=s73Lines(text);
  const sections=[]; let current={key:"header",title:"",lines:[]}; sections.push(current);
  lines.forEach(line=>{
    const key=s73HeadingKey(line);
    if(key){current={key,title:line.trim(),lines:[]};sections.push(current);}else current.lines.push(line);
  });
  return sections.filter(section=>section.lines.length||section.key!=="header");
}

function s73JobTerms(job){
  const notes=String(job?.notes||"");
  const noteTerms=[];
  ["ATS keywords","Qualifications","Key requirements"].forEach(label=>{
    const m=notes.match(new RegExp(`${label}:\\s*([^\\n]+)`,`i`));
    if(m) noteTerms.push(...m[1].split(/,|\|/).map(v=>v.trim()));
  });
  const skills=Array.isArray(job?.requiredSkills)?job.requiredSkills:String(job?.requiredSkills||"").split(",");
  return s73uniq([job?.position,...skills,...noteTerms].filter(Boolean));
}

function s73ReorderSkillLine(line,terms){
  const delimiter=line.includes("|")?" | ":line.includes("•")?" • ":", ";
  const items=line.split(/,|\||•/).map(v=>v.trim()).filter(Boolean);
  if(items.length<2)return line;
  const ranked=items.map((item,index)=>{
    const n=s73norm(item); let score=0;
    terms.forEach(term=>{const t=s73norm(term);if(!t)return;if(n===t)score+=8;else if(n.includes(t)||t.includes(n))score+=5;else{const words=t.split(" ").filter(w=>w.length>2);score+=words.filter(w=>n.includes(w)).length;}});
    return {item,index,score};
  }).sort((a,b)=>b.score-a.score||a.index-b.index);
  return ranked.map(r=>r.item).join(delimiter);
}

function s73TailoredSummary(job,profile){
  const tailored=typeof s7TailorJob==="function"?s7TailorJob(job,profile):null;
  if(tailored?.summary){
    return tailored.summary.replace(/This draft uses only information.*$/i,"").replace(/should be edited.*$/i,"").trim();
  }
  return profile.experienceSummary||"";
}

function s73TransformSections(sections,job,profile,options){
  const terms=s73JobTerms(job);
  return sections.map(section=>{
    const copy={...section,lines:[...section.lines]};
    if(copy.key==="summary"&&options.summary){
      const summary=s73TailoredSummary(job,profile);
      if(summary) copy.lines=[summary];
    }
    if(copy.key==="skills"&&options.skills){
      copy.lines=copy.lines.map(line=>s73ReorderSkillLine(line,terms));
    }
    return copy;
  });
}

function s73SectionHtml(section){
  if(section.key==="header") return `<div class="p73-header">${section.lines.map((line,i)=>i===0?`<h1>${s73esc(line)}</h1>`:`<p>${s73esc(line)}</p>`).join("")}</div>`;
  const content=section.lines.map(line=>{
    const trimmed=line.trim();
    const bullet=/^[•*\-–—]/.test(trimmed);
    return bullet?`<div class="p73-bullet">${s73esc(trimmed.replace(/^[•*\-–—]\s*/,""))}</div>`:`<div class="p73-line">${s73esc(line)}</div>`;
  }).join("");
  return `<section class="p73-section" data-key="${section.key}"><h2>${s73esc(section.title||section.key)}</h2>${content}</section>`;
}

function s73PackPages(sections){
  const page1=[];const page2=[];
  let score1=0; const PAGE_TARGET=4200;
  sections.forEach(section=>{
    const size=(section.lines.join(" ").length||0)+(section.title?.length||0)+120;
    if(score1===0||score1+size<=PAGE_TARGET){page1.push(section);score1+=size;}else page2.push(section);
  });
  return [page1,page2.filter(Boolean)];
}

function s73Render(sections){
  const [p1,p2]=s73PackPages(sections);
  return `<div class="p73-pages"><article class="p73-page">${p1.map(s73SectionHtml).join("")}</article>${p2.length?`<article class="p73-page">${p2.map(s73SectionHtml).join("")}</article>`:""}</div>`;
}

function s73Css(){return `
.s73-options{display:grid;gap:9px;margin-top:12px;padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--surface2)}.s73-options label{display:flex;gap:9px;align-items:flex-start;font-size:12px}.s73-options small{display:block;color:var(--muted);margin-left:25px}.s73-lock{color:var(--accent)}.s73-source-note{font-size:11px;color:var(--muted);line-height:1.5}.p73-pages{display:grid;gap:18px;justify-content:center;padding:8px 0}.p73-page{width:210mm;min-height:297mm;max-height:297mm;overflow:hidden;box-sizing:border-box;background:#fff;color:#111;padding:12mm 15mm;font-family:Arial,Helvetica,sans-serif;font-size:9.5pt;line-height:1.28;box-shadow:0 10px 30px rgba(0,0,0,.28)}.p73-header{text-align:center;margin-bottom:7px}.p73-header h1{font-size:21pt;line-height:1.05;margin:0 0 4px}.p73-header p{font-size:8.5pt;margin:1px 0}.p73-section{margin-top:7px}.p73-section h2{font-size:10pt;text-transform:uppercase;letter-spacing:.45px;border-bottom:1px solid #222;padding-bottom:2px;margin:0 0 3px}.p73-line{margin:1.5px 0;white-space:pre-wrap}.p73-bullet{position:relative;padding-left:12px;margin:2px 0}.p73-bullet:before{content:'•';position:absolute;left:2px}.p73-overflow{border:2px solid #d94b4b!important}.s73-overflow-msg{display:none;color:#ff8d8d;font-size:11px}.s73-overflow-msg.show{display:block}@media(max-width:900px){.p73-pages{justify-content:start;overflow:auto}}
`;}

function s73Options(){return {summary:s73q("s73TailorSummary")?.checked!==false,skills:s73q("s73ReorderSkills")?.checked!==false};}
function s73Build(){
  const host=s72q("s72Preview"); if(!host)return;
  const jobId=s73q("s7JobSelect")?.value; const job=s73Jobs().find(j=>j.id===jobId); const profile=s73Profile();
  if(!job){host.innerHTML='<div class="panel s7-empty">Choose a saved job first.</div>';return;}
  const source=String(profile.resumeText||"").trim();
  if(source.length<80){host.innerHTML='<div class="panel s7-empty">Upload or paste the original CV in Profile first. Preserve-first tailoring needs the source CV text.</div>';return;}
  const sections=s73TransformSections(s73ParseSource(source),job,profile,s73Options());
  window.__s73Sections=sections; window.__s73Job=job; window.__s73Profile=profile;
  host.innerHTML=s73Render(sections);
  const pages=[...host.querySelectorAll(".p73-page")];
  let overflow=false;
  pages.forEach(page=>{if(page.scrollHeight>page.clientHeight+2){page.classList.add("p73-overflow");overflow=true;}});
  const msg=s73q("s73Overflow"); if(msg)msg.classList.toggle("show",overflow);
  const count=s72q("s72PageCount");if(count)count.textContent=`${pages.length} / 2 pages`;
  window.__s73Overflow=overflow;
}

function s73Text(){return (window.__s73Sections||[]).map(section=>[section.title,...section.lines].filter(Boolean).join("\n")).join("\n\n");}
async function s73Copy(){if(!window.__s73Sections)return;try{await navigator.clipboard.writeText(s73Text());const b=s72q("s72Copy");if(b){const old=b.textContent;b.textContent="Copied";setTimeout(()=>b.textContent=old,1400);}}catch{alert("Copy failed. Please select the preview text manually.");}}
function s73Print(){
  if(!window.__s73Sections)return;
  if(window.__s73Overflow){alert("This source CV cannot be preserved fully inside two pages at the current density. Reduce the original CV content before exporting; the app will not silently delete or clip your information.");return;}
  const preview=s72q("s72Preview");const win=window.open("","_blank","noopener,noreferrer");if(!win){alert("Please allow pop-ups to print or save the CV as PDF.");return;}
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Tailored CV</title><style>@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0}.p73-pages{display:block}.p73-page{width:210mm;height:297mm;overflow:hidden;padding:12mm 15mm;font-family:Arial,Helvetica,sans-serif;font-size:9.5pt;line-height:1.28;color:#111;background:#fff;page-break-after:always}.p73-page:last-child{page-break-after:auto}.p73-header{text-align:center;margin-bottom:7px}.p73-header h1{font-size:21pt;margin:0 0 4px}.p73-header p{font-size:8.5pt;margin:1px 0}.p73-section{margin-top:7px}.p73-section h2{font-size:10pt;text-transform:uppercase;border-bottom:1px solid #222;padding-bottom:2px;margin:0 0 3px}.p73-line{margin:1.5px 0;white-space:pre-wrap}.p73-bullet{position:relative;padding-left:12px;margin:2px 0}.p73-bullet:before{content:'•';position:absolute;left:2px}</style></head><body>${preview.innerHTML}</body></html>`);win.document.close();setTimeout(()=>win.print(),250);
}

function s73Inject(){
  const generator=s73q("s72Generator");if(!generator||s73q("s73Options"))return false;
  if(!s73q("stage73Styles")){const st=document.createElement("style");st.id="stage73Styles";st.textContent=s73Css();document.head.appendChild(st);}
  const box=document.createElement("div");box.id="s73Options";box.className="s73-options";
  box.innerHTML=`<strong>Preserve-first tailoring</strong><label><input id="s73TailorSummary" type="checkbox" checked><span>Tailor professional summary for the selected job</span></label><label><input id="s73ReorderSkills" type="checkbox" checked><span>Reorder existing skills by job relevance <em>(wording is unchanged)</em></span></label><div class="s73-lock">🔒 Work experience, employers, job titles, dates, education, certifications, projects and other source-CV content are preserved.</div><small>The uploaded/pasted CV in Profile is the master document. The generator does not recreate those sections from extracted profile fields.</small><div id="s73Overflow" class="s73-overflow-msg">The source CV is too dense to fit fully into two A4 pages without removing information. Export is blocked until the source content is reduced.</div>`;
  const toolbar=generator.querySelector(".s72-toolbar");generator.insertBefore(box,toolbar||null);
  const generate=s72q("s72Generate"),copy=s72q("s72Copy"),print=s72q("s72Print");
  generate?.addEventListener("click",e=>{e.stopImmediatePropagation();s73Build();},true);
  copy?.addEventListener("click",e=>{e.stopImmediatePropagation();s73Copy();},true);
  print?.addEventListener("click",e=>{e.stopImmediatePropagation();s73Print();},true);
  s73q("s73TailorSummary")?.addEventListener("change",()=>window.__s73Sections&&s73Build());
  s73q("s73ReorderSkills")?.addEventListener("change",()=>window.__s73Sections&&s73Build());
  return true;
}
function s73Init(){if(s73Inject())return;let tries=0;const timer=setInterval(()=>{tries++;if(s73Inject()||tries>50)clearInterval(timer);},150);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",s73Init);else s73Init();

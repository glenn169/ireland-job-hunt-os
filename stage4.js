"use strict";

/* Stage 4 - PDF-first CV workflow, fixed CV generation prompt and job-specific ATS checker. */
(function stage4Workflow(){
  const PROFILE_KEY="irelandJobHuntOS_profileV1";
  const APP_KEY="irelandJobHuntOS";
  const PDFJS_URL="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
  const PDFJS_WORKER_URL="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const uniq=a=>[...new Set(a.map(v=>String(v||"").trim()).filter(Boolean))];
  const split=v=>String(v||"").split(/\n|,|\|/).map(x=>x.trim()).filter(Boolean);
  const norm=v=>String(v||"").toLowerCase().replace(/[^a-z0-9+#. ]/g," ").replace(/\s+/g," ").trim();

  function profile(){try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||"{}");}catch{return {};}}
  function state(){try{return JSON.parse(localStorage.getItem(APP_KEY)||"{}");}catch{return {};}}
  function jobs(){const s=state();return Array.isArray(s.jobs)?s.jobs:[];}
  function saveState(s){localStorage.setItem(APP_KEY,JSON.stringify(s));}
  function profileText(p=profile()){return [p.fullName,p.location,p.yearsExperience,p.targetRoles,p.industries,p.workAuthorisation,p.drivingLicence,p.languages,p.education,p.certifications,p.professionalSkills,p.softSkills,p.experienceSummary,p.resumeText].filter(Boolean).join("\n");}

  function parseNotes(job){
    const text=String(job?.notes||"");
    const read=label=>{const m=text.match(new RegExp(`${label}:\\s*([^\\n]+)`,`i`));return m?split(m[1]):[];};
    return {keywords:read("ATS keywords"),requirements:read("Key requirements"),qualifications:read("Qualifications")};
  }
  function jobData(job){
    const n=parseNotes(job);
    return {
      keywords:uniq([...(Array.isArray(job?.requiredSkills)?job.requiredSkills:split(job?.requiredSkills)),...n.keywords]),
      requirements:uniq(n.requirements), qualifications:uniq(n.qualifications),
      description:String(job?.jobDescription||job?.description||job?.sourceDescription||"")
    };
  }
  function supported(term,text){
    const t=norm(term),p=norm(text); if(!t||!p)return false; if(p.includes(t))return true;
    const words=t.split(" ").filter(w=>w.length>2); if(!words.length)return false;
    return words.filter(w=>p.includes(w)).length/words.length>=0.65;
  }

  async function ensurePdfJs(){
    if(window.pdfjsLib)return window.pdfjsLib;
    await new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=PDFJS_URL;s.onload=resolve;s.onerror=()=>reject(new Error("Could not load PDF reader."));document.head.appendChild(s);});
    window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER_URL; return window.pdfjsLib;
  }
  async function pdfText(file){
    if(!file||!(file.type==="application/pdf"||/\.pdf$/i.test(file.name)))throw new Error("Please upload a PDF file.");
    if(file.size>10*1024*1024)throw new Error("PDF must be 10 MB or smaller.");
    const lib=await ensurePdfJs(); const data=await file.arrayBuffer(); const pdf=await lib.getDocument({data}).promise; const pages=[];
    for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const c=await page.getTextContent();pages.push(c.items.map(x=>x.str).join(" "));}
    return pages.join("\n");
  }

  function enforcePdfProfile(){
    const page=$("profilePage"); if(!page)return;
    page.querySelectorAll('input[type="file"]').forEach(input=>{input.accept=".pdf,application/pdf";});
    page.querySelectorAll(".s74-status").forEach(el=>{if(/PDF, DOCX or TXT|DOCX|TXT/i.test(el.textContent||""))el.textContent=(el.textContent||"").replace(/PDF, DOCX or TXT/gi,"PDF").replace(/PDF, DOCX or TXT/gi,"PDF");});
    if(typeof window.s74FileTypeAllowed==="function")window.s74FileTypeAllowed=file=>Boolean(file&&(file.type==="application/pdf"||/\.pdf$/i.test(file.name||"")));
  }

  function automateAnalyzerProfile(){
    const panel=document.querySelector("#analyzerPage .candidate-context-panel");
    if(panel){panel.innerHTML='<div class="analysis-card-head"><div><div class="eyebrow">PROFILE CV</div><h3>Using your saved Profile CV automatically</h3></div><span class="analysis-count">AUTO</span></div><p class="analysis-notice">Job analysis now matches this job directly against the CV saved in Profile. Update your Profile CV whenever you want to change the source candidate information.</p>'}
    const btn=$("analyzeJobButton"); if(btn&&!btn.dataset.s4Auto){btn.dataset.s4Auto="1";btn.addEventListener("click",()=>{
      const box=$("candidateContextInput"); if(box){const p=profile();box.value=typeof window.buildProfileContext==="function"?window.buildProfileContext(p):profileText(p);localStorage.setItem("irelandJobHuntOS_candidateContext",box.value);}
    },true);}
    const save=$("saveAnalysisToTracker"); if(save&&!save.dataset.s4Save){save.dataset.s4Save="1";save.addEventListener("click",()=>{
      const jd=$("jobDescriptionInput")?.value.trim()||""; if(!jd)return;
      setTimeout(()=>{const s=state();if(!Array.isArray(s.jobs)||!s.jobs.length)return;const newest=[...s.jobs].sort((a,b)=>String(b.id||"").localeCompare(String(a.id||"")))[0]||s.jobs[s.jobs.length-1];if(newest&&!newest.jobDescription){newest.jobDescription=jd;newest.analysisSavedAt=new Date().toISOString();saveState(s);}},50);
    },true);}
  }

  const promptIntro=`Create a professional CV/resume for me as a PDF file, using the exact structure, section order, and clean single-column layout below. Use a simple sans-serif font, bold section headings, horizontal rule under each heading, tight consistent spacing, and keep it to 1–2 pages. Do not add photos, graphics, or colour blocks — this must stay ATS (Applicant Tracking System) friendly.\n\nStructure to follow (omit a section entirely if I have no content for it):\n\n1. Header — Full Name (large, bold) | City, Country | Phone | Email | LinkedIn URL | GitHub/portfolio URL\n2. Professional Summary — 2–4 sentences: role/field, years or type of experience, key tools/technologies, what I'm seeking\n3. Core Skills — bullet list, 8–12 short skill phrases\n4. Certifications — bullet list, include \"In Progress\" where relevant\n5. Technical Skills — grouped sub-lines (e.g. Programming / Tools / Platforms / Frameworks & Standards / Other), each a single line of comma-separated items\n6. Professional Experience — reverse chronological. For each role: Job Title | Dates, Company, Location, then 2–3 achievement bullets starting with strong action verbs and including a metric/result where possible\n7. Projects — for each project: Title | Date, then 2–3 bullets describing what was built, tools used, and outcome\n8. Education — reverse chronological: Degree, Institution, Dates, GPA/CGPA if strong\n9. Achievements and Recognition — bullet list of awards, prizes, recognitions\n10. Availability / Work Authorization — include only if relevant.\n`;

  function generationPrompt(job){
    const p=profile(),d=jobData(job),source=profileText(p);
    const supportedKeywords=d.keywords.filter(k=>supported(k,source));
    return `${promptIntro}\nJOB-SPECIFIC ATS INSTRUCTIONS\nTarget role: ${job.position||""}\nCompany: ${job.company||""}\nATS keywords from this analysed job that are supported by the source CV: ${supportedKeywords.join(", ")||"None automatically verified"}\n\nUse these ATS keywords only where they are supported by the CV/profile information supplied below. Do not claim experience, certifications, tools, responsibilities or achievements that are not present in the source CV.\n\nDo not force unsupported keywords into the CV. Prioritise the verified keywords naturally in the Professional Summary, Core Skills, Technical Skills, experience bullets and projects only where the source CV provides evidence.\n\nMY DETAILS / SOURCE CV\nFull Name: ${p.fullName||""}\nLocation: ${p.location||""}\nTarget role I'm applying for: ${job.position||split(p.targetRoles)[0]||""}\nYears of experience: ${p.yearsExperience||""}\nCore / Professional Skills: ${p.professionalSkills||""}\nSoft Skills: ${p.softSkills||""}\nCertifications: ${p.certifications||""}\nEducation: ${p.education||""}\nLanguages: ${p.languages||""}\nWork Authorization: ${p.workAuthorisation||""}\nProfessional Summary notes: ${p.experienceSummary||""}\n\nSOURCE CV TEXT — this is the factual source of truth:\n${p.resumeText||""}\n\nFORMATTING AND WRITING RULES\n- Turn rough notes into concise, first-person-implied, results-oriented bullet points; do not use \"I\".\n- Quantify achievements only where a number or metric is actually supplied in the source CV.\n- Keep bullets to one line where possible and no more than two lines.\n- Do not invent experience, tools, certifications, dates, employers, responsibilities, achievements, metrics or education.\n- Keep the final CV ATS-friendly, single-column and 1–2 pages.\n- Deliver the final result as a PDF.`;
  }

  function replaceTailor(){
    const page=$("tailorPage"); if(!page||page.dataset.s4Done)return; page.dataset.s4Done="1";
    page.innerHTML=`<div class="page-heading"><div><div class="eyebrow">CV TARGETING</div><h1>CV Generation Prompt</h1><p>Generate a fixed, truthful CV prompt using your saved Profile CV and only the ATS keywords supported by your evidence.</p></div></div><div class="s4-stack"><section class="panel"><div class="s4-picker"><div class="field"><label for="s4PromptJob">Analysed job</label><select id="s4PromptJob"><option value="">Choose a saved job…</option></select></div><button class="btn" id="s4BuildPrompt" type="button">Build CV Generation Prompt</button></div><p class="s4-note">The prompt never adds unsupported requirements from the job description.</p></section><section class="panel" id="s4PromptPanel" hidden><div class="analysis-card-head"><div><div class="eyebrow">THE CV GENERATION PROMPT</div><h3>Ready to copy</h3></div><button class="btn" id="s4CopyPrompt" type="button">Copy Prompt</button></div><textarea id="s4PromptOutput" class="s4-prompt" readonly></textarea></section></div>`;
    const select=$("s4PromptJob");jobs().forEach(j=>{const o=document.createElement("option");o.value=j.id;o.textContent=`${j.position||"Role"} — ${j.company||"Company"}`;select.appendChild(o);});
    $("s4BuildPrompt")?.addEventListener("click",()=>{const job=jobs().find(j=>String(j.id)===String(select.value));if(!job){alert("Choose an analysed job first.");return;}if(profileText().length<80){alert("Upload or complete your Profile CV first.");return;}$("s4PromptOutput").value=generationPrompt(job);$("s4PromptPanel").hidden=false;});
    $("s4CopyPrompt")?.addEventListener("click",async()=>{const t=$("s4PromptOutput")?.value||"";if(!t)return;await navigator.clipboard.writeText(t);$("s4CopyPrompt").textContent="Copied";setTimeout(()=>$("s4CopyPrompt").textContent="Copy Prompt",1200);});
  }

  function scoreCv(text,job){
    const d=jobData(job),role=[job.position].filter(Boolean);
    const groups=[{name:"ATS keyword coverage",items:d.keywords,weight:45},{name:"Requirements alignment",items:d.requirements,weight:25},{name:"Qualifications / certifications",items:d.qualifications,weight:15},{name:"Role relevance",items:role,weight:15}];
    let total=0;const details=groups.map(g=>{const matched=g.items.filter(i=>supported(i,text)),missing=g.items.filter(i=>!supported(i,text));const rate=g.items.length?matched.length/g.items.length:(g.name==="Role relevance"?0:1);const points=Math.round(rate*g.weight);total+=points;return {...g,matched,missing,rate:Math.round(rate*100),points};});
    return {score:Math.max(0,Math.min(100,total)),details};
  }
  function renderScore(result,job){
    const host=$("s4AtsResult");host.hidden=false;host.innerHTML=`<section class="s4-score"><div><span>ATS match for</span><h3>${esc(job.position)} — ${esc(job.company)}</h3></div><strong>${result.score}%</strong></section><div class="s4-grid">${result.details.map(g=>`<article class="panel"><div class="analysis-card-head"><h3>${esc(g.name)}</h3><span class="analysis-count">${g.rate}%</span></div><p class="s4-note">${g.points}/${g.weight} weighted points</p><div class="s4-chip-row">${g.matched.map(x=>`<span class="s4-chip good">✓ ${esc(x)}</span>`).join("")||'<span class="s4-note">No verified matches in this category.</span>'}</div>${g.missing.length?`<h4>Missing / not detected</h4><div class="s4-chip-row">${g.missing.slice(0,18).map(x=>`<span class="s4-chip warn">${esc(x)}</span>`).join("")}</div>`:""}</article>`).join("")}</div><section class="panel"><strong>How to use this score:</strong> Improve missing items only when they are genuinely supported by your experience. The checker measures textual alignment; it cannot predict an employer's proprietary ATS decision.</section>`;
  }

  function createAtsPage(){
    if($("atsPage"))return;
    const anchor=$("placeholderPage")||document.querySelector("main.content .page:last-child"); if(!anchor)return;
    const page=document.createElement("section");page.className="page";page.id="atsPage";page.innerHTML=`<div class="page-heading"><div><div class="eyebrow">JOB-SPECIFIC RESUME MATCHING</div><h1>ATS Checker</h1><p>Select an analysed job, then score either your saved Profile CV or an updated tailored PDF against that exact job.</p></div></div><div class="s4-stack"><section class="panel"><div class="s4-grid"><div class="field"><label for="s4AtsJob">Analysed job</label><select id="s4AtsJob"><option value="">Choose a saved job…</option></select></div><div class="field"><label for="s4AtsSource">CV source</label><select id="s4AtsSource"><option value="profile">Saved Profile CV</option><option value="upload">Upload tailored CV PDF</option></select></div></div><div class="field" id="s4UploadWrap" hidden><label for="s4AtsPdf">Tailored CV PDF</label><input id="s4AtsPdf" type="file" accept=".pdf,application/pdf"><span class="s4-note" id="s4PdfStatus">PDF only · Maximum 10 MB.</span></div><button class="btn" id="s4CheckAts" type="button">Check ATS Score</button></section><div id="s4AtsResult" hidden></div></div>`;anchor.parentNode.insertBefore(page,anchor);
    const nav=document.querySelector(".nav");if(nav&&!nav.querySelector('[data-page="ats"]')){const b=document.createElement("button");b.dataset.page="ats";b.textContent="▤ ATS Checker";const skills=nav.querySelector('[data-page="skills"]');nav.insertBefore(b,skills||null);b.addEventListener("click",showAts);}
    refreshAtsJobs();$("s4AtsSource")?.addEventListener("change",e=>{$("s4UploadWrap").hidden=e.target.value!=="upload";});
    $("s4CheckAts")?.addEventListener("click",async()=>{const job=jobs().find(j=>String(j.id)===String($("s4AtsJob").value));if(!job){alert("Choose an analysed job first.");return;}let text="";if($("s4AtsSource").value==="profile")text=profileText();else{const file=$("s4AtsPdf")?.files?.[0];if(!file){alert("Upload the tailored CV PDF first.");return;}try{$("s4PdfStatus").textContent="Reading PDF…";text=await pdfText(file);$("s4PdfStatus").textContent=`Read ${file.name} · ${text.length.toLocaleString()} characters`; }catch(e){alert(e.message);return;}}if(text.length<80){alert("The selected CV does not contain enough readable text to score.");return;}renderScore(scoreCv(text,job),job);});
  }
  function refreshAtsJobs(){const s=$("s4AtsJob");if(!s)return;const current=s.value;s.innerHTML='<option value="">Choose a saved job…</option>';jobs().forEach(j=>{const o=document.createElement("option");o.value=j.id;o.textContent=`${j.position||"Role"} — ${j.company||"Company"}`;s.appendChild(o);});if([...s.options].some(o=>o.value===current))s.value=current;}
  function showAts(){document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.page==="ats"));$("atsPage")?.classList.add("active");if($("pageTitle"))$("pageTitle").textContent="ATS Checker";$("sidebar")?.classList.remove("open");refreshAtsJobs();window.scrollTo({top:0,behavior:"smooth"});}

  function styles(){if($("stage4Styles"))return;const s=document.createElement("style");s.id="stage4Styles";s.textContent=`.s4-stack{display:grid;gap:16px}.s4-picker{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:end}.s4-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.s4-prompt{width:100%;min-height:620px;margin-top:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.55}.s4-note{display:block;color:var(--muted);font-size:11px;line-height:1.5;margin-top:7px}.s4-score{display:flex;justify-content:space-between;gap:20px;align-items:center;padding:20px;border:1px solid var(--border);background:var(--surface);border-radius:14px}.s4-score span{color:var(--muted);font-size:11px}.s4-score h3{margin:4px 0 0}.s4-score>strong{font-size:42px;color:var(--accent)}.s4-chip-row{display:flex;gap:7px;flex-wrap:wrap}.s4-chip{padding:6px 9px;border-radius:999px;border:1px solid var(--border);font-size:10px}.s4-chip.good{border-color:rgba(40,209,124,.35);color:var(--accent)}.s4-chip.warn{border-color:rgba(245,186,69,.35);color:var(--warn)}@media(max-width:760px){.s4-picker,.s4-grid{grid-template-columns:1fr}.s4-score>strong{font-size:34px}}`;document.head.appendChild(s);}

  function init(){styles();automateAnalyzerProfile();replaceTailor();createAtsPage();enforcePdfProfile();
    const observer=new MutationObserver(()=>{automateAnalyzerProfile();replaceTailor();createAtsPage();enforcePdfProfile();});observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();

"use strict";

/* Stage 4A - PDF-only Profile CV import.
   Narrow compatibility layer: keeps the existing Profile parser and UI,
   but restricts Profile/Master CV uploads to PDF and reuses PDF.js extraction.

   Stage 4B - Job Analyzer automatically uses the saved Profile CV.
   The existing candidate context field remains in the DOM for analyzer compatibility,
   but users no longer need to edit or save it manually.

   Stage 4C - CV Generation Prompt.
   Replaces the old built-in CV generator with a copyable prompt built only from
   the saved Profile/CV and ATS/job terms supported by that source evidence. */
(function stage4aPdfProfileImport(){
  const PDF_ACCEPT = ".pdf,application/pdf";
  const PROFILE_PAGE_ID = "profilePage";
  const PROFILE_KEY = "irelandJobHuntOS_profileV1";
  const APP_KEY = "irelandJobHuntOS";

  function isPdf(file){
    if(!file) return false;
    return file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
  }

  function setStatus(message, bad=false){
    const candidates = [
      document.getElementById("cvImportStatus"),
      document.getElementById("s74MasterStatus"),
      document.querySelector("#profilePage .profile-import-status")
    ].filter(Boolean);
    candidates.forEach(el=>{
      el.textContent = message;
      if(el.classList?.contains("s74-status")){
        el.classList.toggle("bad", bad);
        if(!bad) el.classList.remove("bad");
      }
    });
  }

  function enforceFileInputs(){
    const page = document.getElementById(PROFILE_PAGE_ID);
    if(!page) return;
    page.querySelectorAll('input[type="file"]').forEach(input=>{
      input.accept = PDF_ACCEPT;
      input.dataset.stage4aPdfOnly = "1";
    });

    page.querySelectorAll("small, .s74-status, .profile-note, .analysis-notice").forEach(el=>{
      const text = el.textContent || "";
      if(/PDF,\s*DOCX\s*or\s*TXT/i.test(text)) el.textContent = text.replace(/PDF,\s*DOCX\s*or\s*TXT/gi,"PDF");
    });
  }

  function installPdfOnlyExtractor(){
    if(typeof window.extractPdfText !== "function") return false;
    if(window.__stage4aOriginalExtractCvText === undefined){
      window.__stage4aOriginalExtractCvText = window.extractCvText;
    }
    window.extractCvText = async function stage4aExtractCvText(file){
      if(!isPdf(file)) throw new Error("Unsupported file type. Please upload a PDF CV.");
      return window.extractPdfText(file);
    };
    return true;
  }

  function installCloudRestriction(){
    if(typeof window.s74FileTypeAllowed === "function"){
      window.s74FileTypeAllowed = file => isPdf(file);
    }
  }

  function rejectNonPdf(event){
    const input = event.target;
    if(!(input instanceof HTMLInputElement) || input.type !== "file") return;
    if(!input.closest(`#${PROFILE_PAGE_ID}`)) return;
    const file = input.files?.[0];
    if(!file || isPdf(file)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    input.value = "";
    setStatus("Please upload your CV as a PDF file.", true);
    window.alert("Please upload your CV as a PDF file.");
  }

  function readProfile(){
    try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||"{}");}
    catch{return {};}
  }

  function readJobs(){
    try{
      const state=JSON.parse(localStorage.getItem(APP_KEY)||"{}");
      return Array.isArray(state.jobs)?state.jobs:[];
    }catch{return [];}
  }

  function profileSource(profile){
    return [
      profile.fullName, profile.location, profile.yearsExperience, profile.targetRoles,
      profile.industries, profile.workAuthorisation, profile.drivingLicence, profile.languages,
      profile.education, profile.certifications, profile.professionalSkills, profile.softSkills,
      profile.experienceSummary, profile.resumeText
    ].filter(Boolean).join("\n");
  }

  function splitItems(value){
    return String(value||"").split(/\n|,|\|/).map(v=>v.trim()).filter(Boolean);
  }

  function normalise(value){
    return String(value||"").toLowerCase().replace(/[^a-z0-9+#. ]/g," ").replace(/\s+/g," ").trim();
  }

  function supported(term, source){
    const target=normalise(term), haystack=normalise(source);
    if(!target||!haystack) return false;
    if(haystack.includes(target)) return true;
    const words=target.split(" ").filter(w=>w.length>2);
    if(!words.length) return false;
    return words.filter(w=>haystack.includes(w)).length/words.length>=0.65;
  }

  function noteItems(notes,label){
    const match=String(notes||"").match(new RegExp(`${label}:\\s*([^\\n]+)`,"i"));
    if(!match) return [];
    return splitItems(match[1]).filter(v=>!/^none\b/i.test(v));
  }

  function jobKeywordPool(job){
    const notes=String(job?.notes||"");
    const ats=noteItems(notes,"ATS keywords");
    const requirements=noteItems(notes,"Key requirements");
    const qualifications=noteItems(notes,"Qualifications");
    const requiredSkills=Array.isArray(job?.requiredSkills)?job.requiredSkills:splitItems(job?.requiredSkills||"");
    const title=String(job?.position||"").trim();
    const titleTerms=title?splitItems(title.replace(/[\/–—-]+/g,",")):[];
    return [...new Set([...ats,...requiredSkills,...requirements,...qualifications,...titleTerms].map(v=>v.trim()).filter(Boolean))];
  }

  function buildGenerationPrompt(job, profile){
    const source=profileSource(profile);
    const pool=jobKeywordPool(job);
    const keywords=pool.filter(keyword=>supported(keyword,source));
    const missing=pool.filter(keyword=>!supported(keyword,source));
    return `Create a professional CV/resume for me as a PDF file, using the exact structure, section order, and clean single-column layout below. Use a simple sans-serif font, bold section headings, a horizontal rule under each heading, tight consistent spacing, and keep it to 1–2 pages. Do not add photos, graphics, tables, columns, icons, or colour blocks. The document must remain ATS-friendly.\n\nTARGET JOB\nRole: ${job.position||""}\nCompany: ${job.company||""}\n\nSUPPORTED ATS / JOB KEYWORDS VERIFIED AGAINST THE SOURCE CV\n${keywords.length?keywords.join(", "):"No job-specific terms were automatically verified against the source CV."}\n\nMISSING OR UNSUPPORTED JOB TERMS — DO NOT INVENT THESE\n${missing.length?missing.join(", "):"No unsupported job terms were identified from the saved analysis."}\n\nUse the supported terms only where they are supported by the CV/profile information supplied below. Do not claim experience, certifications, tools, responsibilities or achievements that are not present in the source CV.\n\nDo not force unsupported job-description terms into the CV. Use the supported keywords naturally and only in sections where the source evidence justifies them.\n\nSTRUCTURE TO FOLLOW\n1. Header — Full Name | City/Country | Phone | Email | LinkedIn | GitHub/portfolio\n2. Professional Summary — 2–4 concise sentences covering role/field, experience, key technologies/skills and target role\n3. Core Skills — 8–12 short skill phrases supported by the source CV\n4. Certifications — include only certifications present in the source; mark In Progress only if the source says so\n5. Technical Skills — grouped as appropriate under Programming, Tools/Software, Platforms/OS, Frameworks & Standards, Other\n6. Professional Experience — reverse chronological; Job Title | Dates, Company, Location; then concise achievement/responsibility bullets\n7. Projects — Title | Date, then concise bullets describing what was built/done, tools actually used and outcome\n8. Education — reverse chronological; Degree, Institution, Dates and GPA/CGPA only if present and useful\n9. Achievements and Recognition — only awards/recognition present in the source\n10. Availability / Work Authorization — include only if relevant and present in the source\n\nWRITING RULES\n- Start bullets with strong action verbs where accurate.\n- Quantify achievements only when the source CV supplies the number, percentage, scale or measurable result.\n- Keep bullets tight, normally one line and no more than two lines.\n- Do not invent employers, dates, job titles, projects, education, tools, technologies, certifications, responsibilities, achievements or metrics.\n- Do not infer proficiency from a keyword unless the source actually supports that proficiency.\n- Preserve factual accuracy even if that means leaving a desirable job requirement out.\n- Return a polished final CV suitable for export as a 1–2 page PDF.\n\nPROFILE / CV INFORMATION\nFull Name: ${profile.fullName||""}\nLocation: ${profile.location||""}\nYears of Experience: ${profile.yearsExperience||""}\nTarget Roles: ${profile.targetRoles||""}\nProfessional / Technical Skills: ${profile.professionalSkills||""}\nSoft Skills: ${profile.softSkills||""}\nCertifications: ${profile.certifications||""}\nEducation: ${profile.education||""}\nLanguages: ${profile.languages||""}\nWork Authorization: ${profile.workAuthorisation||""}\nExperience Summary: ${profile.experienceSummary||""}\n\nSOURCE CV TEXT — factual source of truth\n${profile.resumeText||""}`;
  }

  function ensurePromptStyles(){
    if(document.getElementById("stage4cStyles")) return;
    const style=document.createElement("style");
    style.id="stage4cStyles";
    style.textContent=`.s4c-panel{display:grid;gap:14px}.s4c-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.s4c-prompt{width:100%;min-height:460px;resize:vertical;background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:10px;padding:14px;font:12px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}.s4c-note{font-size:11px;color:var(--muted);line-height:1.5}`;
    document.head.appendChild(style);
  }

  function installCvGenerationPrompt(){
    const page=document.getElementById("tailorPage");
    if(!page) return;

    const oldGenerator=document.getElementById("s72Generator");
    if(oldGenerator) oldGenerator.remove();

    ensurePromptStyles();
    if(document.getElementById("stage4cPrompt")) return;

    const output=document.getElementById("s7Output");
    const section=document.createElement("section");
    section.id="stage4cPrompt";
    section.className="panel s4c-panel";
    section.innerHTML=`<div><div class="eyebrow">THE CV GENERATION PROMPT</div><h3>Build an ATS-targeted prompt from verified CV evidence</h3><p class="s4c-note">Choose a saved analysed job above. The prompt checks ATS keywords, required skills, requirements, qualifications and role terms against your saved Profile/CV.</p></div><div class="s4c-toolbar"><button class="btn" id="stage4cBuild" type="button">Build CV Generation Prompt</button><button class="secondary-btn" id="stage4cCopy" type="button" disabled>Copy Prompt</button></div><textarea id="stage4cOutput" class="s4c-prompt" readonly placeholder="Your CV generation prompt will appear here."></textarea>`;
    (output?.parentNode||page).insertBefore(section,output?output.nextSibling:null);

    document.getElementById("stage4cBuild")?.addEventListener("click",()=>{
      const jobId=document.getElementById("s7JobSelect")?.value||"";
      const job=readJobs().find(item=>String(item.id)===String(jobId));
      const profile=readProfile();
      const source=profileSource(profile);
      if(!job){window.alert("Choose a saved analysed job first.");return;}
      if(source.length<80){window.alert("Complete or import your Profile CV first.");return;}
      const textarea=document.getElementById("stage4cOutput");
      textarea.value=buildGenerationPrompt(job,profile);
      document.getElementById("stage4cCopy").disabled=false;
    });

    document.getElementById("stage4cCopy")?.addEventListener("click",async()=>{
      const textarea=document.getElementById("stage4cOutput");
      if(!textarea?.value) return;
      try{
        await navigator.clipboard.writeText(textarea.value);
        const button=document.getElementById("stage4cCopy");
        const old=button.textContent;
        button.textContent="Copied";
        setTimeout(()=>button.textContent=old,1200);
      }catch{
        textarea.focus(); textarea.select();
        window.alert("Copy was blocked by the browser. The prompt has been selected so you can copy it manually.");
      }
    });
  }

  function refresh(){
    enforceFileInputs();
    installPdfOnlyExtractor();
    installCloudRestriction();
    installCvGenerationPrompt();
  }

  document.addEventListener("change", rejectNonPdf, true);

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", refresh, {once:true});
  } else {
    refresh();
  }

  const observer = new MutationObserver(()=>refresh());
  const startObserver = ()=>{
    const page = document.getElementById(PROFILE_PAGE_ID);
    if(page) observer.observe(page,{childList:true,subtree:true});
  };
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",startObserver,{once:true});
  else startObserver();

  let attempts=0;
  const timer=setInterval(()=>{
    refresh();
    attempts += 1;
    if(attempts >= 40) clearInterval(timer);
  },250);
})();

(function stage4bAnalyzerProfileAuto(){
  function syncFromProfile(){
    if(typeof window.loadStructuredProfile !== "function" || typeof window.syncAnalyzerContext !== "function") return;
    window.syncAnalyzerContext(window.loadStructuredProfile());
  }

  function init(){
    const page=document.getElementById("analyzerPage");
    if(!page) return;

    syncFromProfile();

    const oldPanel=page.querySelector(".candidate-context-panel");
    if(oldPanel) oldPanel.style.display="none";

    const inputPanel=page.querySelector(".analyzer-input-panel");
    if(inputPanel && !document.getElementById("stage4bProfileNotice")){
      const notice=document.createElement("section");
      notice.id="stage4bProfileNotice";
      notice.className="panel";
      notice.innerHTML='<div class="analysis-card-head"><div><div class="eyebrow">PROFILE CV</div><h3>Using your saved Profile CV automatically</h3></div><span class="analysis-count">AUTO</span></div><p class="analysis-notice">Paste only the job description below. The Job Analyzer automatically matches it against the CV and profile information saved on your Profile page.</p>';
      inputPanel.parentNode.insertBefore(notice,inputPanel);
    }

    const analyzeButton=document.getElementById("analyzeJobButton");
    if(analyzeButton && !analyzeButton.dataset.stage4bBound){
      analyzeButton.dataset.stage4bBound="1";
      analyzeButton.addEventListener("click",syncFromProfile,true);
    }
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();

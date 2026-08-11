"use strict";

/* Stage 5.1 - universal Profile & Skills Manager + browser-only CV import */
const STRUCTURED_PROFILE_KEY = "irelandJobHuntOS_profileV1";
const LEGACY_PROFILE_CONTEXT_KEY = "irelandJobHuntOS_candidateContext";

const PROFILE_DEFAULTS = {
  fullName:"", location:"", yearsExperience:"", targetRoles:"", industries:"",
  preferredArrangement:"", preferredLocations:"", salaryPreference:"", workAuthorisation:"",
  drivingLicence:"", languages:"", education:"", certifications:"", professionalSkills:"",
  softSkills:"", experienceSummary:"", resumeText:""
};

const q = id => document.getElementById(id);
const splitList = value => String(value||"").split(/,|\n/).map(v=>v.trim()).filter(Boolean);
const uniq = values => [...new Set(values.filter(Boolean))];

function loadStructuredProfile(){
  try { return {...PROFILE_DEFAULTS, ...JSON.parse(localStorage.getItem(STRUCTURED_PROFILE_KEY)||"{}")}; }
  catch { return {...PROFILE_DEFAULTS}; }
}

function buildProfileContext(profile){
  const sections = [
    ["Name", profile.fullName], ["Location", profile.location], ["Years of experience", profile.yearsExperience],
    ["Target roles", profile.targetRoles], ["Industries", profile.industries], ["Preferred work arrangement", profile.preferredArrangement],
    ["Preferred locations", profile.preferredLocations], ["Salary preference", profile.salaryPreference], ["Work authorisation", profile.workAuthorisation],
    ["Driving licence", profile.drivingLicence], ["Languages", profile.languages], ["Education", profile.education],
    ["Certifications", profile.certifications], ["Professional skills", profile.professionalSkills], ["Soft skills", profile.softSkills],
    ["Experience summary", profile.experienceSummary], ["Resume / profile text", profile.resumeText]
  ];
  return sections.filter(([,v])=>String(v||"").trim()).map(([label,v])=>`${label}: ${String(v).trim()}`).join("\n");
}

function profileCompleteness(profile){
  const weighted = ["targetRoles","professionalSkills","experienceSummary","education","certifications","location","yearsExperience","workAuthorisation","resumeText"];
  const filled = weighted.filter(key=>String(profile[key]||"").trim()).length;
  return Math.round((filled/weighted.length)*100);
}

function fillProfileForm(profile){
  Object.keys(PROFILE_DEFAULTS).forEach(key=>{ const el=q(`profile_${key}`); if(el) el.value=profile[key]||""; });
  updateProfileSummary(profile);
}

function collectProfileForm(){
  const profile={};
  Object.keys(PROFILE_DEFAULTS).forEach(key=>{ profile[key]=(q(`profile_${key}`)?.value||"").trim(); });
  return profile;
}

function updateProfileSummary(profile){
  const completeness=profileCompleteness(profile);
  if(q("profileCompleteness")) q("profileCompleteness").textContent=`${completeness}%`;
  if(q("profileCompletenessBar")) q("profileCompletenessBar").style.width=`${completeness}%`;
  const skills=uniq([...splitList(profile.professionalSkills),...splitList(profile.softSkills)]);
  if(q("profileSkillCount")) q("profileSkillCount").textContent=skills.length;
  if(q("profileTargetCount")) q("profileTargetCount").textContent=splitList(profile.targetRoles).length;
  if(q("profileCertCount")) q("profileCertCount").textContent=splitList(profile.certifications).length;
  renderSkillsView(profile);
}

function syncWithMainApp(profile){
  const roles=splitList(profile.targetRoles);
  try {
    if(typeof appState!=="undefined"){
      appState.profile = {...(appState.profile||{}), targetRoles:roles};
      if(typeof saveState==="function") saveState(appState);
      if(typeof renderRoles==="function") renderRoles();
      if(typeof addActivity==="function") { addActivity("Updated candidate profile"); if(typeof saveState==="function") saveState(appState); }
    }
  } catch(error){ console.warn("Profile sync with main state skipped", error); }
}

function syncAnalyzerContext(profile){
  const context=buildProfileContext(profile);
  localStorage.setItem(LEGACY_PROFILE_CONTEXT_KEY,context);
  const analyzerBox=q("candidateContextInput");
  if(analyzerBox){ analyzerBox.value=context; }
  if(q("candidateContextCount")) q("candidateContextCount").textContent=`${context.length} characters`;
  if(q("profileContextStatus")) q("profileContextStatus").textContent=context?"Profile":"Empty";
}

function saveProfile(event){
  event?.preventDefault();
  const profile=collectProfileForm();
  localStorage.setItem(STRUCTURED_PROFILE_KEY,JSON.stringify(profile));
  syncAnalyzerContext(profile);
  syncWithMainApp(profile);
  updateProfileSummary(profile);
  if(q("profileSaveStatus")){ q("profileSaveStatus").textContent="Saved locally"; setTimeout(()=>{ if(q("profileSaveStatus")) q("profileSaveStatus").textContent=""; },2200); }
}

function clearStructuredProfile(){
  if(!window.confirm("Clear the structured profile and saved analyzer profile context from this browser?")) return;
  localStorage.removeItem(STRUCTURED_PROFILE_KEY);
  localStorage.removeItem(LEGACY_PROFILE_CONTEXT_KEY);
  fillProfileForm({...PROFILE_DEFAULTS});
  syncWithMainApp({...PROFILE_DEFAULTS});
  syncAnalyzerContext({...PROFILE_DEFAULTS});
}

function migrateExistingContext(){
  if(localStorage.getItem(STRUCTURED_PROFILE_KEY)) return;
  const old=localStorage.getItem(LEGACY_PROFILE_CONTEXT_KEY)||"";
  if(!old.trim()) return;
  const migrated={...PROFILE_DEFAULTS,resumeText:old};
  localStorage.setItem(STRUCTURED_PROFILE_KEY,JSON.stringify(migrated));
}

function renderChipSet(id, values){
  const el=q(id); if(!el) return; el.innerHTML="";
  if(!values.length){ el.innerHTML='<span class="profile-empty">Nothing added yet.</span>'; return; }
  values.forEach(value=>{ const chip=document.createElement("span"); chip.className="profile-chip"; chip.textContent=value; el.appendChild(chip); });
}

function renderSkillsView(profile){
  const professional=uniq(splitList(profile.professionalSkills));
  const soft=uniq(splitList(profile.softSkills));
  const certifications=uniq(splitList(profile.certifications));
  const languages=uniq(splitList(profile.languages));
  renderChipSet("skillsProfessional",professional);
  renderChipSet("skillsSoft",soft);
  renderChipSet("skillsCertifications",certifications);
  renderChipSet("skillsLanguages",languages);
  const all=uniq([...professional,...soft,...certifications,...languages]);
  if(q("skillsTotal")) q("skillsTotal").textContent=all.length;
  if(q("skillsProfessionalCount")) q("skillsProfessionalCount").textContent=professional.length;
  if(q("skillsSoftCount")) q("skillsSoftCount").textContent=soft.length;
  if(q("skillsCertCount")) q("skillsCertCount").textContent=certifications.length;
}

/* ---------- Stage 5.1: CV import ---------- */
const CV_MAX_BYTES = 8 * 1024 * 1024;
const PDFJS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
const PDFJS_WORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
const MAMMOTH_URL = "https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js";

function loadExternalScript(src, globalName){
  if(globalName && window[globalName]) return Promise.resolve(window[globalName]);
  return new Promise((resolve,reject)=>{
    const existing=[...document.scripts].find(s=>s.src===src);
    if(existing){ existing.addEventListener("load",()=>resolve(globalName?window[globalName]:true),{once:true}); existing.addEventListener("error",reject,{once:true}); return; }
    const script=document.createElement("script"); script.src=src; script.async=true;
    script.onload=()=>resolve(globalName?window[globalName]:true); script.onerror=()=>reject(new Error("Could not load the CV reader library."));
    document.head.appendChild(script);
  });
}

async function extractPdfText(file){
  await loadExternalScript(PDFJS_URL,"pdfjsLib");
  window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER_URL;
  const data=await file.arrayBuffer();
  const pdf=await window.pdfjsLib.getDocument({data}).promise;
  const pages=[];
  for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i); const content=await page.getTextContent();
    pages.push(content.items.map(item=>item.str).join(" "));
  }
  return pages.join("\n");
}

async function extractDocxText(file){
  await loadExternalScript(MAMMOTH_URL,"mammoth");
  const arrayBuffer=await file.arrayBuffer();
  const result=await window.mammoth.extractRawText({arrayBuffer});
  return result.value||"";
}

async function extractCvText(file){
  const name=file.name.toLowerCase();
  if(name.endsWith(".txt")) return file.text();
  if(name.endsWith(".pdf") || file.type==="application/pdf") return extractPdfText(file);
  if(name.endsWith(".docx") || file.type==="application/vnd.openxmlformats-officedocument.wordprocessingml.document") return extractDocxText(file);
  throw new Error("Unsupported file type. Please upload a PDF, DOCX or TXT CV.");
}

function cvLines(text){ return text.split(/\r?\n/).map(line=>line.replace(/\s+/g," ").trim()).filter(Boolean); }
function sectionFromCv(text, headings, stopHeadings){
  const lines=cvLines(text); const headingRx=new RegExp(`^(${headings.join("|")})\\s*:?$`,"i");
  const stopRx=new RegExp(`^(${stopHeadings.join("|")})\\s*:?$`,"i");
  let active=false; const out=[];
  for(const line of lines){
    if(headingRx.test(line)){ active=true; continue; }
    if(active && stopRx.test(line)) break;
    if(active) out.push(line);
  }
  return out.join("\n").trim();
}

function detectCvName(text){
  const lines=cvLines(text).slice(0,8);
  return lines.find(line=>/^[A-Za-zÀ-ÖØ-öø-ÿ'’-]+(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ'’-]+){1,4}$/.test(line) && !/curriculum|resume|profile|summary|experience|education/i.test(line))||"";
}

function detectCvLocation(text){
  const locations=["Dublin","Cork","Galway","Limerick","Waterford","Kilkenny","Sligo","Athlone","Dundalk","Drogheda","Letterkenny","Wexford","Kildare","Naas","Carlow","Mullingar","Shannon","Clare","Meath","Wicklow","Donegal"];
  const hit=locations.find(place=>new RegExp(`\\b${place}\\b`,"i").test(text));
  return hit?`${hit}, Ireland`:(/\bIreland\b/i.test(text)?"Ireland":"");
}

function detectCvYears(text){
  const matches=[...text.matchAll(/(\d{1,2})(?:\+)?\s+years?(?:'| of)?\s+(?:relevant |professional |work )?experience/gi)].map(m=>Number(m[1])).filter(n=>n<=60);
  return matches.length?String(Math.max(...matches)):"";
}

function detectCvHeadline(text){
  const lines=cvLines(text).slice(0,12);
  const roleWords=/analyst|accountant|engineer|manager|specialist|consultant|administrator|developer|designer|nurse|scientist|technician|coordinator|executive|associate|assistant|officer|advisor|controller|recruiter|sales|marketing|finance|operations|support/i;
  return lines.find(line=>line.length<80 && roleWords.test(line) && !/@|linkedin|profile|summary|experience/i.test(line))||"";
}

function detectCvWorkAuthorisation(text){
  const patterns=[/Stamp\s*[124](?:G)?/i,/EU citizen/i,/Irish citizen/i,/right to work in Ireland/i,/eligible to work in Ireland/i,/work permit/i,/critical skills permit/i,/general employment permit/i];
  const hits=patterns.map(rx=>text.match(rx)?.[0]).filter(Boolean);
  return uniq(hits).join(", ");
}

function detectCvDrivingLicence(text){
  const match=text.match(/(?:full\s+)?(?:irish|european|eu)?\s*(?:clean\s+)?driving licen[cs]e/i);
  return match?match[0]:"";
}

function detectCvLanguages(text){
  const section=sectionFromCv(text,["languages","language skills"],["education","experience","employment","skills","certifications","projects","references","interests"]);
  if(section) return section.split(/\n/).map(line=>line.replace(/[•|-]/g,"").trim()).filter(Boolean).join(", ");
  const known=["English","Irish","French","German","Spanish","Portuguese","Hindi","Urdu","Arabic","Polish","Romanian","Italian","Mandarin","Chinese","Malayalam","Tamil","Telugu","Kannada","Marathi","Bengali"];
  return known.filter(lang=>new RegExp(`\\b${lang}\\b`,"i").test(text)).join(", ");
}

function detectCvEducation(text){
  return sectionFromCv(text,["education","academic background","academic qualifications","education & qualifications"],["experience","employment","work experience","skills","certifications","projects","languages","references","interests"]);
}

function detectCvCertifications(text){
  const section=sectionFromCv(text,["certifications","certificates","professional qualifications","licenses & certifications","licences & certifications"],["education","experience","employment","skills","projects","languages","references","interests"]);
  const known=["ACCA","ACA","CIMA","CPA","CFA","PMP","PRINCE2","CCNA","CCNP","JNCIA","JNCIP","CIPD","NMBI","Safe Pass","Security+","Network+","CISSP","CISM","CEH","AZ-900","SC-900","SC-200","AWS Certified"];
  const found=known.filter(cert=>text.toLowerCase().includes(cert.toLowerCase()));
  return uniq([...(section?section.split(/\n/):[]),...found]).join("\n");
}

function detectCvProfessionalSkills(text){
  let found=[];
  try { if(typeof detectSkills==="function") found=detectSkills(text.toLowerCase()); } catch(error){ console.warn("Universal skill detector unavailable",error); }
  const skillsSection=sectionFromCv(text,["skills","key skills","technical skills","professional skills","core competencies","competencies","tools & technologies"],["education","experience","employment","certifications","projects","languages","references","interests"]);
  if(skillsSection){
    const sectionItems=skillsSection.split(/\n|,|•|\|/).map(v=>v.trim()).filter(v=>v.length>1&&v.length<70);
    found.push(...sectionItems);
  }
  return uniq(found).slice(0,50).join(", ");
}

function detectCvSoftSkills(text){
  const catalogue=["Communication","Problem Solving","Leadership","Teamwork","Time Management","Attention to Detail","Stakeholder Management","Negotiation","Adaptability","Organisation","Customer Service","Analytical Thinking","Critical Thinking","Presentation Skills","Collaboration"];
  const aliases={"Problem Solving":["problem solving","problem-solving"],"Time Management":["time management"],"Attention to Detail":["attention to detail"],"Stakeholder Management":["stakeholder management"],"Analytical Thinking":["analytical thinking","analytical skills"],"Critical Thinking":["critical thinking"],"Presentation Skills":["presentation skills"],"Customer Service":["customer service","customer support"]};
  return catalogue.filter(skill=>(aliases[skill]||[skill]).some(term=>text.toLowerCase().includes(term.toLowerCase()))).join(", ");
}

function detectCvExperience(text){
  return sectionFromCv(text,["work experience","professional experience","employment history","employment","experience","career history"],["education","skills","certifications","projects","languages","references","interests","additional information"]);
}

function parseCvProfile(text){
  const clean=text.replace(/\u0000/g,"").replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim();
  return {
    fullName:detectCvName(clean), location:detectCvLocation(clean), yearsExperience:detectCvYears(clean), targetRoles:detectCvHeadline(clean),
    workAuthorisation:detectCvWorkAuthorisation(clean), drivingLicence:detectCvDrivingLicence(clean), languages:detectCvLanguages(clean),
    education:detectCvEducation(clean), certifications:detectCvCertifications(clean), professionalSkills:detectCvProfessionalSkills(clean),
    softSkills:detectCvSoftSkills(clean), experienceSummary:detectCvExperience(clean), resumeText:clean
  };
}

function applyCvProfile(detected){
  let updated=0;
  Object.entries(detected).forEach(([key,value])=>{
    if(!value) return;
    const el=q(`profile_${key}`); if(!el) return;
    if(!el.value.trim() || key==="resumeText") { el.value=value; updated++; }
  });
  const current=collectProfileForm(); updateProfileSummary(current);
  return updated;
}

function setCvImportStatus(message,state=""){
  const el=q("cvImportStatus"); if(!el) return; el.textContent=message; el.dataset.state=state;
}

async function handleCvUpload(event){
  const file=event.target.files?.[0]; if(!file) return;
  if(file.size>CV_MAX_BYTES){ setCvImportStatus("CV is too large. Please use a file under 8 MB.","error"); event.target.value=""; return; }
  setCvImportStatus(`Reading ${file.name}…`,"loading");
  try {
    const text=await extractCvText(file);
    if(text.replace(/\s/g,"").length<80) throw new Error("Very little selectable text was found. If this is a scanned/image-only PDF, save it as a text-based PDF or DOCX and try again.");
    const detected=parseCvProfile(text);
    const updated=applyCvProfile(detected);
    setCvImportStatus(`CV imported. ${updated} profile field${updated===1?"":"s"} filled. Review the details, then click Save Profile.`,"success");
  } catch(error){
    console.error(error); setCvImportStatus(error.message||"Could not read this CV.","error");
  } finally { event.target.value=""; }
}

function createCvImporter(){
  const form=q("profileForm"); if(!form||q("cvImportPanel")) return;
  const panel=document.createElement("section"); panel.className="panel cv-import-panel"; panel.id="cvImportPanel";
  panel.innerHTML=`
    <div class="cv-import-copy">
      <div class="eyebrow">QUICK PROFILE SETUP</div>
      <h3>Upload your CV to fill this profile</h3>
      <p>Select a PDF, DOCX or TXT CV. The file is read in your browser and is not uploaded to the Job Hunt OS server. Detected details fill empty profile fields automatically; review them before saving.</p>
      <div class="cv-import-status" id="cvImportStatus" aria-live="polite">Supported: PDF, DOCX, TXT · Maximum 8 MB</div>
    </div>
    <div class="cv-import-action">
      <input id="cvFileInput" class="cv-file-input" type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain">
      <label for="cvFileInput" class="btn cv-upload-button">↑ Upload CV</label>
    </div>`;
  form.insertBefore(panel,form.firstChild);
  q("cvFileInput")?.addEventListener("change",handleCvUpload);

  if(!q("cvImportStyles")){
    const style=document.createElement("style"); style.id="cvImportStyles";
    style.textContent=`
      .cv-import-panel{display:flex;justify-content:space-between;align-items:center;gap:24px;border-color:rgba(40,209,124,.32);background:linear-gradient(135deg,rgba(40,209,124,.06),var(--surface))}.cv-import-copy{max-width:760px}.cv-import-copy h3{margin:5px 0 7px}.cv-import-copy p{margin:0;color:var(--muted);font-size:12px;line-height:1.6}.cv-import-action{flex:0 0 auto}.cv-file-input{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;clip-path:inset(50%)}.cv-upload-button{cursor:pointer;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap}.cv-import-status{margin-top:10px;color:var(--muted2);font-size:11px}.cv-import-status[data-state="loading"]{color:var(--warn)}.cv-import-status[data-state="success"]{color:var(--accent)}.cv-import-status[data-state="error"]{color:#ff8d8d}@media(max-width:700px){.cv-import-panel{align-items:flex-start;flex-direction:column}.cv-import-action,.cv-upload-button{width:100%}}`;
    document.head.appendChild(style);
  }
}

function showStage5Page(page){
  if(!["profile","skills"].includes(page)) return;
  document.querySelectorAll(".page").forEach(section=>section.classList.remove("active"));
  document.querySelectorAll(".nav button").forEach(btn=>btn.classList.toggle("active",btn.dataset.page===page));
  const id=page==="profile"?"profilePage":"skillsPage";
  q(id)?.classList.add("active");
  if(q("pageTitle")) q("pageTitle").textContent=page==="profile"?"Candidate Profile":"Skills & Qualifications";
  q("sidebar")?.classList.remove("open");
  window.scrollTo({top:0,behavior:"smooth"});
  updateProfileSummary(loadStructuredProfile());
}

function setupStage5Navigation(){
  document.querySelectorAll('.nav button[data-page="profile"], .nav button[data-page="skills"]').forEach(button=>{
    button.addEventListener("click",()=>showStage5Page(button.dataset.page));
  });
  q("openProfileFromSkills")?.addEventListener("click",()=>showStage5Page("profile"));
}

function initStage5(){
  if(!q("profileForm")) return;
  migrateExistingContext();
  const profile=loadStructuredProfile();
  fillProfileForm(profile);
  syncAnalyzerContext(profile);
  createCvImporter();
  q("profileForm").addEventListener("submit",saveProfile);
  q("clearStructuredProfile")?.addEventListener("click",clearStructuredProfile);
  Object.keys(PROFILE_DEFAULTS).forEach(key=>q(`profile_${key}`)?.addEventListener("input",()=>updateProfileSummary(collectProfileForm())));
  setupStage5Navigation();
}

document.addEventListener("DOMContentLoaded",initStage5);

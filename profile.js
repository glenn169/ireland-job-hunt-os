"use strict";

/* Stage 5 - universal Profile & Skills Manager */
const STRUCTURED_PROFILE_KEY = "irelandJobHuntOS_profileV1";
const LEGACY_PROFILE_CONTEXT_KEY = "irelandJobHuntOS_candidateContext";

const PROFILE_DEFAULTS = {
  fullName:"", location:"", yearsExperience:"", targetRoles:"", industries:"",
  preferredArrangement:"", preferredLocations:"", salaryPreference:"", workAuthorisation:"",
  drivingLicence:"", languages:"", education:"", certifications:"", professionalSkills:"",
  softSkills:"", experienceSummary:"", resumeText:""
};

const q = id => document.getElementById(id);
const splitList = value => value.split(/,|\n/).map(v=>v.trim()).filter(Boolean);
const uniq = values => [...new Set(values)];

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
  q("profileForm").addEventListener("submit",saveProfile);
  q("clearStructuredProfile")?.addEventListener("click",clearStructuredProfile);
  Object.keys(PROFILE_DEFAULTS).forEach(key=>q(`profile_${key}`)?.addEventListener("input",()=>updateProfileSummary(collectProfileForm())));
  setupStage5Navigation();
}

document.addEventListener("DOMContentLoaded",initStage5);

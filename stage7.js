"use strict";

/* Stage 7 - Evidence-based CV Tailoring Assistant.
   Browser-only and deterministic: it reorganises existing profile evidence and never invents qualifications or experience. */

const S7_PROFILE_KEY = "irelandJobHuntOS_profileV1";
const S7_APP_KEY = "irelandJobHuntOS";
const S7_STOP = new Set("the a an and or to of in on for with from by as at is are be this that you your our we they it role job work working required preferred desirable essential have has ability strong excellent good knowledge experience skills skill years year within across using use provide support manage management responsible responsibilities candidate company opportunity looking including related relevant successful must should can who their through into about".split(" "));

const s7q = id => document.getElementById(id);
const s7Unique = values => [...new Set(values.filter(Boolean))];
const s7Split = value => String(value || "").split(/,|\n|\|/).map(v => v.trim()).filter(Boolean);

function s7ReadProfile(){
  try { return JSON.parse(localStorage.getItem(S7_PROFILE_KEY) || "{}"); }
  catch { return {}; }
}

function s7ReadJobs(){
  try {
    const state = JSON.parse(localStorage.getItem(S7_APP_KEY) || "{}");
    return Array.isArray(state.jobs) ? state.jobs : [];
  } catch { return []; }
}

function s7Normalise(value){
  return String(value || "").toLowerCase().replace(/[^a-z0-9+#. ]/g," ").replace(/\s+/g," ").trim();
}

function s7Tokens(value){
  return s7Normalise(value).split(" ").filter(token => token.length > 2 && !S7_STOP.has(token));
}

function s7EvidenceMatch(item, profileText){
  const target = s7Normalise(item);
  const profile = s7Normalise(profileText);
  if(!target || !profile) return false;
  if(profile.includes(target)) return true;
  const words = s7Tokens(item);
  if(!words.length) return false;
  const hits = words.filter(word => profile.includes(word)).length;
  return hits / words.length >= 0.65;
}

function s7ProfileText(profile){
  return [
    profile.fullName, profile.location, profile.yearsExperience, profile.targetRoles, profile.industries,
    profile.workAuthorisation, profile.drivingLicence, profile.languages, profile.education,
    profile.certifications, profile.professionalSkills, profile.softSkills,
    profile.experienceSummary, profile.resumeText
  ].filter(Boolean).join("\n");
}

function s7ParseAnalyzerNotes(notes){
  const text = String(notes || "");
  const valueAfter = label => {
    const match = text.match(new RegExp(`${label}:\\s*([^\\n]+)`,"i"));
    return match ? match[1].trim() : "";
  };
  const qualifications = s7Split(valueAfter("Qualifications")).filter(v => !/none explicitly detected/i.test(v));
  const requirements = s7Split(valueAfter("Key requirements")).filter(v => !/none explicitly detected/i.test(v));
  const keywords = s7Split(valueAfter("ATS keywords")).filter(v => !/none detected/i.test(v));
  return {qualifications, requirements, keywords};
}

function s7CandidateEvidenceLines(profile){
  const raw = [profile.experienceSummary, profile.resumeText].filter(Boolean).join("\n");
  return s7Unique(raw.split(/\r?\n|(?<=[.!?])\s+(?=[A-Z])/).map(line => line.replace(/^[•*\-–—\s]+/,"").trim()).filter(line => line.length >= 20 && line.length <= 320));
}

function s7LineScore(line, terms){
  const lineText = s7Normalise(line);
  let score = 0;
  terms.forEach(term => {
    const phrase = s7Normalise(term);
    if(phrase && lineText.includes(phrase)) score += 5;
    else {
      const words = s7Tokens(term);
      score += words.filter(word => lineText.includes(word)).length;
    }
  });
  if(/\b\d+(?:[.,]\d+)?%?\b/.test(line)) score += 2;
  return score;
}

function s7TailorJob(job, profile){
  const profileText = s7ProfileText(profile);
  const parsed = s7ParseAnalyzerNotes(job.notes);
  const skills = s7Unique([...(job.requiredSkills || []), ...parsed.keywords.slice(0,18)]);
  const qualifications = parsed.qualifications;
  const requirements = parsed.requirements;
  const matchedSkills = skills.filter(item => s7EvidenceMatch(item,profileText));
  const missingSkills = skills.filter(item => !s7EvidenceMatch(item,profileText));
  const matchedQualifications = qualifications.filter(item => s7EvidenceMatch(item,profileText));
  const missingQualifications = qualifications.filter(item => !s7EvidenceMatch(item,profileText));
  const matchedRequirements = requirements.filter(item => s7EvidenceMatch(item,profileText));
  const missingRequirements = requirements.filter(item => !s7EvidenceMatch(item,profileText));
  const rankingTerms = s7Unique([...matchedSkills,...matchedQualifications,...matchedRequirements,job.position]);
  const evidence = s7CandidateEvidenceLines(profile)
    .map(line => ({line,score:s7LineScore(line,rankingTerms)}))
    .filter(item => item.score > 0)
    .sort((a,b) => b.score-a.score)
    .slice(0,8)
    .map(item => item.line);
  const topSkills = matchedSkills.slice(0,6);
  const years = String(profile.yearsExperience || "").trim();
  const certs = matchedQualifications.slice(0,2);
  const summaryParts = [];
  if(years) summaryParts.push(`${years} years of experience`);
  if(topSkills.length) summaryParts.push(`evidence in ${topSkills.slice(0,4).join(", ")}`);
  if(certs.length) summaryParts.push(certs.join(" and "));
  const summary = summaryParts.length
    ? `Candidate targeting ${job.position} with ${summaryParts.join("; ")}. This draft uses only information already present in the saved profile and should be edited for tone before use.`
    : `Target role: ${job.position}. Add a concise summary using only verified evidence from your saved profile.`;
  const keywordCoverage = skills.length ? Math.round((matchedSkills.length/skills.length)*100) : null;
  return {
    job, matchedSkills, missingSkills, matchedQualifications, missingQualifications,
    matchedRequirements, missingRequirements, evidence, summary, keywordCoverage,
    useItems:s7Unique([...matchedSkills,...matchedQualifications,...matchedRequirements]).slice(0,18),
    avoidItems:s7Unique([...missingQualifications,...missingSkills,...missingRequirements]).slice(0,18)
  };
}

function s7EnsureStyles(){
  if(s7q("stage7Styles")) return;
  const style=document.createElement("style"); style.id="stage7Styles";
  style.textContent=`
  .s7-shell{display:grid;gap:16px}.s7-picker{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:end}.s7-results{display:grid;gap:16px}.s7-summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.s7-stat{padding:16px;background:var(--surface2);border:1px solid var(--border);border-radius:12px}.s7-stat span{display:block;color:var(--muted);font-size:11px}.s7-stat strong{display:block;font-size:24px;margin-top:5px}.s7-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.s7-section h3{margin:0 0 10px}.s7-list{display:grid;gap:8px}.s7-item{padding:10px 12px;border:1px solid var(--border);border-radius:9px;background:var(--surface2);font-size:12px;line-height:1.45}.s7-item.good{border-color:rgba(40,209,124,.28)}.s7-item.warn{border-color:rgba(245,186,69,.32)}.s7-chip-wrap{display:flex;flex-wrap:wrap;gap:7px}.s7-chip{padding:6px 9px;border-radius:999px;border:1px solid var(--border);background:var(--surface2);font-size:10px}.s7-chip.good{border-color:rgba(40,209,124,.35);color:var(--accent)}.s7-chip.warn{border-color:rgba(245,186,69,.35);color:var(--warn)}.s7-draft{white-space:pre-wrap;line-height:1.6;color:var(--text)}.s7-note{font-size:11px;color:var(--muted);line-height:1.5;margin-top:8px}.s7-actions{display:flex;gap:10px;flex-wrap:wrap}.s7-checklist{display:grid;gap:8px}.s7-check{display:flex;gap:9px;align-items:flex-start;font-size:12px}.s7-check b{color:var(--accent)}.s7-empty{text-align:center;padding:34px;color:var(--muted)}@media(max-width:900px){.s7-summary-grid{grid-template-columns:repeat(2,1fr)}.s7-grid{grid-template-columns:1fr}}@media(max-width:600px){.s7-picker{grid-template-columns:1fr}.s7-summary-grid{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(style);
}

function s7CreatePage(){
  if(s7q("tailorPage")) return;
  const placeholder=s7q("placeholderPage");
  if(!placeholder) return;
  const page=document.createElement("section"); page.className="page"; page.id="tailorPage";
  page.innerHTML=`
    <div class="page-heading"><div><div class="eyebrow">CV TARGETING</div><h1>CV Tailoring Assistant</h1><p>Choose a saved job and turn your existing profile evidence into a focused, truthful tailoring brief.</p></div></div>
    <div class="s7-shell">
      <section class="panel"><div class="s7-picker"><div class="field"><label for="s7JobSelect">Saved job</label><select id="s7JobSelect"><option value="">Choose a job…</option></select></div><button class="btn" id="s7BuildButton" type="button">Build Tailoring Brief</button></div><p class="s7-note">This tool does not invent achievements, qualifications or experience. Missing items are shown separately so they are not accidentally added to the CV.</p></section>
      <section id="s7Output" class="s7-results"><div class="panel s7-empty">Save jobs from the Job Analyzer, then choose one above to create a tailoring brief.</div></section>
    </div>`;
  placeholder.parentNode.insertBefore(page,placeholder);
}

function s7AddNavigation(){
  const nav=document.querySelector(".nav");
  if(!nav || nav.querySelector('[data-page="tailor"]')) return;
  const button=document.createElement("button"); button.dataset.page="tailor"; button.textContent="✦ CV Tailoring";
  const daily=nav.querySelector('[data-page="daily"]'); nav.insertBefore(button,daily || null);
  button.addEventListener("click",()=>s7ShowPage());
}

function s7PopulateJobs(){
  const select=s7q("s7JobSelect"); if(!select) return;
  const selected=select.value; select.innerHTML='<option value="">Choose a job…</option>';
  s7ReadJobs().forEach(job=>{
    const option=document.createElement("option"); option.value=job.id; option.textContent=`${job.position} — ${job.company}${job.matchScore!==""&&job.matchScore!=null?` (${job.matchScore}%)`:""}`; select.appendChild(option);
  });
  if([...select.options].some(o=>o.value===selected)) select.value=selected;
}

function s7ShowPage(){
  document.querySelectorAll(".page").forEach(section=>section.classList.remove("active"));
  document.querySelectorAll(".nav button").forEach(btn=>btn.classList.toggle("active",btn.dataset.page==="tailor"));
  s7q("tailorPage")?.classList.add("active");
  if(s7q("pageTitle")) s7q("pageTitle").textContent="CV Tailoring Assistant";
  s7q("sidebar")?.classList.remove("open");
  s7PopulateJobs(); window.scrollTo({top:0,behavior:"smooth"});
}

function s7RenderChips(values,type){
  if(!values.length) return '<span class="s7-note">None identified from the saved evidence.</span>';
  return `<div class="s7-chip-wrap">${values.map(v=>`<span class="s7-chip ${type}">${s7Escape(v)}</span>`).join("")}</div>`;
}

function s7Escape(value){
  return String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}

function s7BuildBrief(){
  const jobId=s7q("s7JobSelect")?.value;
  const output=s7q("s7Output"); if(!output) return;
  if(!jobId){ output.innerHTML='<div class="panel s7-empty">Choose a saved job first.</div>'; return; }
  const job=s7ReadJobs().find(item=>item.id===jobId); const profile=s7ReadProfile();
  if(!job){ output.innerHTML='<div class="panel s7-empty">That saved job could not be found.</div>'; return; }
  const profileText=s7ProfileText(profile);
  if(profileText.length<80){ output.innerHTML='<div class="panel s7-empty">Complete or import your Profile before tailoring a CV.</div>'; return; }
  const result=s7TailorJob(job,profile);
  const coverage=result.keywordCoverage===null?"N/A":`${result.keywordCoverage}%`;
  output.innerHTML=`
    <section class="s7-summary-grid">
      <article class="s7-stat"><span>Selected job</span><strong>${s7Escape(job.position)}</strong></article>
      <article class="s7-stat"><span>Current match score</span><strong>${job.matchScore!==""&&job.matchScore!=null?`${s7Escape(job.matchScore)}%`:"N/A"}</strong></article>
      <article class="s7-stat"><span>Relevant items found</span><strong>${result.useItems.length}</strong></article>
      <article class="s7-stat"><span>Keyword evidence coverage</span><strong>${coverage}</strong></article>
    </section>
    <div class="s7-grid">
      <section class="panel s7-section"><div class="eyebrow">EMPHASISE</div><h3>Verified strengths for this CV</h3>${s7RenderChips(result.useItems,"good")}<p class="s7-note">Use these terms only where the wording accurately describes your existing experience.</p></section>
      <section class="panel s7-section"><div class="eyebrow">DO NOT INVENT</div><h3>Missing or unverified items</h3>${s7RenderChips(result.avoidItems,"warn")}<p class="s7-note">These were requested by the job but were not found in your saved profile. Verify manually before using them.</p></section>
    </div>
    <div class="s7-grid">
      <section class="panel s7-section"><div class="eyebrow">PROFILE SUMMARY</div><h3>Truthful draft starting point</h3><div class="s7-item good s7-draft" id="s7SummaryDraft">${s7Escape(result.summary)}</div></section>
      <section class="panel s7-section"><div class="eyebrow">EXPERIENCE ORDER</div><h3>Evidence to move higher</h3><div class="s7-list">${result.evidence.length?result.evidence.map(line=>`<div class="s7-item good">${s7Escape(line)}</div>`).join(""):'<span class="s7-note">No individual CV lines strongly overlapped with this job. Review your experience section manually.</span>'}</div></section>
    </div>
    <section class="panel s7-section"><div class="eyebrow">TAILORING CHECKLIST</div><h3>Before submitting this CV</h3><div class="s7-checklist">
      <div class="s7-check"><b>01</b><span>Use the exact target role where appropriate in the CV headline or summary.</span></div>
      <div class="s7-check"><b>02</b><span>Move the strongest verified skills and evidence above less relevant material.</span></div>
      <div class="s7-check"><b>03</b><span>Use job-description terminology only when it truthfully matches your experience.</span></div>
      <div class="s7-check"><b>04</b><span>Keep quantified achievements that support this role prominent; do not create new metrics.</span></div>
      <div class="s7-check"><b>05</b><span>Review every item in “Missing or unverified” and never claim it unless you can prove it.</span></div>
    </div><div class="s7-actions" style="margin-top:16px"><button class="secondary-btn" id="s7CopyBrief" type="button">Copy Tailoring Brief</button><button class="secondary-btn" id="s7OpenProfile" type="button">Review Profile</button></div></section>`;
  s7q("s7CopyBrief")?.addEventListener("click",()=>s7CopyBrief(result));
  s7q("s7OpenProfile")?.addEventListener("click",()=>{ if(typeof showStage5Page==="function") showStage5Page("profile"); });
}

async function s7CopyBrief(result){
  const lines=[
    `CV Tailoring Brief — ${result.job.position} at ${result.job.company}`,
    "", "EMPHASISE:", ...(result.useItems.length?result.useItems:["No verified items identified"]),
    "", "DO NOT CLAIM WITHOUT EVIDENCE:", ...(result.avoidItems.length?result.avoidItems:["No unverified items identified"]),
    "", "SUMMARY STARTING POINT:", result.summary,
    "", "EVIDENCE TO PRIORITISE:", ...(result.evidence.length?result.evidence:["Review experience manually"])
  ];
  try { await navigator.clipboard.writeText(lines.join("\n")); s7q("s7CopyBrief").textContent="Copied"; setTimeout(()=>{ if(s7q("s7CopyBrief")) s7q("s7CopyBrief").textContent="Copy Tailoring Brief"; },1600); }
  catch { window.alert("Could not access the clipboard. Please copy the visible tailoring brief manually."); }
}

function s7Init(){
  s7EnsureStyles(); s7CreatePage(); s7AddNavigation(); s7PopulateJobs();
  s7q("s7BuildButton")?.addEventListener("click",s7BuildBrief);
  s7q("s7JobSelect")?.addEventListener("change",()=>{ if(s7q("s7JobSelect").value) s7BuildBrief(); });
  document.querySelector('[data-page="jobs"]')?.addEventListener("click",()=>setTimeout(s7PopulateJobs,20));
  s7q("jobForm")?.addEventListener("submit",()=>setTimeout(s7PopulateJobs,30));
}

if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",s7Init);
else s7Init();

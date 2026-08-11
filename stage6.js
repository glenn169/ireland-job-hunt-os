"use strict";

/* Stage 6 - Skills Gap & Learning Priorities Engine
   Uses only saved profile + saved job evidence in localStorage. */

const STAGE6_APP_KEY = "irelandJobHuntOS";
const STAGE6_PROFILE_KEY = "irelandJobHuntOS_profileV1";

function s6ReadJSON(key, fallback){
  try { return JSON.parse(localStorage.getItem(key) || "") || fallback; }
  catch { return fallback; }
}

function s6Profile(){
  return s6ReadJSON(STAGE6_PROFILE_KEY, {});
}

function s6State(){
  return s6ReadJSON(STAGE6_APP_KEY, {jobs:[]});
}

function s6Normalise(value){
  return String(value || "")
    .toLowerCase()
    .replace(/&/g," and ")
    .replace(/[^a-z0-9+#./ -]/g," ")
    .replace(/\s+/g," ")
    .trim();
}

function s6ProfileEvidence(profile){
  return s6Normalise([
    profile.fullName, profile.location, profile.yearsExperience, profile.targetRoles,
    profile.industries, profile.workAuthorisation, profile.drivingLicence, profile.languages,
    profile.education, profile.certifications, profile.professionalSkills, profile.softSkills,
    profile.experienceSummary, profile.resumeText
  ].join(" \n "));
}

const S6_STOPWORDS = new Set("the a an and or to of in on for with from by as at is are be this that your our their role job team work working required preferred desirable essential experience skills skill knowledge ability strong excellent good using use support manage management related relevant candidate candidates years year".split(" "));

function s6Words(value){
  return s6Normalise(value).split(/\s+/).filter(word=>word.length>2 && !S6_STOPWORDS.has(word));
}

function s6MatchesProfile(item, evidence){
  const exact=s6Normalise(item);
  if(!exact) return true;
  if(evidence.includes(exact)) return true;
  const words=s6Words(item);
  if(!words.length) return false;
  const hits=words.filter(word=>evidence.includes(word)).length;
  return hits / words.length >= (words.length <= 2 ? 1 : 0.7);
}

function s6QualificationItems(notes){
  const match=String(notes||"").match(/^Qualifications:\s*(.+)$/im);
  if(!match || /none explicitly detected/i.test(match[1])) return [];
  return match[1].split(/,|\||;/).map(v=>v.trim()).filter(v=>v && v.length<100);
}

function s6CleanRequirement(item){
  return String(item||"").replace(/^[-•*\s]+/,"").replace(/\s+/g," ").trim();
}

function s6BuildGapReport(){
  const profile=s6Profile();
  const state=s6State();
  const jobs=Array.isArray(state.jobs)?state.jobs:[];
  const evidence=s6ProfileEvidence(profile);
  const aggregate=new Map();
  let evidenceJobs=0;

  jobs.forEach(job=>{
    const skills=(Array.isArray(job.requiredSkills)?job.requiredSkills:[]).map(s6CleanRequirement).filter(Boolean);
    const qualifications=s6QualificationItems(job.notes);
    const requirements=[...skills.map(item=>({item,type:"Skill"})),...qualifications.map(item=>({item,type:"Qualification"}))];
    if(requirements.length) evidenceJobs++;
    const seen=new Set();

    requirements.forEach(({item,type})=>{
      const key=s6Normalise(item);
      if(!key || seen.has(`${type}:${key}`) || s6MatchesProfile(item,evidence)) return;
      seen.add(`${type}:${key}`);
      const existing=aggregate.get(`${type}:${key}`) || {item,type,count:0,highMatchCount:0,jobs:[]};
      existing.count++;
      if(Number(job.matchScore)>=70) existing.highMatchCount++;
      existing.jobs.push({position:job.position||"Untitled role",company:job.company||"Unknown company",score:job.matchScore});
      aggregate.set(`${type}:${key}`,existing);
    });
  });

  const gaps=[...aggregate.values()].map(gap=>{
    const score=(gap.count*3)+(gap.highMatchCount*2)+(gap.type==="Qualification"?1:0);
    const priority=score>=9 || gap.count>=3 ? "High" : score>=5 || gap.count>=2 ? "Medium" : "Emerging";
    return {...gap,priority,priorityScore:score};
  }).sort((a,b)=>b.priorityScore-a.priorityScore || b.count-a.count || a.item.localeCompare(b.item));

  return {
    gaps,
    skills:gaps.filter(g=>g.type==="Skill"),
    qualifications:gaps.filter(g=>g.type==="Qualification"),
    evidenceJobs,
    totalJobs:jobs.length,
    profileHasEvidence:evidence.length>40
  };
}

function s6EnsureStyles(){
  if(document.getElementById("stage6Styles")) return;
  const style=document.createElement("style");
  style.id="stage6Styles";
  style.textContent=`
    .s6-section{margin-top:18px}.s6-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px}.s6-stat{padding:14px;background:var(--surface2);border:1px solid var(--border);border-radius:10px}.s6-stat span{display:block;color:var(--muted);font-size:10px}.s6-stat strong{display:block;font-size:22px;margin-top:4px}.s6-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0}.s6-filters{display:flex;gap:7px;flex-wrap:wrap}.s6-filter{border:1px solid var(--border);background:var(--surface2);color:var(--muted);padding:7px 10px;border-radius:999px;cursor:pointer;font-size:10px}.s6-filter.active{border-color:var(--accent);color:var(--accent)}.s6-list{display:grid;gap:10px}.s6-gap{padding:14px;background:var(--surface2);border:1px solid var(--border);border-radius:10px}.s6-gap-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.s6-gap h4{margin:0 0 4px;font-size:14px}.s6-gap-meta{color:var(--muted);font-size:10px}.s6-priority{padding:4px 7px;border-radius:999px;border:1px solid var(--border);font-size:9px;white-space:nowrap}.s6-priority.high{color:#ff9b9b;border-color:rgba(255,120,120,.35)}.s6-priority.medium{color:var(--warn);border-color:rgba(245,186,69,.35)}.s6-priority.emerging{color:var(--muted)}.s6-evidence{margin-top:8px;color:var(--muted2);font-size:10px;line-height:1.45}.s6-empty{color:var(--muted);padding:18px;text-align:center;border:1px dashed var(--border);border-radius:10px}.s6-dashboard-list{display:grid;gap:8px;margin-top:10px}.s6-dashboard-item{display:flex;justify-content:space-between;gap:12px;padding:9px 10px;border:1px solid var(--border);background:var(--surface2);border-radius:9px}.s6-dashboard-item strong{font-size:11px}.s6-dashboard-item span{color:var(--muted);font-size:9px}.s6-dashboard-note{margin-top:8px;color:var(--muted2);font-size:9px;line-height:1.4}@media(max-width:800px){.s6-summary{grid-template-columns:repeat(2,1fr)}}@media(max-width:520px){.s6-summary{grid-template-columns:1fr}.s6-gap-head{flex-direction:column}.s6-toolbar{align-items:flex-start;flex-direction:column}}
  `;
  document.head.appendChild(style);
}

function s6InjectSkillsPanel(){
  const page=document.getElementById("skillsPage");
  if(!page || document.getElementById("stage6GapPanel")) return;
  const anchor=page.querySelector(".skills-overview") || page.querySelector(".page-heading");
  if(!anchor) return;
  const panel=document.createElement("section");
  panel.id="stage6GapPanel";
  panel.className="panel s6-section";
  panel.innerHTML=`
    <div class="analysis-card-head"><div><div class="eyebrow">STAGE 6 · CAREER IMPROVEMENT</div><h3>Skills Gap & Learning Priorities</h3></div></div>
    <p class="profile-help">Built from requirements in your saved jobs that are not found in your saved profile. Every recommendation is linked back to job evidence.</p>
    <div class="s6-summary">
      <div class="s6-stat"><span>Jobs with usable evidence</span><strong id="s6EvidenceJobs">0</strong></div>
      <div class="s6-stat"><span>Skill gaps</span><strong id="s6SkillCount">0</strong></div>
      <div class="s6-stat"><span>Qualification gaps</span><strong id="s6QualificationCount">0</strong></div>
      <div class="s6-stat"><span>High-priority gaps</span><strong id="s6HighCount">0</strong></div>
    </div>
    <div class="s6-toolbar"><div class="s6-filters"><button class="s6-filter active" data-s6-filter="all">All gaps</button><button class="s6-filter" data-s6-filter="Skill">Skills</button><button class="s6-filter" data-s6-filter="Qualification">Qualifications</button></div><span class="profile-help" id="s6EvidenceNote"></span></div>
    <div class="s6-list" id="s6GapList"></div>`;
  anchor.insertAdjacentElement("afterend",panel);
  panel.querySelectorAll("[data-s6-filter]").forEach(button=>button.addEventListener("click",()=>{
    panel.querySelectorAll("[data-s6-filter]").forEach(b=>b.classList.toggle("active",b===button));
    s6RenderSkillsPanel(button.dataset.s6Filter);
  }));
}

function s6RenderSkillsPanel(filter="all"){
  const report=s6BuildGapReport();
  const list=document.getElementById("s6GapList");
  if(!list) return;
  const setText=(id,value)=>{const el=document.getElementById(id); if(el) el.textContent=value;};
  setText("s6EvidenceJobs",report.evidenceJobs);
  setText("s6SkillCount",report.skills.length);
  setText("s6QualificationCount",report.qualifications.length);
  setText("s6HighCount",report.gaps.filter(g=>g.priority==="High").length);
  setText("s6EvidenceNote",`${report.evidenceJobs} of ${report.totalJobs} saved jobs contain requirements that can be compared.`);
  list.innerHTML="";

  if(!report.profileHasEvidence){ list.innerHTML='<div class="s6-empty">Complete or import your Profile first. Stage 6 needs profile evidence before it can identify genuine gaps.</div>'; return; }
  if(!report.evidenceJobs){ list.innerHTML='<div class="s6-empty">No saved jobs contain comparable requirements yet. Analyse jobs and save them to Job Tracker to build your gap report.</div>'; return; }
  const rows=filter==="all"?report.gaps:report.gaps.filter(g=>g.type===filter);
  if(!rows.length){ list.innerHTML='<div class="s6-empty">No gaps found in this category from your current saved-job evidence.</div>'; return; }

  rows.slice(0,25).forEach(gap=>{
    const card=document.createElement("article"); card.className="s6-gap";
    const jobNames=gap.jobs.slice(0,4).map(job=>`${job.position} · ${job.company}`).join("; ");
    const extra=gap.jobs.length>4?` + ${gap.jobs.length-4} more`:"";
    card.innerHTML=`<div class="s6-gap-head"><div><h4></h4><div class="s6-gap-meta"></div></div><span class="s6-priority"></span></div><div class="s6-evidence"></div>`;
    card.querySelector("h4").textContent=gap.item;
    card.querySelector(".s6-gap-meta").textContent=`${gap.type} · requested by ${gap.count} saved job${gap.count===1?"":"s"}${gap.highMatchCount?` · ${gap.highMatchCount} high-match job${gap.highMatchCount===1?"":"s"}`:""}`;
    const badge=card.querySelector(".s6-priority"); badge.textContent=`${gap.priority} priority`; badge.classList.add(gap.priority.toLowerCase());
    card.querySelector(".s6-evidence").textContent=`Evidence: ${jobNames}${extra}`;
    list.appendChild(card);
  });
}

function s6RenderDashboard(){
  const headings=[...document.querySelectorAll("#dashboardPage .panel h3")];
  const heading=headings.find(el=>/Learning Priorities/i.test(el.textContent));
  const panel=heading?.closest(".panel");
  if(!panel) return;
  let container=panel.querySelector("#stage6DashboardPriorities");
  if(!container){
    panel.querySelector(".empty")?.remove();
    container=document.createElement("div"); container.id="stage6DashboardPriorities"; panel.appendChild(container);
  }
  const report=s6BuildGapReport();
  container.innerHTML="";
  if(!report.profileHasEvidence){ container.innerHTML='<div class="empty">Complete your Profile to generate personalised learning priorities.</div>'; return; }
  if(!report.evidenceJobs){ container.innerHTML='<div class="empty">Save analysed jobs to generate personalised learning priorities.</div>'; return; }
  if(!report.gaps.length){ container.innerHTML='<div class="empty">No repeated gaps found from your current saved jobs.</div>'; return; }
  const wrap=document.createElement("div"); wrap.className="s6-dashboard-list";
  report.gaps.slice(0,3).forEach(gap=>{
    const row=document.createElement("div"); row.className="s6-dashboard-item";
    const left=document.createElement("div"); const strong=document.createElement("strong"); strong.textContent=gap.item; const small=document.createElement("span"); small.style.display="block"; small.textContent=`${gap.type} · ${gap.count} job${gap.count===1?"":"s"}`; left.append(strong,small);
    const priority=document.createElement("span"); priority.textContent=gap.priority; row.append(left,priority); wrap.appendChild(row);
  });
  container.appendChild(wrap);
  const note=document.createElement("div"); note.className="s6-dashboard-note"; note.textContent="Priorities are ranked from saved-job requirements missing from your current profile."; container.appendChild(note);
}

function s6Refresh(){
  s6EnsureStyles();
  s6InjectSkillsPanel();
  s6RenderSkillsPanel(document.querySelector(".s6-filter.active")?.dataset.s6Filter || "all");
  s6RenderDashboard();
}

function s6Init(){
  s6Refresh();
  document.querySelector('[data-page="skills"]')?.addEventListener("click",()=>setTimeout(s6Refresh,0));
  document.querySelector('[data-page="dashboard"]')?.addEventListener("click",()=>setTimeout(s6Refresh,0));
  document.getElementById("profileForm")?.addEventListener("submit",()=>setTimeout(s6Refresh,0));
  document.getElementById("jobForm")?.addEventListener("submit",()=>setTimeout(s6Refresh,20));
  window.addEventListener("storage",s6Refresh);
}

document.addEventListener("DOMContentLoaded",s6Init);

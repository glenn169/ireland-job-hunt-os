"use strict";

const STORAGE_KEY = "irelandJobHuntOS";
const STATUSES = ["Saved","Applying","Applied","Assessment","Interview","Final Interview","Offer","Rejected","Withdrawn"];
const DEFAULT_STATE = {
  version: 2,
  profile: { targetRoles: ["SOC Analyst","Cybersecurity Analyst","Security Operations","IT Security","Junior Security Engineer","NOC","Network Engineer","IT Support","Graduate Cybersecurity","Junior Penetration Tester"] },
  jobs: [], dailyGoals: {}, activity: []
};

function cloneDefault(){ return JSON.parse(JSON.stringify(DEFAULT_STATE)); }
function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw){ const initial=cloneDefault(); saveState(initial); return initial; }
  try{
    const parsed=JSON.parse(raw);
    return {
      ...cloneDefault(), ...parsed,
      version:2,
      profile:{...DEFAULT_STATE.profile,...(parsed.profile||{})},
      jobs:Array.isArray(parsed.jobs)?parsed.jobs:[],
      dailyGoals:parsed.dailyGoals||{},
      activity:Array.isArray(parsed.activity)?parsed.activity:[]
    };
  }catch(error){ console.error("Unable to read saved data",error); return cloneDefault(); }
}
function saveState(state){ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }
let appState=loadState();

function setText(id,value){ const el=document.getElementById(id); if(el) el.textContent=value; }
function todayKey(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function formatDate(value){ if(!value) return "—"; const d=new Date(`${value}T00:00:00`); return Number.isNaN(d.getTime())?"—":new Intl.DateTimeFormat("en-IE",{day:"numeric",month:"short",year:"numeric"}).format(d); }
function displayDate(){ setText("currentDate",new Intl.DateTimeFormat("en-IE",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date())); }
function uid(){ return `job_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }
function normaliseSkills(value){ return value.split(",").map(s=>s.trim()).filter(Boolean); }
function addActivity(text){ appState.activity.unshift({id:`act_${Date.now()}`,text,time:new Date().toISOString()}); appState.activity=appState.activity.slice(0,50); }
function isFollowUpDue(job){
  if(!job.followUpDate || ["Offer","Rejected","Withdrawn"].includes(job.status)) return false;
  const today=new Date(); today.setHours(0,0,0,0);
  return new Date(`${job.followUpDate}T00:00:00`)<=today;
}
function statusClass(status){ return `status-${status.toLowerCase().replaceAll(" ","-")}`; }

function updateStats(){
  const jobs=appState.jobs;
  const applications=jobs.filter(j=>["Applied","Assessment","Interview","Final Interview","Offer","Rejected"].includes(j.status));
  const interviews=jobs.filter(j=>["Interview","Final Interview","Offer"].includes(j.status));
  setText("totalApplications",applications.length);
  setText("totalInterviews",interviews.length);
  setText("totalOffers",jobs.filter(j=>j.status==="Offer").length);
  setText("savedJobs",jobs.filter(j=>j.status==="Saved").length);
  setText("followUps",jobs.filter(isFollowUpDue).length);
  setText("interviewRate",`${applications.length?((interviews.length/applications.length)*100).toFixed(1):0}%`);
}

function renderRoles(){
  const container=document.getElementById("targetRoles"); container.innerHTML="";
  appState.profile.targetRoles.forEach(role=>{ const span=document.createElement("span"); span.className="tag"; span.textContent=role; container.appendChild(span); });
}
function loadGoals(){ const goals=appState.dailyGoals[todayKey()]||{}; document.querySelectorAll("#dailyGoals input[type='checkbox']").forEach(box=>box.checked=Boolean(goals[box.dataset.goal])); updateGoalProgress(); }
function updateGoalProgress(){ const boxes=[...document.querySelectorAll("#dailyGoals input[type='checkbox']")]; setText("goalProgress",`${boxes.filter(b=>b.checked).length} / ${boxes.length}`); }
function saveGoal(event){ const today=todayKey(); appState.dailyGoals[today]||={}; appState.dailyGoals[today][event.target.dataset.goal]=event.target.checked; saveState(appState); updateGoalProgress(); }

function renderDashboardLists(){
  const high=document.getElementById("highMatchJobs"); high.innerHTML="";
  const scored=appState.jobs.filter(j=>Number.isFinite(Number(j.matchScore)) && j.matchScore!=="").sort((a,b)=>Number(b.matchScore)-Number(a.matchScore)).slice(0,4);
  if(!scored.length){ high.className="empty"; high.textContent="No scored jobs yet. Add a match score to a job and it will appear here."; }
  else{ high.className="dashboard-list"; scored.forEach(job=>{ const row=document.createElement("div"); row.className="dashboard-row"; const left=document.createElement("div"); const strong=document.createElement("strong"); strong.textContent=job.position; const small=document.createElement("small"); small.textContent=job.company; left.append(strong,small); const score=document.createElement("strong"); score.textContent=`${job.matchScore}%`; score.style.color="var(--accent)"; row.append(left,score); high.appendChild(row); }); }

  const follow=document.getElementById("followUpList"); follow.innerHTML="";
  const due=appState.jobs.filter(isFollowUpDue).sort((a,b)=>a.followUpDate.localeCompare(b.followUpDate)).slice(0,5);
  if(!due.length){ follow.className="empty"; follow.textContent="No follow-ups due."; }
  else{ follow.className="dashboard-list"; due.forEach(job=>{ const row=document.createElement("div"); row.className="dashboard-row"; const left=document.createElement("div"); const strong=document.createElement("strong"); strong.textContent=job.company; const small=document.createElement("small"); small.textContent=job.position; left.append(strong,small); const date=document.createElement("strong"); date.textContent=formatDate(job.followUpDate); date.style.color="var(--warn)"; row.append(left,date); follow.appendChild(row); }); }

  const activity=document.getElementById("recentActivity"); activity.innerHTML="";
  const items=appState.activity.slice(0,6);
  if(!items.length){ activity.className="empty"; activity.textContent="Your recent activity will appear here."; }
  else{ activity.className="activity-list"; items.forEach(item=>{ const row=document.createElement("div"); row.className="activity-item"; const text=document.createElement("span"); text.textContent=item.text; const time=document.createElement("time"); time.textContent=new Intl.DateTimeFormat("en-IE",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(item.time)); row.append(text,time); activity.appendChild(row); }); }
}

function renderTrackerSummary(){
  const el=document.getElementById("trackerSummary"); el.innerHTML="";
  const values=[
    [appState.jobs.length,"Total jobs"],
    [appState.jobs.filter(j=>j.status==="Saved").length,"Saved"],
    [appState.jobs.filter(j=>["Applied","Assessment"].includes(j.status)).length,"Active applications"],
    [appState.jobs.filter(j=>["Interview","Final Interview"].includes(j.status)).length,"Interviews"],
    [appState.jobs.filter(isFollowUpDue).length,"Follow-ups due"]
  ];
  values.forEach(([num,label])=>{ const card=document.createElement("div"); card.className="mini-stat"; const strong=document.createElement("strong"); strong.textContent=num; const span=document.createElement("span"); span.textContent=label; card.append(strong,span); el.appendChild(card); });
}

function currentFilteredJobs(){
  const query=document.getElementById("jobSearch").value.trim().toLowerCase();
  const status=document.getElementById("statusFilter").value;
  const arrangement=document.getElementById("arrangementFilter").value;
  const sort=document.getElementById("jobSort").value;
  let jobs=appState.jobs.filter(job=>{
    const haystack=[job.company,job.position,job.location,job.notes,...(job.requiredSkills||[])].join(" ").toLowerCase();
    return (!query||haystack.includes(query)) && (!status||job.status===status) && (!arrangement||job.workArrangement===arrangement);
  });
  jobs=[...jobs].sort((a,b)=>{
    if(sort==="oldest") return (a.dateDiscovered||"").localeCompare(b.dateDiscovered||"");
    if(sort==="matchHigh") return Number(b.matchScore||-1)-Number(a.matchScore||-1);
    if(sort==="deadline") return (a.applicationDeadline||"9999-12-31").localeCompare(b.applicationDeadline||"9999-12-31");
    if(sort==="company") return a.company.localeCompare(b.company);
    return (b.dateDiscovered||"").localeCompare(a.dateDiscovered||"");
  });
  return jobs;
}

function renderJobs(){
  renderTrackerSummary();
  const list=document.getElementById("jobList"); list.innerHTML="";
  const jobs=currentFilteredJobs(); setText("jobCount",`${jobs.length} ${jobs.length===1?"job":"jobs"}`);
  if(!jobs.length){ const empty=document.createElement("div"); empty.className="empty-jobs"; empty.innerHTML="<strong>No jobs match this view.</strong><br><span>Add your first opportunity or clear the filters.</span>"; list.appendChild(empty); return; }
  jobs.forEach(job=>list.appendChild(createJobCard(job)));
}

function createJobCard(job){
  const card=document.createElement("article"); card.className="job-card";
  const head=document.createElement("div"); head.className="job-card-head";
  const titleWrap=document.createElement("div"); const title=document.createElement("h3"); title.textContent=job.position; const company=document.createElement("div"); company.className="company"; company.textContent=job.company; titleWrap.append(title,company); head.appendChild(titleWrap);
  if(job.matchScore!=="" && job.matchScore!=null){ const score=document.createElement("div"); score.className="score"; score.textContent=`${job.matchScore}%`; score.title="Manual match score for now; transparent automatic scoring arrives in Stage 4."; head.appendChild(score); }
  card.appendChild(head);

  const meta=document.createElement("div"); meta.className="job-meta";
  [[job.status,`status-badge ${statusClass(job.status)}`],[job.location,"meta-pill"],[job.workArrangement,"meta-pill"],[job.jobType,"meta-pill"]].forEach(([value,cls])=>{ if(!value)return; const s=document.createElement("span"); s.className=cls; s.textContent=value; meta.appendChild(s); });
  card.appendChild(meta);

  if(job.requiredSkills?.length){ const skills=document.createElement("div"); skills.className="job-skills"; job.requiredSkills.slice(0,8).forEach(skill=>{ const chip=document.createElement("span"); chip.className="skill-chip"; chip.textContent=skill; skills.appendChild(chip); }); card.appendChild(skills); }
  if(job.notes){ const notes=document.createElement("div"); notes.className="job-notes"; notes.textContent=job.notes.length>220?`${job.notes.slice(0,220)}…`:job.notes; card.appendChild(notes); }

  const dates=document.createElement("div"); dates.className="job-dates";
  const datePairs=[["Discovered",job.dateDiscovered],["Applied",job.dateApplied],["Deadline",job.applicationDeadline],["Follow-up",job.followUpDate]];
  datePairs.forEach(([label,value])=>{ const box=document.createElement("div"); const strong=document.createElement("strong"); strong.textContent=label; const span=document.createElement("span"); span.textContent=formatDate(value); if(label==="Follow-up"&&isFollowUpDue(job)) span.className="followup-due"; box.append(strong,span); dates.appendChild(box); });
  card.appendChild(dates);

  const actions=document.createElement("div"); actions.className="job-actions";
  const edit=document.createElement("button"); edit.className="small-btn"; edit.textContent="Edit"; edit.addEventListener("click",()=>openJobModal(job)); actions.appendChild(edit);
  if(job.jobUrl){ const link=document.createElement("a"); link.className="small-btn external"; link.href=job.jobUrl; link.target="_blank"; link.rel="noopener noreferrer"; link.textContent="Open job ↗"; actions.appendChild(link); }
  const del=document.createElement("button"); del.className="small-btn danger"; del.textContent="Delete"; del.addEventListener("click",()=>deleteJob(job.id)); actions.appendChild(del);
  card.appendChild(actions); return card;
}

function populateStatusSelects(){
  const formStatus=document.getElementById("status"); const filter=document.getElementById("statusFilter");
  formStatus.innerHTML="";
  STATUSES.forEach(status=>{ const a=document.createElement("option"); a.value=status; a.textContent=status; formStatus.appendChild(a); const b=document.createElement("option"); b.value=status; b.textContent=status; filter.appendChild(b); });
}

function openJobModal(job=null){
  const modal=document.getElementById("jobModal"); const form=document.getElementById("jobForm"); form.reset();
  setText("jobModalTitle",job?"Edit Job":"Add Job");
  document.getElementById("jobId").value=job?.id||"";
  document.getElementById("company").value=job?.company||"";
  document.getElementById("position").value=job?.position||"";
  document.getElementById("jobUrl").value=job?.jobUrl||"";
  document.getElementById("location").value=job?.location||"";
  document.getElementById("workArrangement").value=job?.workArrangement||"";
  document.getElementById("salary").value=job?.salary||"";
  document.getElementById("jobType").value=job?.jobType||"";
  document.getElementById("dateDiscovered").value=job?.dateDiscovered||todayKey();
  document.getElementById("applicationDeadline").value=job?.applicationDeadline||"";
  document.getElementById("dateApplied").value=job?.dateApplied||"";
  document.getElementById("status").value=job?.status||"Saved";
  document.getElementById("matchScore").value=job?.matchScore??"";
  document.getElementById("followUpDate").value=job?.followUpDate||"";
  document.getElementById("requiredSkills").value=(job?.requiredSkills||[]).join(", ");
  document.getElementById("notes").value=job?.notes||"";
  modal.hidden=false; document.body.style.overflow="hidden"; setTimeout(()=>document.getElementById("company").focus(),0);
}
function closeJobModal(){ document.getElementById("jobModal").hidden=true; document.body.style.overflow=""; }

function saveJobFromForm(event){
  event.preventDefault();
  const id=document.getElementById("jobId").value;
  const existing=id?appState.jobs.find(j=>j.id===id):null;
  const scoreRaw=document.getElementById("matchScore").value;
  const job={
    id:id||uid(), company:document.getElementById("company").value.trim(), position:document.getElementById("position").value.trim(),
    jobUrl:document.getElementById("jobUrl").value.trim(), location:document.getElementById("location").value.trim(), workArrangement:document.getElementById("workArrangement").value,
    salary:document.getElementById("salary").value.trim(), jobType:document.getElementById("jobType").value, dateDiscovered:document.getElementById("dateDiscovered").value,
    applicationDeadline:document.getElementById("applicationDeadline").value, dateApplied:document.getElementById("dateApplied").value, status:document.getElementById("status").value,
    matchScore:scoreRaw===""?"":Math.max(0,Math.min(100,Number(scoreRaw))), followUpDate:document.getElementById("followUpDate").value,
    requiredSkills:normaliseSkills(document.getElementById("requiredSkills").value), notes:document.getElementById("notes").value.trim(),
    createdAt:existing?.createdAt||new Date().toISOString(), updatedAt:new Date().toISOString()
  };
  if(existing){ appState.jobs=appState.jobs.map(j=>j.id===id?job:j); addActivity(`Updated ${job.position} at ${job.company}`); }
  else{ appState.jobs.unshift(job); addActivity(`Added ${job.position} at ${job.company}`); }
  saveState(appState); closeJobModal(); refreshAll(); navigate("jobs");
}

function deleteJob(id){
  const job=appState.jobs.find(j=>j.id===id); if(!job) return;
  if(!window.confirm(`Delete ${job.position} at ${job.company}? This cannot be undone.`)) return;
  appState.jobs=appState.jobs.filter(j=>j.id!==id); addActivity(`Deleted ${job.position} at ${job.company}`); saveState(appState); refreshAll();
}

function clearFilters(){ document.getElementById("jobSearch").value=""; document.getElementById("statusFilter").value=""; document.getElementById("arrangementFilter").value=""; document.getElementById("jobSort").value="newest"; renderJobs(); }

const PAGES={
  dashboard:["Dashboard",""], jobs:["Job Tracker",""],
  analyzer:["Job Description Analyzer","Paste job descriptions and identify skills, qualifications, keywords, and experience requirements."],
  skills:["Skills & Learning","Manage your cybersecurity profile and identify skills gaps."], daily:["Daily Job Hunt","Your dedicated daily job-search workflow will be built here."],
  interviews:["Interview Preparation","Technical, behavioural, and STAR preparation will be organised here."], analytics:["Application Analytics","Application performance and job-market insights will appear here."],
  search:["Job Search","Quick searches for LinkedIn, Indeed, IrishJobs, Jobs.ie, PublicJobs, and career pages."], profile:["Personal Profile","Your education, skills, certifications, experience, projects, and preferences will be managed here."]
};
function navigate(page){
  const info=PAGES[page]; if(!info)return;
  document.querySelectorAll(".nav button").forEach(btn=>btn.classList.toggle("active",btn.dataset.page===page));
  document.querySelectorAll(".page").forEach(section=>section.classList.remove("active"));
  if(page==="dashboard") document.getElementById("dashboardPage").classList.add("active");
  else if(page==="jobs"){ document.getElementById("jobsPage").classList.add("active"); renderJobs(); }
  else{ document.getElementById("placeholderPage").classList.add("active"); setText("placeholderTitle",info[0]); setText("placeholderDescription",info[1]); }
  setText("pageTitle",info[0]); document.getElementById("sidebar").classList.remove("open"); window.scrollTo({top:0,behavior:"smooth"});
}

function refreshAll(){ updateStats(); renderDashboardLists(); renderJobs(); }
function setupEvents(){
  document.getElementById("mobileMenu").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("open"));
  document.querySelectorAll(".nav button").forEach(btn=>btn.addEventListener("click",()=>navigate(btn.dataset.page)));
  document.querySelectorAll("#dailyGoals input[type='checkbox']").forEach(box=>box.addEventListener("change",saveGoal));
  document.getElementById("quickAddJob").addEventListener("click",()=>{ navigate("jobs"); openJobModal(); });
  document.getElementById("addJobButton").addEventListener("click",()=>openJobModal());
  document.getElementById("returnDashboard").addEventListener("click",()=>navigate("dashboard"));
  document.getElementById("jobForm").addEventListener("submit",saveJobFromForm);
  document.getElementById("closeJobModal").addEventListener("click",closeJobModal); document.getElementById("cancelJob").addEventListener("click",closeJobModal);
  document.getElementById("jobModal").addEventListener("click",e=>{ if(e.target.id==="jobModal") closeJobModal(); });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&!document.getElementById("jobModal").hidden) closeJobModal(); });
  ["jobSearch","statusFilter","arrangementFilter","jobSort"].forEach(id=>document.getElementById(id).addEventListener(id==="jobSearch"?"input":"change",renderJobs));
  document.getElementById("clearFilters").addEventListener("click",clearFilters);
}

function init(){ displayDate(); populateStatusSelects(); renderRoles(); loadGoals(); refreshAll(); setupEvents(); }
document.addEventListener("DOMContentLoaded",init);

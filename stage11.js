"use strict";

/* Stage 11 - Job Application Workspace
   One workspace per tracked job. Keeps workspace-only planning data separate
   while synchronising core application fields with the existing Job Tracker. */
(function stage11ApplicationWorkspace(){
  const STATE_KEY="irelandJobHuntOS";
  const WS_KEY="irelandJobHuntOS_stage11WorkspaceV1";
  const STATUSES=["Saved","Applying","Applied","Assessment","Interview","Final Interview","Offer","Rejected","Withdrawn"];
  const CHECKS=[
    ["reviewed","Reviewed job description"],
    ["requirements","Checked key requirements"],
    ["cv","Prepared application/CV"],
    ["cover","Prepared supporting message / cover letter"],
    ["submitted","Submitted application"],
    ["followup","Planned follow-up"],
    ["interview","Prepared interview notes"]
  ];
  const q=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
  const formatDate=value=>{if(!value)return "—";const d=new Date(`${value}T00:00:00`);return Number.isNaN(d.getTime())?"—":new Intl.DateTimeFormat("en-IE",{day:"numeric",month:"short",year:"numeric"}).format(d);};
  const state=()=>{try{return JSON.parse(localStorage.getItem(STATE_KEY)||"{}");}catch{return {};}};
  const workspaceState=()=>{try{return JSON.parse(localStorage.getItem(WS_KEY)||"{}");}catch{return {};}};
  const saveWorkspace=data=>localStorage.setItem(WS_KEY,JSON.stringify(data));
  let selectedJobId="";

  function saveState(next,activity){
    next.jobs=Array.isArray(next.jobs)?next.jobs:[];
    next.activity=Array.isArray(next.activity)?next.activity:[];
    if(activity)next.activity.unshift({id:`act_${Date.now()}`,text:activity,time:new Date().toISOString()});
    localStorage.setItem(STATE_KEY,JSON.stringify(next));
    try{if(typeof refreshAll==="function")refreshAll();}catch{}
  }

  function jobKey(job){return String(job?.id||"");}
  function getWorkspace(job){
    const all=workspaceState();
    const key=jobKey(job);
    return {...(all[key]||{})};
  }
  function patchWorkspace(job,patch,eventText){
    if(!job)return;
    const all=workspaceState();
    const key=jobKey(job);
    const current={...(all[key]||{})};
    const events=Array.isArray(current.events)?current.events:[];
    if(eventText)events.unshift({id:`evt_${Date.now()}`,text:eventText,time:new Date().toISOString()});
    all[key]={...current,...patch,events:events.slice(0,30),updatedAt:new Date().toISOString()};
    saveWorkspace(all);
  }

  function currentJob(){
    const jobs=Array.isArray(state().jobs)?state().jobs:[];
    return jobs.find(job=>String(job.id)===String(selectedJobId))||jobs[0]||null;
  }

  function ensureStyles(){
    if(q("stage11Styles"))return;
    const st=document.createElement("style");st.id="stage11Styles";
    st.textContent=`
.s11-shell{display:grid;gap:16px}.s11-top{display:grid;grid-template-columns:minmax(250px,1.4fr) repeat(3,minmax(120px,.55fr));gap:12px;align-items:end}.s11-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.s11-stat{padding:14px;border:1px solid var(--border);border-radius:12px;background:var(--surface)}.s11-stat span{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.08em}.s11-stat strong{display:block;margin-top:5px;font-size:18px}.s11-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,.8fr);gap:16px}.s11-stack{display:grid;gap:16px}.s11-jobhero{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.s11-jobhero h2{margin:3px 0 4px}.s11-company{color:var(--muted)}.s11-score{min-width:72px;text-align:center;padding:11px;border-radius:11px;border:1px solid rgba(40,209,124,.35);color:var(--accent);font-weight:800}.s11-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.s11-pill{font-size:11px;padding:6px 9px;border:1px solid var(--border);border-radius:999px;background:var(--surface2);color:var(--muted)}.s11-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.s11-actions button,.s11-actions a{border:1px solid var(--border);background:var(--surface2);color:var(--text);padding:8px 11px;border-radius:8px;text-decoration:none;cursor:pointer}.s11-actions .primary{background:var(--accent);border-color:var(--accent);color:#07130d;font-weight:700}.s11-section-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}.s11-section-head h3{margin:0}.s11-formgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.s11-field-wide{grid-column:1/-1}.s11-checks{display:grid;gap:8px}.s11-check{display:flex;align-items:center;gap:10px;padding:9px 10px;border:1px solid var(--border);border-radius:9px;background:var(--surface2)}.s11-check input{width:17px;height:17px;accent-color:var(--accent)}.s11-progress{height:7px;background:var(--surface2);border-radius:999px;overflow:hidden;margin-top:10px}.s11-progress span{display:block;height:100%;background:var(--accent);width:0}.s11-skills{display:flex;gap:6px;flex-wrap:wrap}.s11-skill{font-size:11px;padding:6px 8px;border:1px solid var(--border);border-radius:999px;background:var(--surface2)}.s11-timeline{display:grid;gap:10px}.s11-event{border-left:2px solid var(--border);padding-left:11px}.s11-event strong{display:block;font-size:12px}.s11-event span{display:block;color:var(--muted);font-size:10px;margin-top:2px}.s11-empty{padding:32px;text-align:center;color:var(--muted)}.s11-savehint{font-size:10px;color:var(--muted)}.s11-next{padding:11px;border-radius:10px;background:var(--surface2);line-height:1.5;font-size:12px}.s11-next strong{color:var(--accent)}
@media(max-width:1050px){.s11-top{grid-template-columns:1fr 1fr}.s11-grid{grid-template-columns:1fr}.s11-summary{grid-template-columns:1fr 1fr}}@media(max-width:620px){.s11-top,.s11-summary,.s11-formgrid{grid-template-columns:1fr}.s11-field-wide{grid-column:auto}.s11-jobhero{flex-direction:column}.s11-score{min-width:0}.s11-actions>*{flex:1;text-align:center}}
`;
    document.head.appendChild(st);
  }

  function ensureNav(){
    if(document.querySelector('.nav [data-page="workspace"]'))return;
    const nav=document.querySelector(".nav");if(!nav)return;
    const button=document.createElement("button");button.dataset.page="workspace";button.innerHTML='<span>▣</span> Application Workspace';
    const tracker=nav.querySelector('[data-page="jobs"]');
    if(tracker?.nextSibling)nav.insertBefore(button,tracker.nextSibling);else nav.appendChild(button);
    button.addEventListener("click",showPage);
  }

  function ensurePage(){
    if(q("applicationWorkspacePage"))return;
    const placeholder=q("placeholderPage")||document.querySelector("main");if(!placeholder)return;
    const page=document.createElement("section");page.className="page";page.id="applicationWorkspacePage";
    page.innerHTML=`
<div class="page-heading"><div><div class="eyebrow">STAGE 11 · APPLICATION WORKSPACE</div><h1>Manage each application in one place</h1><p>Track preparation, application progress, follow-ups, evidence, requirements and interview readiness without duplicating your Job Tracker.</p></div></div>
<div class="s11-shell">
<section class="panel"><div class="s11-top"><div class="field"><label for="s11JobSelect">Tracked job</label><select id="s11JobSelect"></select></div><div class="field"><label for="s11Status">Status</label><select id="s11Status">${STATUSES.map(s=>`<option>${s}</option>`).join("")}</select></div><div class="field"><label for="s11FollowUp">Follow-up</label><input id="s11FollowUp" type="date"></div><button class="btn" id="s11SaveCore">Save progress</button></div></section>
<section id="s11Summary" class="s11-summary"></section>
<section id="s11Body"></section>
</div>`;
    placeholder.parentNode.insertBefore(page,placeholder);
  }

  function renderSelector(){
    const jobs=Array.isArray(state().jobs)?state().jobs:[];
    const select=q("s11JobSelect");if(!select)return;
    if(!jobs.length){select.innerHTML='<option value="">No tracked jobs yet</option>';selectedJobId="";return;}
    if(!jobs.some(j=>String(j.id)===String(selectedJobId)))selectedJobId=String(jobs[0].id);
    select.innerHTML=jobs.map(job=>`<option value="${esc(job.id)}">${esc(job.position||"Untitled role")} — ${esc(job.company||"Company")}</option>`).join("");
    select.value=selectedJobId;
  }

  function recommendedNext(job,ws){
    if(!job)return "Add or save a job first.";
    if(["Rejected","Withdrawn","Offer"].includes(job.status))return job.status==="Offer"?"Review the offer details and record your decision/next steps.":"This application is closed. Keep notes for future learning.";
    const checks=ws.checks||{};
    if(!checks.reviewed)return "Review the full job description and confirm the role is worth pursuing.";
    if(!checks.requirements)return "Check the main requirements and identify the strongest evidence you can use.";
    if(!checks.cv)return "Prepare the application material you plan to submit.";
    if(!checks.submitted)return "Submit the application and record the application date.";
    if(!job.followUpDate)return "Set a follow-up date so this application does not disappear from your pipeline.";
    if(["Interview","Final Interview"].includes(job.status)&&!checks.interview)return "Prepare interview evidence, questions and examples for this role.";
    return "Keep the status current and complete the next due follow-up.";
  }

  function renderSummary(job,ws){
    const host=q("s11Summary");if(!host)return;
    if(!job){host.innerHTML="";return;}
    const done=CHECKS.filter(([key])=>Boolean(ws.checks?.[key])).length;
    host.innerHTML=`
<div class="s11-stat"><span>Match score</span><strong>${job.matchScore!==""&&job.matchScore!=null?`${esc(job.matchScore)}%`:"—"}</strong></div>
<div class="s11-stat"><span>Preparation</span><strong>${done}/${CHECKS.length}</strong></div>
<div class="s11-stat"><span>Applied</span><strong>${esc(formatDate(job.dateApplied))}</strong></div>
<div class="s11-stat"><span>Follow-up</span><strong>${esc(formatDate(job.followUpDate))}</strong></div>`;
  }

  function timeline(job,ws){
    const rows=[];
    if(job.createdAt||job.dateDiscovered)rows.push({time:job.createdAt||`${job.dateDiscovered}T12:00:00`,text:"Job added to tracker"});
    if(job.dateApplied)rows.push({time:`${job.dateApplied}T12:00:00`,text:"Application date recorded"});
    for(const evt of (ws.events||[]))rows.push({time:evt.time,text:evt.text});
    return rows.sort((a,b)=>new Date(b.time)-new Date(a.time)).slice(0,12);
  }

  function renderBody(){
    renderSelector();
    const job=currentJob();const host=q("s11Body");if(!host)return;
    if(!job){q("s11Status").value="Saved";q("s11FollowUp").value="";q("s11SaveCore").disabled=true;host.innerHTML='<div class="panel s11-empty"><strong>No tracked jobs yet.</strong><br>Save a vacancy from Job Search or add one in Job Tracker, then return here.</div>';renderSummary(null,{});return;}
    q("s11SaveCore").disabled=false;
    q("s11Status").value=job.status||"Saved";q("s11FollowUp").value=job.followUpDate||"";
    const ws=getWorkspace(job);const checks=ws.checks||{};const skills=Array.isArray(job.requiredSkills)?job.requiredSkills:[];const events=timeline(job,ws);const done=CHECKS.filter(([key])=>Boolean(checks[key])).length;const progress=Math.round((done/CHECKS.length)*100);
    renderSummary(job,ws);
    host.innerHTML=`<div class="s11-grid"><div class="s11-stack">
<section class="panel"><div class="s11-jobhero"><div><div class="eyebrow">CURRENT APPLICATION</div><h2>${esc(job.position||"Untitled role")}</h2><div class="s11-company">${esc(job.company||"Company not listed")}</div><div class="s11-meta">${job.location?`<span class="s11-pill">📍 ${esc(job.location)}</span>`:""}${job.workArrangement?`<span class="s11-pill">${esc(job.workArrangement)}</span>`:""}${job.jobType?`<span class="s11-pill">${esc(job.jobType)}</span>`:""}${job.salary?`<span class="s11-pill">${esc(job.salary)}</span>`:""}${job.source?`<span class="s11-pill">Source: ${esc(job.source)}</span>`:""}</div></div><div class="s11-score">${job.matchScore!==""&&job.matchScore!=null?`${esc(job.matchScore)}%`:"—"}</div></div><div class="s11-actions">${job.jobUrl?`<a class="primary" href="${esc(job.jobUrl)}" target="_blank" rel="noopener noreferrer">Open job ↗</a>`:""}<button id="s11OpenTracker">Open in Tracker</button></div></section>
<section class="panel"><div class="s11-section-head"><div><div class="eyebrow">NEXT ACTION</div><h3>What should happen next?</h3></div></div><div class="s11-next"><strong>Recommended:</strong> ${esc(recommendedNext(job,ws))}</div><div class="field" style="margin-top:12px"><label for="s11NextAction">My next action</label><input id="s11NextAction" value="${esc(ws.nextAction||"")}" placeholder="e.g. Submit application Friday, message recruiter, prepare examples..."></div></section>
<section class="panel"><div class="s11-section-head"><div><div class="eyebrow">APPLICATION CHECKLIST</div><h3>Preparation & submission</h3></div><span class="s11-savehint">Saved automatically</span></div><div class="s11-checks">${CHECKS.map(([key,label])=>`<label class="s11-check"><input type="checkbox" data-s11-check="${key}" ${checks[key]?"checked":""}><span>${esc(label)}</span></label>`).join("")}</div><div class="s11-progress"><span style="width:${progress}%"></span></div></section>
<section class="panel"><div class="s11-section-head"><div><div class="eyebrow">APPLICATION DETAILS</div><h3>Dates & working notes</h3></div><span class="s11-savehint">Workspace fields save automatically</span></div><div class="s11-formgrid"><div class="field"><label for="s11Applied">Date applied</label><input id="s11Applied" type="date" value="${esc(job.dateApplied||"")}"></div><div class="field"><label for="s11Deadline">Application deadline</label><input id="s11Deadline" type="date" value="${esc(job.applicationDeadline||"")}"></div><div class="field"><label for="s11ContactName">Recruiter / contact</label><input id="s11ContactName" value="${esc(ws.contactName||"")}" placeholder="Name"></div><div class="field"><label for="s11ContactDetail">Contact detail</label><input id="s11ContactDetail" value="${esc(ws.contactDetail||"")}" placeholder="Email, LinkedIn, phone..."></div><div class="field s11-field-wide"><label for="s11Notes">Application notes</label><textarea id="s11Notes" rows="6" placeholder="Application evidence, recruiter notes, questions, next steps...">${esc(ws.applicationNotes||job.notes||"")}</textarea></div><div class="field s11-field-wide"><label for="s11InterviewNotes">Interview preparation notes</label><textarea id="s11InterviewNotes" rows="6" placeholder="Examples to discuss, questions to ask, role-specific preparation...">${esc(ws.interviewNotes||"")}</textarea></div></div></section>
</div><div class="s11-stack">
<section class="panel"><div class="s11-section-head"><div><div class="eyebrow">REQUIREMENTS</div><h3>Skills / knowledge</h3></div></div>${skills.length?`<div class="s11-skills">${skills.map(skill=>`<span class="s11-skill">${esc(skill)}</span>`).join("")}</div>`:'<div class="s11-empty">No requirements have been saved for this job yet.</div>'}</section>
<section class="panel"><div class="s11-section-head"><div><div class="eyebrow">APPLICATION TIMELINE</div><h3>Recent progress</h3></div></div><div class="s11-timeline">${events.length?events.map(evt=>`<div class="s11-event"><strong>${esc(evt.text)}</strong><span>${esc(new Intl.DateTimeFormat("en-IE",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(evt.time)))}</span></div>`).join(""):'<div class="s11-empty">Progress updates will appear here.</div>'}</div></section>
<section class="panel"><div class="s11-section-head"><div><div class="eyebrow">INTERVIEW READINESS</div><h3>Prepare for the next conversation</h3></div></div><p class="s11-savehint" style="line-height:1.6">Keep role-specific examples and questions in the interview notes above. When the application reaches Interview or Final Interview, this workspace keeps those notes attached to the correct job.</p><div class="s11-actions"><button id="s11MarkInterview">Mark as Interview</button><button id="s11MarkFinal">Mark Final Interview</button></div></section>
</div></div>`;
    bindBody(job);
  }

  function updateJob(jobId,patch,activity,eventText){
    const next=state();next.jobs=Array.isArray(next.jobs)?next.jobs:[];
    const existing=next.jobs.find(j=>String(j.id)===String(jobId));if(!existing)return;
    Object.assign(existing,patch,{updatedAt:new Date().toISOString()});
    saveState(next,activity);
    if(eventText)patchWorkspace(existing,{},eventText);
  }

  function bindBody(job){
    q("s11OpenTracker")?.addEventListener("click",()=>{try{if(typeof navigate==="function")navigate("jobs");}catch{}});
    document.querySelectorAll("[data-s11-check]").forEach(input=>input.addEventListener("change",()=>{const ws=getWorkspace(job);patchWorkspace(job,{checks:{...(ws.checks||{}),[input.dataset.s11Check]:input.checked}},`${input.checked?"Completed":"Reopened"}: ${input.closest("label")?.innerText?.trim()||"checklist item"}`);renderBody();}));
    const autoWorkspace=(id,key)=>q(id)?.addEventListener("change",e=>patchWorkspace(job,{[key]:e.target.value}));
    autoWorkspace("s11NextAction","nextAction");autoWorkspace("s11ContactName","contactName");autoWorkspace("s11ContactDetail","contactDetail");autoWorkspace("s11Notes","applicationNotes");autoWorkspace("s11InterviewNotes","interviewNotes");
    q("s11Applied")?.addEventListener("change",e=>{const value=e.target.value;updateJob(job.id,{dateApplied:value,status:value&&job.status==="Saved"?"Applied":job.status},`Updated application date for ${job.position} at ${job.company}`,value?"Application date recorded":"Application date cleared");renderBody();});
    q("s11Deadline")?.addEventListener("change",e=>{updateJob(job.id,{applicationDeadline:e.target.value},`Updated deadline for ${job.position} at ${job.company}`,"Application deadline updated");renderBody();});
    q("s11MarkInterview")?.addEventListener("click",()=>{updateJob(job.id,{status:"Interview"},`Moved ${job.position} at ${job.company} to Interview`,`Status changed to Interview`);renderBody();});
    q("s11MarkFinal")?.addEventListener("click",()=>{updateJob(job.id,{status:"Final Interview"},`Moved ${job.position} at ${job.company} to Final Interview`,`Status changed to Final Interview`);renderBody();});
  }

  function saveCore(){
    const job=currentJob();if(!job)return;
    const newStatus=q("s11Status").value;const follow=q("s11FollowUp").value;
    const changes=[];if(newStatus!==job.status)changes.push(`status → ${newStatus}`);if(follow!==job.followUpDate)changes.push("follow-up updated");
    updateJob(job.id,{status:newStatus,followUpDate:follow},`Updated application workspace for ${job.position} at ${job.company}`,changes.length?changes.join(" · "):"Application progress saved");
    renderBody();
  }

  function showPage(){
    document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
    document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.page==="workspace"));
    q("applicationWorkspacePage")?.classList.add("active");if(q("pageTitle"))q("pageTitle").textContent="Application Workspace";q("sidebar")?.classList.remove("open");renderBody();window.scrollTo({top:0,behavior:"smooth"});
  }

  function bind(){
    q("s11JobSelect")?.addEventListener("change",e=>{selectedJobId=e.target.value;renderBody();});
    q("s11SaveCore")?.addEventListener("click",saveCore);
    window.addEventListener("storage",e=>{if([STATE_KEY,WS_KEY].includes(e.key))renderBody();});
  }

  function init(){ensureStyles();ensureNav();ensurePage();renderSelector();bind();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();

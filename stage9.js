"use strict";

/* Stage 9 - Daily Job Hunt Workflow & Priority Queue.
   Uses tracker activity for automatic progress and preserves the existing dailyGoals structure. */
const S9_KEY="irelandJobHuntOS";
const S9_TARGET_KEY="irelandJobHuntOS_stage9Targets";
const S9_DEFAULT_TARGETS={findJobs:5,applyJobs:3,followUps:2,networking:1,learning:1,interview:1};
const s9q=id=>document.getElementById(id);
const s9esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
function s9State(){try{return JSON.parse(localStorage.getItem(S9_KEY)||"{}");}catch{return {};}}
function s9Save(state){localStorage.setItem(S9_KEY,JSON.stringify(state));if(typeof refreshAll==="function")refreshAll();}
function s9Today(){const d=new Date();return s9DateKey(d);}
function s9DateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function s9ParseDate(v){if(!v)return null;const d=new Date(`${v}T00:00:00`);return Number.isNaN(d.getTime())?null:d;}
function s9Fmt(v){const d=s9ParseDate(v);return d?new Intl.DateTimeFormat("en-IE",{day:"numeric",month:"short"}).format(d):"—";}
function s9Targets(){try{return {...S9_DEFAULT_TARGETS,...JSON.parse(localStorage.getItem(S9_TARGET_KEY)||"{}")};}catch{return {...S9_DEFAULT_TARGETS};}}
function s9SaveTargets(t){localStorage.setItem(S9_TARGET_KEY,JSON.stringify(t));}
function s9Jobs(state=s9State()){return Array.isArray(state.jobs)?state.jobs:[];}
function s9DayGoals(state,date){return state.dailyGoals?.[date]||{};}
function s9Counts(date,state=s9State()){
  const jobs=s9Jobs(state);const goals=s9DayGoals(state,date);
  return {
    findJobs:jobs.filter(j=>j.dateDiscovered===date).length,
    applyJobs:jobs.filter(j=>j.dateApplied===date).length,
    followUps:jobs.reduce((n,j)=>n+(Array.isArray(j.followUpHistory)?j.followUpHistory.filter(h=>h.date===date).length:0),0),
    networking:goals.networking?1:0,
    learning:(goals.learning||goals.lab)?1:0,
    interview:goals.interview?1:0
  };
}
function s9Progress(count,target){return Math.min(100,Math.round((count/Math.max(1,target))*100));}
function s9DayActive(date,state){const c=s9Counts(date,state);return Object.values(c).some(v=>v>0);}
function s9Streak(state=s9State()){
  let streak=0;const d=new Date();
  for(let i=0;i<365;i++){const key=s9DateKey(d);if(s9DayActive(key,state))streak++;else if(i===0){}else break;d.setDate(d.getDate()-1);}
  return streak;
}
function s9PriorityJobs(){
  const today=s9ParseDate(s9Today());const terminal=new Set(["Offer","Rejected","Withdrawn"]);const items=[];
  s9Jobs().forEach(job=>{
    if(terminal.has(job.status))return;
    const follow=s9ParseDate(job.followUpDate);const deadline=s9ParseDate(job.applicationDeadline);const daysDeadline=deadline?Math.round((deadline-today)/86400000):null;
    if(follow&&follow<=today)items.push({rank:1,type:"Follow-up due",detail:`Due ${s9Fmt(job.followUpDate)}`,job,action:"followups"});
    else if(job.status==="Applying")items.push({rank:2,type:"Finish application",detail:"Application is still in progress",job,action:"jobs"});
    if(daysDeadline!==null&&daysDeadline>=0&&daysDeadline<=3&&!job.dateApplied)items.push({rank:3,type:"Deadline approaching",detail:daysDeadline===0?"Deadline today":`${daysDeadline} day${daysDeadline===1?"":"s"} remaining`,job,action:"jobs"});
    if(job.status==="Saved"&&Number(job.matchScore)>=70)items.push({rank:4,type:"High-match saved job",detail:`${job.matchScore}% match · not yet applied`,job,action:"jobs"});
  });
  const seen=new Set();return items.sort((a,b)=>a.rank-b.rank).filter(x=>{const k=`${x.job.id}:${x.type}`;if(seen.has(k))return false;seen.add(k);return true;}).slice(0,10);
}
function s9EnsureStyles(){if(s9q("stage9Styles"))return;const st=document.createElement("style");st.id="stage9Styles";st.textContent=`
.s9-shell{display:grid;gap:16px}.s9-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.s9-stat{padding:16px;border:1px solid var(--border);border-radius:12px;background:var(--surface)}.s9-stat span{display:block;color:var(--muted);font-size:11px}.s9-stat strong{display:block;font-size:25px;margin-top:5px}.s9-goals{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.s9-goal{padding:14px;border:1px solid var(--border);border-radius:12px;background:var(--surface2)}.s9-goal-head{display:flex;justify-content:space-between;gap:10px}.s9-goal small{color:var(--muted)}.s9-bar{height:7px;background:rgba(255,255,255,.06);border-radius:999px;overflow:hidden;margin-top:10px}.s9-bar span{display:block;height:100%;background:var(--accent);border-radius:999px}.s9-manual{display:flex;gap:8px;align-items:center;margin-top:10px;font-size:11px}.s9-manual input{accent-color:var(--accent)}.s9-targets{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}.s9-targets input{width:100%}.s9-priority{display:grid;gap:10px}.s9-item{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:13px;border:1px solid var(--border);border-radius:10px;background:var(--surface2)}.s9-item strong{display:block}.s9-item small{color:var(--muted)}.s9-tag{font-size:10px;color:var(--warn);text-transform:uppercase;letter-spacing:.5px}.s9-week{width:100%;border-collapse:collapse}.s9-week th,.s9-week td{text-align:left;padding:9px 8px;border-bottom:1px solid var(--border);font-size:11px}.s9-week th{color:var(--muted);font-weight:600}.s9-actions{display:flex;gap:8px;flex-wrap:wrap}.s9-actions button{border:1px solid var(--border);background:var(--surface);color:var(--text);padding:7px 9px;border-radius:8px;cursor:pointer}@media(max-width:950px){.s9-stats{grid-template-columns:1fr 1fr}.s9-goals{grid-template-columns:1fr 1fr}.s9-targets{grid-template-columns:repeat(3,1fr)}}@media(max-width:600px){.s9-stats,.s9-goals{grid-template-columns:1fr}.s9-targets{grid-template-columns:1fr 1fr}.s9-item{align-items:flex-start;flex-direction:column}}
`;document.head.appendChild(st);}
function s9CreatePage(){
  if(s9q("dailyWorkflowPage"))return;const placeholder=s9q("placeholderPage")||document.querySelector("main");if(!placeholder)return;
  const page=document.createElement("section");page.className="page";page.id="dailyWorkflowPage";page.innerHTML=`
  <div class="page-heading"><div><div class="eyebrow">DAILY EXECUTION</div><h1>Daily Job Hunt</h1><p>Focus on the highest-value actions today. Progress is calculated from your tracker wherever possible.</p></div></div>
  <div class="s9-shell"><section class="s9-stats" id="s9Stats"></section><section class="panel"><div class="analysis-card-head"><div><div class="eyebrow">TODAY'S PROGRESS</div><h3>Daily targets</h3></div><button class="secondary-btn" id="s9EditTargets">Edit targets</button></div><div class="s9-goals" id="s9Goals"></div><div id="s9TargetEditor" hidden style="margin-top:16px"><div class="s9-targets" id="s9Targets"></div><div class="s9-actions" style="margin-top:10px"><button id="s9SaveTargets">Save targets</button><button id="s9CancelTargets">Cancel</button></div></div></section><section class="panel"><div class="eyebrow">PRIORITY QUEUE</div><h3>What deserves attention next</h3><div class="s9-priority" id="s9Priority"></div></section><section class="panel"><div class="eyebrow">LAST 7 DAYS</div><h3>Consistency overview</h3><div id="s9Week"></div></section></div>`;
  placeholder.parentNode.insertBefore(page,placeholder);
}
function s9Show(){document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.page==="daily"));s9q("dailyWorkflowPage")?.classList.add("active");if(s9q("pageTitle"))s9q("pageTitle").textContent="Daily Job Hunt";s9q("sidebar")?.classList.remove("open");s9Render();window.scrollTo({top:0,behavior:"smooth"});}
function s9ToggleManual(key,checked){const state=s9State();state.dailyGoals=state.dailyGoals||{};state.dailyGoals[s9Today()]=state.dailyGoals[s9Today()]||{};state.dailyGoals[s9Today()][key]=checked;s9Save(state);s9Render();}
function s9Render(){
  const state=s9State(),targets=s9Targets(),today=s9Today(),counts=s9Counts(today,state);const complete=Object.keys(S9_DEFAULT_TARGETS).filter(k=>counts[k]>=targets[k]).length;
  const stats=s9q("s9Stats");if(stats)stats.innerHTML=[[complete,"Goals completed"],[s9PriorityJobs().length,"Priority actions"],[s9Streak(state),"Active-day streak"],[s9Jobs(state).filter(j=>j.dateApplied===today).length,"Applications today"]].map(([v,l])=>`<article class="s9-stat"><span>${l}</span><strong>${v}${l==="Goals completed"?" / 6":""}</strong></article>`).join("");
  const labels={findJobs:"Jobs found",applyJobs:"Applications sent",followUps:"Follow-ups completed",networking:"Networking",learning:"Learning / portfolio",interview:"Interview prep"};
  const auto=new Set(["findJobs","applyJobs","followUps"]);const goals=s9q("s9Goals");if(goals)goals.innerHTML=Object.keys(labels).map(k=>`<article class="s9-goal"><div class="s9-goal-head"><div><strong>${labels[k]}</strong><small>${auto.has(k)?"Automatic":"Manual"}</small></div><strong>${counts[k]} / ${targets[k]}</strong></div><div class="s9-bar"><span style="width:${s9Progress(counts[k],targets[k])}%"></span></div>${auto.has(k)?"":`<label class="s9-manual"><input type="checkbox" data-s9-manual="${k}" ${counts[k]?"checked":""}> Mark completed today</label>`}</article>`).join("");
  goals?.querySelectorAll("[data-s9-manual]").forEach(i=>i.addEventListener("change",()=>s9ToggleManual(i.dataset.s9Manual,i.checked)));
  const priority=s9q("s9Priority"),items=s9PriorityJobs();if(priority)priority.innerHTML=items.length?items.map(x=>`<div class="s9-item"><div><span class="s9-tag">${s9esc(x.type)}</span><strong>${s9esc(x.job.position)} · ${s9esc(x.job.company)}</strong><small>${s9esc(x.detail)}</small></div><button class="secondary-btn" data-s9-go="${x.action}">Open</button></div>`).join(""):'<div class="empty">No urgent tracker actions right now. Use the time for a focused search, networking, learning, or interview preparation.</div>';
  priority?.querySelectorAll("[data-s9-go]").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.s9Go==="followups"&&typeof s8ShowPage==="function")s8ShowPage();else if(typeof navigate==="function")navigate("jobs");}));
  s9RenderWeek(state);
}
function s9RenderWeek(state){const host=s9q("s9Week");if(!host)return;const rows=[];const d=new Date();for(let i=0;i<7;i++){const key=s9DateKey(d),c=s9Counts(key,state);rows.push({key,c,total:Object.values(c).reduce((a,b)=>a+b,0)});d.setDate(d.getDate()-1);}host.innerHTML=`<table class="s9-week"><thead><tr><th>Date</th><th>Found</th><th>Applied</th><th>Follow-ups</th><th>Manual goals</th><th>Total actions</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${s9Fmt(r.key)}</td><td>${r.c.findJobs}</td><td>${r.c.applyJobs}</td><td>${r.c.followUps}</td><td>${r.c.networking+r.c.learning+r.c.interview}</td><td>${r.total}</td></tr>`).join("")}</tbody></table>`;}
function s9TargetEditor(show){const box=s9q("s9TargetEditor");if(!box)return;box.hidden=!show;if(show){const labels={findJobs:"Jobs found",applyJobs:"Applications",followUps:"Follow-ups",networking:"Networking",learning:"Learning",interview:"Interview prep"};const t=s9Targets();s9q("s9Targets").innerHTML=Object.keys(labels).map(k=>`<div class="field"><label>${labels[k]}</label><input type="number" min="1" max="50" data-s9-target="${k}" value="${t[k]}"></div>`).join("");}}
function s9Init(){
  s9EnsureStyles();s9CreatePage();const daily=document.querySelector('.nav button[data-page="daily"]');daily?.addEventListener("click",()=>setTimeout(s9Show,0));
  s9q("s9EditTargets")?.addEventListener("click",()=>s9TargetEditor(true));s9q("s9CancelTargets")?.addEventListener("click",()=>s9TargetEditor(false));s9q("s9SaveTargets")?.addEventListener("click",()=>{const t={};document.querySelectorAll("[data-s9-target]").forEach(i=>t[i.dataset.s9Target]=Math.max(1,Number(i.value)||1));s9SaveTargets(t);s9TargetEditor(false);s9Render();});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&s9q("dailyWorkflowPage")?.classList.contains("active"))s9Render();});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",s9Init);else s9Init();

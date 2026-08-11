"use strict";

/* Stage 10.5 - Multi-source Job Search UI.
   Enhances Stage 10 results returned by JobDataLake + Jooble without changing profile matching logic. */
(function stage10MultiSource(){
  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const uniq=items=>[...new Set((items||[]).map(v=>String(v||"").trim()).filter(Boolean))];
  const providerNames=job=>uniq(Array.isArray(job?.providers)&&job.providers.length?job.providers:[job?.provider,job?.source]).slice(0,4);
  const arrangement=value=>({fully_remote:"Remote",hybrid:"Hybrid",on_site:"On-site"}[String(value||"").toLowerCase()]||String(value||"").replace(/_/g," "));

  function enhance(){
    if(typeof s10Card!=="function"||typeof s10SaveJob!=="function"||typeof s10Salary!=="function"){
      setTimeout(enhance,100);
      return;
    }
    if(window.__stage10MultiSourceReady)return;
    window.__stage10MultiSourceReady=true;

    const baseSalary=s10Salary;
    s10Salary=function(job){
      if(job?.salary_text)return String(job.salary_text);
      return baseSalary(job);
    };

    s10Card=function(job){
      const m=job._match;
      const desc=String(job.description||"");
      const providers=providerNames(job);
      const providerText=providers.length?providers.join(" + "):"Live source";
      const remote=arrangement(job.remote_type);
      const sourceBadges=providers.map(name=>`<span class="s10-source-chip">${esc(name)}</span>`).join("");
      const required=uniq(job.required_skills).slice(0,8);
      return `<article class="s10-card"><div class="s10-head"><div><h3>${esc(job.title||"Untitled role")}</h3><div class="s10-company">${esc(job.company||"Company not listed")}</div><div class="s10-sources">${sourceBadges}</div></div><div class="s10-score">${m.score}%</div></div><div class="s10-meta"><span>📍 ${esc(job.location||"Ireland")}</span><span>${esc(s10Salary(job))}</span>${remote?`<span>${esc(remote)}</span>`:""}${job.contract_time?`<span>${esc(job.contract_time)}</span>`:""}${job.created?`<span>Posted ${esc(s10Date(job.created))}</span>`:""}</div>${required.length?`<div class="s10-skills">${required.map(skill=>`<span class="s10-chip">${esc(skill)}</span>`).join("")}</div>`:""}<div class="s10-desc">${esc(desc.length>520?`${desc.slice(0,520)}…`:desc)}</div><div class="s10-match"><strong>Why it matches:</strong> ${esc(m.reasons.length?m.reasons.join(" · "):"No strong profile evidence found yet; review the description manually.")}</div><div class="s10-actions">${job.redirect_url?`<a class="primary" href="${esc(job.redirect_url)}" target="_blank" rel="noopener noreferrer">View job ↗</a>`:""}<button data-s10-save="${esc(job.id)}">Save to Tracker</button></div><div class="s10-source-note">Source${providers.length===1?"":"s"}: ${esc(providerText)}</div></article>`;
    };

    s10SaveJob=function(id,button){
      const job=s10Results.find(j=>String(j.id)===String(id));
      if(!job)return;
      const state=s10State();
      state.jobs=Array.isArray(state.jobs)?state.jobs:[];
      const duplicate=state.jobs.some(j=>(job.redirect_url&&j.jobUrl===job.redirect_url)||(job.id&&j.sourceJobId===job.id));
      if(duplicate){button.textContent="Already saved";button.disabled=true;return;}
      const providers=providerNames(job);
      const skills=uniq([...(job._match?.matchedSkills||[]),...(Array.isArray(job.required_skills)?job.required_skills:[])]).slice(0,25);
      const newJob={
        id:`job_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
        company:job.company||"",
        position:job.title||"",
        jobUrl:job.redirect_url||"",
        location:job.location||"",
        workArrangement:arrangement(job.remote_type),
        salary:s10Salary(job)==="Salary not listed"?"":s10Salary(job),
        jobType:job.contract_time||job.contract_type||"",
        dateDiscovered:s10Today(),
        applicationDeadline:"",
        dateApplied:"",
        status:"Saved",
        matchScore:job._match?.score||0,
        followUpDate:"",
        requiredSkills:skills,
        notes:`Discovered through multi-source live search. Provider${providers.length===1?"":"s"}: ${providers.join(", ")||"Live job source"}. Search term: ${job.matched_query||"profile match"}.`,
        source:providers.join(" + ")||job.source||"Live Job Search",
        sourceJobId:job.id||"",
        createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString()
      };
      state.jobs.unshift(newJob);
      state.activity=Array.isArray(state.activity)?state.activity:[];
      state.activity.unshift({id:`act_${Date.now()}`,text:`Saved live job ${newJob.position} at ${newJob.company}`,time:new Date().toISOString()});
      s10SaveState(state);
      button.textContent="Saved ✓";
      button.disabled=true;
    };

    const style=document.createElement("style");
    style.id="stage10MultiStyles";
    style.textContent=`.s10-sources,.s10-skills{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}.s10-source-chip{font-size:10px;padding:4px 7px;border-radius:999px;border:1px solid rgba(40,209,124,.35);color:var(--accent);background:rgba(40,209,124,.06)}.s10-source-note{margin-top:10px;color:var(--muted);font-size:10px}`;
    document.head.appendChild(style);

    const patchLabels=()=>{
      const page=document.getElementById("liveSearchPage");
      if(!page)return;
      const count=page.querySelector(".analysis-count");
      if(count)count.textContent="JobDataLake + Jooble";
      const heading=page.querySelector(".page-heading p");
      if(heading)heading.textContent="Search multiple Ireland job sources using your target roles and skills, remove duplicates, rank matches locally, and save the strongest opportunities to Job Tracker.";
    };
    patchLabels();
    document.querySelector('.nav [data-page="search"]')?.addEventListener("click",()=>setTimeout(patchLabels,30));
  }
  enhance();
})();

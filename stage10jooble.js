"use strict";

/* Stage 10 Jooble Ireland adapter: source branding + accurate tracker metadata. */
(function initJoobleAdapter(){
  function applyBranding(){
    const page=document.getElementById("liveSearchPage");
    if(!page)return;
    page.querySelectorAll(".analysis-count").forEach(el=>{
      if(/adzuna/i.test(el.textContent||""))el.textContent="Jooble live jobs";
    });
  }

  function installSaveOverride(){
    if(typeof s10SaveJob!=="function"||typeof s10State!=="function"||typeof s10SaveState!=="function")return false;
    s10SaveJob=function(id,button){
      const job=s10Results.find(j=>String(j.id)===String(id));
      if(!job)return;
      const state=s10State();
      state.jobs=Array.isArray(state.jobs)?state.jobs:[];
      const duplicate=state.jobs.some(j=>(job.redirect_url&&j.jobUrl===job.redirect_url)||(job.id&&j.sourceJobId===job.id));
      if(duplicate){button.textContent="Already saved";button.disabled=true;return;}
      const provider=job.provider||job.source||"Jooble";
      const salary=s10Salary(job);
      const newJob={
        id:`job_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
        company:job.company||"",
        position:job.title||"",
        jobUrl:job.redirect_url||"",
        location:job.location||"",
        workArrangement:"",
        salary:salary==="Salary not listed"?"":salary,
        jobType:job.contract_time||job.contract_type||"",
        dateDiscovered:s10Today(),
        applicationDeadline:"",
        dateApplied:"",
        status:"Saved",
        matchScore:job._match.score,
        followUpDate:"",
        requiredSkills:job._match.matchedSkills||[],
        notes:`Discovered through ${provider} live search. Search term: ${job.matched_query||"profile match"}.`,
        source:provider,
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
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{
    applyBranding();
    if(installSaveOverride()||++tries>80)clearInterval(timer);
  },100);
  document.addEventListener("click",e=>{
    if(e.target?.closest?.('[data-page="search"]'))setTimeout(applyBranding,100);
  });
})();

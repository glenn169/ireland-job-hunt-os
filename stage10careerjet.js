"use strict";

/* Stage 10 Ireland source bridge: Careerjet Ireland. */
(function careerjetIrelandBridge(){
  function patchLabels(){
    const page=document.getElementById("liveSearchPage");
    if(!page)return;
    page.querySelectorAll(".analysis-count").forEach(el=>{
      if(/Adzuna live jobs/i.test(el.textContent||"")) el.textContent="Careerjet Ireland";
    });
    const intro=page.querySelector(".page-heading p");
    if(intro)intro.textContent="Search current Ireland vacancies through Careerjet Ireland using your target roles and skills, rank them locally, and save the strongest opportunities to Job Tracker.";
  }

  const originalCreate=window.s10CreatePage;
  if(typeof originalCreate==="function"){
    window.s10CreatePage=function(){const r=originalCreate.apply(this,arguments);patchLabels();return r;};
  }

  window.s10SaveJob=function(id,button){
    const job=(window.s10Results||[]).find(j=>String(j.id)===String(id));
    if(!job)return;
    const state=typeof s10State==="function"?s10State():JSON.parse(localStorage.getItem("irelandJobHuntOS")||"{}");
    state.jobs=Array.isArray(state.jobs)?state.jobs:[];
    const duplicate=state.jobs.some(j=>(job.redirect_url&&j.jobUrl===job.redirect_url)||(job.id&&j.sourceJobId===job.id));
    if(duplicate){button.textContent="Already saved";button.disabled=true;return;}
    const source=job.source||"Careerjet Ireland";
    const today=typeof s10Today==="function"?s10Today():new Date().toISOString().slice(0,10);
    const salary=typeof s10Salary==="function"?s10Salary(job):"";
    const newJob={
      id:`job_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      company:job.company||"",position:job.title||"",jobUrl:job.redirect_url||"",location:job.location||"",workArrangement:"",
      salary:salary==="Salary not listed"?"":salary,jobType:job.contract_time||job.contract_type||"",dateDiscovered:today,
      applicationDeadline:"",dateApplied:"",status:"Saved",matchScore:job._match?.score||0,followUpDate:"",requiredSkills:job._match?.matchedSkills||[],
      notes:`Discovered through ${source}. Search term: ${job.matched_query||"profile match"}.`,source,sourceJobId:job.id||"",
      createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
    };
    state.jobs.unshift(newJob);
    state.activity=Array.isArray(state.activity)?state.activity:[];
    state.activity.unshift({id:`act_${Date.now()}`,text:`Saved live job ${newJob.position} at ${newJob.company}`,time:new Date().toISOString()});
    if(typeof s10SaveState==="function")s10SaveState(state);else localStorage.setItem("irelandJobHuntOS",JSON.stringify(state));
    button.textContent="Saved ✓";button.disabled=true;
  };

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(patchLabels,0));
  else setTimeout(patchLabels,0);
})();

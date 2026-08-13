"use strict";

/* Stage 4 compatibility: keep the analyzer's internal candidate field while removing manual user entry. */
(function stage4AnalyzerCompatibility(){
  const PROFILE_KEY="irelandJobHuntOS_profileV1";
  const $=id=>document.getElementById(id);
  function readProfile(){try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||"{}");}catch{return {};}}
  function context(){
    const p=readProfile();
    return [
      ["Name",p.fullName],["Location",p.location],["Years of experience",p.yearsExperience],
      ["Target roles",p.targetRoles],["Industries",p.industries],["Work authorisation",p.workAuthorisation],
      ["Languages",p.languages],["Education",p.education],["Certifications",p.certifications],
      ["Professional skills",p.professionalSkills],["Soft skills",p.softSkills],
      ["Experience summary",p.experienceSummary],["Resume / profile text",p.resumeText]
    ].filter(([,v])=>String(v||"").trim()).map(([k,v])=>`${k}: ${String(v).trim()}`).join("\n");
  }
  function ensure(){
    const page=$("analyzerPage");if(!page)return;
    let box=$("candidateContextInput");
    if(!box){box=document.createElement("textarea");box.id="candidateContextInput";box.hidden=true;box.setAttribute("aria-hidden","true");page.appendChild(box);}
    box.value=context();localStorage.setItem("irelandJobHuntOS_candidateContext",box.value);
    let info=$("s4AnalyzerProfileInfo");
    if(!info){
      const inputPanel=page.querySelector(".analyzer-input-panel");
      if(inputPanel){info=document.createElement("section");info.id="s4AnalyzerProfileInfo";info.className="panel";info.innerHTML='<div class="analysis-card-head"><div><div class="eyebrow">PROFILE CV</div><h3>Saved Profile CV is loaded automatically</h3></div><span class="analysis-count">AUTO</span></div><p class="analysis-notice">Paste only the job description below. Matching uses the CV stored in Profile, so you no longer need to enter a candidate summary for every analysis.</p>';inputPanel.parentNode.insertBefore(info,inputPanel);}
    }
    const old=page.querySelector(".candidate-context-panel");if(old&&old!==info)old.style.display="none";
  }
  const btn=()=>$("analyzeJobButton");
  function bind(){ensure();const b=btn();if(b&&!b.dataset.s4Compat){b.dataset.s4Compat="1";b.addEventListener("click",ensure,true);}}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind);else bind();
  let tries=0;const timer=setInterval(()=>{bind();if(++tries>60)clearInterval(timer);},250);
})();

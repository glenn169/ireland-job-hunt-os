"use strict";

/* Stage 7.1 - Smart Job Entry + field-level Job Tracker editing */
(function initSmartJobFeature(){
  const STATUS_OPTIONS=["Saved","Applying","Applied","Assessment","Interview","Final Interview","Offer","Rejected","Withdrawn"];
  const ARRANGEMENT_OPTIONS=["","On-site","Hybrid","Remote"];
  const JOB_TYPE_OPTIONS=["","Full-time","Graduate","Contract","Internship","Part-time"];

  function textLines(text){ return String(text||"").split(/\r?\n/).map(v=>v.replace(/\s+/g," ").trim()).filter(Boolean); }
  function firstMatch(text,regex){ const m=String(text||"").match(regex); return m?m[1].trim():""; }
  function titleCase(value){ return value.replace(/\b\w/g,c=>c.toUpperCase()); }

  function detectPosition(text){
    const labelled=firstMatch(text,/^(?:job title|position|role title|role)\s*[:\-]\s*(.{2,100})$/im);
    if(labelled) return labelled;
    const roleWords=/analyst|accountant|engineer|manager|specialist|consultant|administrator|developer|designer|nurse|scientist|technician|coordinator|executive|associate|assistant|officer|advisor|controller|recruiter|sales|marketing|finance|operations|support|architect|supervisor|director|lead/i;
    return textLines(text).slice(0,16).find(line=>line.length<=100 && roleWords.test(line) && !/about us|company|location|salary|description|responsibilities|requirements|apply|application/i.test(line))||"";
  }

  function detectCompany(text){
    const labelled=firstMatch(text,/^(?:company|employer|organisation|organization)\s*[:\-]\s*(.{2,100})$/im);
    if(labelled) return labelled;
    const about=firstMatch(text,/^about\s+([A-Z][A-Za-z0-9&.'’\- ]{1,70})$/m);
    return about && !/the role|the job|you|us/i.test(about)?about:"";
  }

  function detectJobType(text){
    const lower=text.toLowerCase();
    if(/\bintern(ship)?\b/.test(lower)) return "Internship";
    if(/\bgraduate\b|graduate programme|graduate program/.test(lower)) return "Graduate";
    if(/\bpart[- ]time\b/.test(lower)) return "Part-time";
    if(/\bcontract\b|fixed[- ]term|temporary contract/.test(lower)) return "Contract";
    if(/\bfull[- ]time\b|permanent full[- ]time|permanent role/.test(lower)) return "Full-time";
    return "";
  }

  function normaliseDateCandidate(raw){
    if(!raw) return "";
    const value=raw.trim().replace(/[,]/g,"");
    let m=value.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    if(m){ const d=Number(m[1]),mo=Number(m[2]),y=Number(m[3]); if(d<=31&&mo<=12) return `${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
    m=value.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})$/);
    if(m) return `${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`;
    const parsed=new Date(value);
    if(Number.isNaN(parsed.getTime())) return "";
    return `${parsed.getFullYear()}-${String(parsed.getMonth()+1).padStart(2,"0")}-${String(parsed.getDate()).padStart(2,"0")}`;
  }

  function detectDeadline(text){
    const m=String(text||"").match(/(?:application deadline|closing date|closing deadline|applications close|apply by|deadline)\s*[:\-]?\s*([^\n.;]{4,45})/i);
    return m?normaliseDateCandidate(m[1]):"";
  }

  function detectJobUrl(text){ return (String(text||"").match(/https?:\/\/[^\s)\]}>,]+/i)||[])[0]||""; }

  function smartMetadata(text){
    let location="", arrangement="", salary="";
    try { location=typeof detectLocation==="function"?detectLocation(text.toLowerCase()):""; } catch{}
    try { arrangement=typeof detectArrangement==="function"?detectArrangement(text.toLowerCase()):""; } catch{}
    try { salary=typeof detectSalary==="function"?detectSalary(text):""; } catch{}
    return {
      company:detectCompany(text),
      position:detectPosition(text),
      jobUrl:detectJobUrl(text),
      location:location&&location!=="Not detected"?location:"",
      workArrangement:arrangement&&arrangement!=="Not detected"?arrangement:"",
      salary:salary&&salary!=="Not detected"?salary:"",
      jobType:detectJobType(text),
      applicationDeadline:detectDeadline(text)
    };
  }

  function setFormValue(id,value){ const el=document.getElementById(id); if(el && value!==undefined && value!==null && String(value)!=="") el.value=value; }

  function autoFillTrackerFromAnalysis(){
    if(typeof openJobModal!=="function") return;
    const raw=document.getElementById("jobDescriptionInput")?.value||"";
    if(raw.trim().length<40) return;
    const meta=smartMetadata(raw);
    openJobModal();
    setFormValue("company",meta.company);
    setFormValue("position",meta.position);
    setFormValue("jobUrl",meta.jobUrl);
    setFormValue("location",meta.location);
    setFormValue("workArrangement",meta.workArrangement);
    setFormValue("salary",meta.salary);
    setFormValue("jobType",meta.jobType);
    setFormValue("applicationDeadline",meta.applicationDeadline);
    if(typeof latestAnalysis!=="undefined" && latestAnalysis){
      setFormValue("requiredSkills",(latestAnalysis.skills||[]).slice(0,24).join(", "));
      if(!meta.location && latestAnalysis.location!=="Not detected") setFormValue("location",latestAnalysis.location);
      if(!meta.workArrangement && ["Hybrid","Remote","On-site"].includes(latestAnalysis.arrangement)) setFormValue("workArrangement",latestAnalysis.arrangement);
      if(!meta.salary && latestAnalysis.salary!=="Not detected") setFormValue("salary",latestAnalysis.salary);
    }
    if(typeof latestMatchResult!=="undefined" && latestMatchResult) setFormValue("matchScore",latestMatchResult.overall);
    const matchBreakdown=(typeof latestMatchResult!=="undefined"&&latestMatchResult)?latestMatchResult.components.map(c=>`${c.label}: ${c.score===null?"N/A":`${c.score}%`}`).join(" | "):"Not calculated";
    const notes=[
      "Auto-filled from Job Analyzer. Review detected fields before saving.",
      `Overall match: ${(typeof latestMatchResult!=="undefined"&&latestMatchResult)?`${latestMatchResult.overall}% (${latestMatchResult.label})`:"Not calculated"}`,
      `Match breakdown: ${matchBreakdown}`,
      `Experience: ${(typeof latestAnalysis!=="undefined"&&latestAnalysis)?latestAnalysis.experience:"Not analysed"}`,
      `Qualifications: ${(typeof latestAnalysis!=="undefined"&&latestAnalysis&&latestAnalysis.qualifications?.length)?latestAnalysis.qualifications.join(", "):"None explicitly detected"}`,
      `Key requirements: ${(typeof latestAnalysis!=="undefined"&&latestAnalysis&&latestAnalysis.requirements?.length)?latestAnalysis.requirements.slice(0,8).join(" | "):"None explicitly detected"}`
    ];
    setFormValue("notes",notes.join("\n"));
    const missing=[]; if(!meta.company) missing.push("company"); if(!meta.position) missing.push("position");
    if(missing.length){ const target=document.getElementById(missing[0]); target?.focus(); }
    else document.getElementById("status")?.focus();
  }

  function interceptAnalyzerSave(){
    const button=document.getElementById("saveAnalysisToTracker");
    if(!button||button.dataset.smartJobBound) return;
    button.dataset.smartJobBound="true";
    button.textContent="Auto-fill Job Tracker";
    button.title="Detect job details from this description, pre-fill the Job Tracker form, then review before saving.";
    button.addEventListener("click",event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      autoFillTrackerFromAnalysis();
    },true);
  }

  const EDIT_FIELDS={
    company:{label:"Company",type:"text"}, position:{label:"Position",type:"text"}, location:{label:"Location",type:"text"},
    status:{label:"Status",type:"select",options:STATUS_OPTIONS}, workArrangement:{label:"Work arrangement",type:"select",options:ARRANGEMENT_OPTIONS},
    salary:{label:"Salary",type:"text"}, jobType:{label:"Job type",type:"select",options:JOB_TYPE_OPTIONS}, matchScore:{label:"Match score",type:"number"},
    applicationDeadline:{label:"Application deadline",type:"date"}, followUpDate:{label:"Follow-up date",type:"date"}, dateApplied:{label:"Date applied",type:"date"},
    jobUrl:{label:"Job URL",type:"url"}, requiredSkills:{label:"Required skills",type:"skills"}, notes:{label:"Notes",type:"textarea"}
  };

  function buildValueEditor(field,job){
    const config=EDIT_FIELDS[field]; let input;
    const current=field==="requiredSkills"?(job.requiredSkills||[]).join(", "):(job[field]??"");
    if(config.type==="select"){
      input=document.createElement("select"); config.options.forEach(value=>{ const option=document.createElement("option"); option.value=value; option.textContent=value||"Not specified"; input.appendChild(option); }); input.value=current;
    } else if(config.type==="textarea"){ input=document.createElement("textarea"); input.rows=3; input.value=current; }
    else { input=document.createElement("input"); input.type=config.type==="skills"?"text":config.type; input.value=current; if(config.type==="number"){input.min="0";input.max="100";} }
    input.className="smart-field-input"; return input;
  }

  function updateSingleField(job,field,value){
    let finalValue=value;
    if(field==="requiredSkills") finalValue=value.split(",").map(v=>v.trim()).filter(Boolean);
    if(field==="matchScore") finalValue=value===""?"":Math.max(0,Math.min(100,Number(value)));
    const updated={...job,[field]:finalValue,updatedAt:new Date().toISOString()};
    appState.jobs=appState.jobs.map(item=>item.id===job.id?updated:item);
    if(typeof addActivity==="function") addActivity(`Updated ${EDIT_FIELDS[field].label.toLowerCase()} for ${updated.position} at ${updated.company}`);
    if(typeof saveState==="function") saveState(appState);
    if(typeof refreshAll==="function") refreshAll(); else if(typeof renderJobs==="function") renderJobs();
  }

  function attachQuickEditor(card,job){
    if(card.querySelector(".smart-quick-edit")) return card;
    const actions=card.querySelector(".job-actions")||card;
    const button=document.createElement("button"); button.className="small-btn smart-quick-edit"; button.type="button"; button.textContent="Quick edit";
    const panel=document.createElement("div"); panel.className="smart-edit-panel"; panel.hidden=true;
    const fieldSelect=document.createElement("select"); fieldSelect.className="smart-field-select";
    Object.entries(EDIT_FIELDS).forEach(([key,config])=>{ const option=document.createElement("option"); option.value=key; option.textContent=config.label; fieldSelect.appendChild(option); });
    const editorHost=document.createElement("div"); editorHost.className="smart-editor-host";
    const save=document.createElement("button"); save.className="btn smart-save-field"; save.type="button"; save.textContent="Save field";
    const cancel=document.createElement("button"); cancel.className="secondary-btn smart-cancel-field"; cancel.type="button"; cancel.textContent="Cancel";
    function renderEditor(){ editorHost.innerHTML=""; editorHost.appendChild(buildValueEditor(fieldSelect.value,job)); }
    fieldSelect.addEventListener("change",renderEditor); renderEditor();
    save.addEventListener("click",()=>{ const input=editorHost.querySelector("input,textarea,select"); if(input) updateSingleField(job,fieldSelect.value,input.value.trim()); });
    cancel.addEventListener("click",()=>{ panel.hidden=true; });
    button.addEventListener("click",()=>{ panel.hidden=!panel.hidden; if(!panel.hidden) editorHost.querySelector("input,textarea,select")?.focus(); });
    const controls=document.createElement("div"); controls.className="smart-edit-controls"; controls.append(fieldSelect,editorHost,save,cancel); panel.appendChild(controls);
    actions.insertBefore(button,actions.firstChild); card.appendChild(panel); return card;
  }

  function patchJobCards(){
    if(typeof createJobCard!=="function" || createJobCard.__smartJobPatched) return;
    const original=createJobCard;
    const wrapped=function(job){ return attachQuickEditor(original(job),job); };
    wrapped.__smartJobPatched=true;
    createJobCard=wrapped;
    if(typeof renderJobs==="function") renderJobs();
  }

  function ensureStyles(){
    if(document.getElementById("smartJobStyles")) return;
    const style=document.createElement("style"); style.id="smartJobStyles";
    style.textContent=`.smart-edit-panel{margin-top:12px;padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--surface2)}.smart-edit-controls{display:grid;grid-template-columns:150px minmax(180px,1fr) auto auto;gap:8px;align-items:center}.smart-field-select,.smart-field-input{width:100%;min-height:38px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);padding:8px 10px}.smart-field-input[type="number"],.smart-field-input[type="date"]{color-scheme:dark}.smart-editor-host textarea{resize:vertical}.smart-save-field,.smart-cancel-field{min-height:38px;white-space:nowrap}@media(max-width:760px){.smart-edit-controls{grid-template-columns:1fr}.smart-save-field,.smart-cancel-field{width:100%}}`;
    document.head.appendChild(style);
  }

  function init(){ ensureStyles(); interceptAnalyzerSave(); patchJobCards(); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true}); else init();
})();

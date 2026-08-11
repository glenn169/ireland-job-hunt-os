"use strict";

/* Stage 4 - universal, profile-aware Job Description Analyzer + transparent Match Score Engine.
   Runs entirely in the browser. No resume or job-description text is transmitted. */

const PROFILE_CONTEXT_KEY = "irelandJobHuntOS_candidateContext";

const UNIVERSAL_SKILLS = [
  ["Excel", ["excel", "microsoft excel", "spreadsheets"]], ["Power BI", ["power bi", "powerbi"]], ["Tableau", ["tableau"]],
  ["SQL", ["sql"]], ["Python", ["python"]], ["R", [" r programming", " r language", "\nr\n"]], ["Statistics", ["statistics", "statistical analysis"]],
  ["Data Analysis", ["data analysis", "data analytics", "analytical reporting"]], ["Data Visualization", ["data visualization", "data visualisation"]],
  ["Financial Analysis", ["financial analysis", "financial modelling", "financial modeling"]], ["Accounting", ["accounting", "accountancy"]],
  ["Bookkeeping", ["bookkeeping"]], ["Payroll", ["payroll"]], ["Accounts Payable", ["accounts payable", "ap processing"]], ["Accounts Receivable", ["accounts receivable", "ar processing"]],
  ["Budgeting", ["budgeting", "budget management"]], ["Forecasting", ["forecasting", "financial forecast"]], ["Reconciliation", ["reconciliation", "bank reconciliations"]],
  ["IFRS", ["ifrs"]], ["GAAP", ["gaap"]], ["SAP", ["sap"]], ["Oracle", ["oracle financials", "oracle erp", "oracle"]],
  ["CRM", ["crm", "customer relationship management"]], ["Salesforce", ["salesforce"]], ["Sales", ["sales", "business development"]],
  ["Lead Generation", ["lead generation", "prospecting"]], ["Account Management", ["account management", "key accounts"]], ["Negotiation", ["negotiation", "negotiating"]],
  ["Digital Marketing", ["digital marketing"]], ["SEO", ["seo", "search engine optimization", "search engine optimisation"]], ["SEM", ["sem", "paid search"]],
  ["Google Analytics", ["google analytics", "ga4"]], ["Content Marketing", ["content marketing"]], ["Social Media", ["social media management", "social media"]],
  ["Recruitment", ["recruitment", "talent acquisition"]], ["HR", ["human resources", " hr ", "hr operations"]], ["Employee Relations", ["employee relations"]],
  ["Performance Management", ["performance management"]], ["Learning & Development", ["learning and development", "l&d"]],
  ["Project Management", ["project management", "project delivery"]], ["Agile", ["agile", "scrum"]], ["Jira", ["jira"]], ["Risk Management", ["risk management"]],
  ["Stakeholder Management", ["stakeholder management", "stakeholder engagement"]], ["Process Improvement", ["process improvement", "continuous improvement"]],
  ["Operations", ["operations management", "operational processes", "operations"]], ["Supply Chain", ["supply chain"]], ["Procurement", ["procurement", "purchasing"]],
  ["Inventory Management", ["inventory management", "stock management"]], ["Logistics", ["logistics"]], ["Quality Assurance", ["quality assurance", "qa"]],
  ["Customer Service", ["customer service", "customer support", "customer-facing", "customer focused", "customer-focused"]], ["Call Centre", ["call centre", "call center"]],
  ["Administration", ["administration", "administrative support"]], ["Microsoft Office", ["microsoft office", "ms office", "office applications"]],
  ["Communication", ["communication skills", "written and verbal communication", "excellent communication"]], ["Problem Solving", ["problem solving", "problem-solving"]],
  ["Attention to Detail", ["attention to detail", "detail-oriented", "detail orientated"]], ["Teamwork", ["teamwork", "team player", "collaborative"]],
  ["Leadership", ["leadership", "people management", "team management"]], ["Time Management", ["time management", "manage priorities", "prioritisation", "prioritization"]],
  ["Networking", ["networking", "network infrastructure", "enterprise network"]], ["NOC", ["network operations center", "network operations centre", "noc"]],
  ["Cisco", ["cisco"]], ["Juniper", ["juniper"]], ["TCP/IP", ["tcp/ip", "tcp ip"]], ["DNS", ["dns"]], ["DHCP", ["dhcp"]],
  ["Technical Support", ["technical support", "support engineer", "it support"]], ["Troubleshooting", ["troubleshooting", "troubleshoot", "diagnose and resolve"]],
  ["Incident Management", ["incident management", "manage incidents", "incident resolution"]], ["SLA Management", ["service level agreement", "service level agreements", "sla", "slas"]],
  ["Cybersecurity", ["cybersecurity", "cyber security", "information security"]], ["SIEM", ["siem", "security information and event management"]],
  ["SOC", ["security operations centre", "security operations center", "soc analyst"]], ["Microsoft Sentinel", ["microsoft sentinel", "azure sentinel"]],
  ["Splunk", ["splunk"]], ["Active Directory", ["active directory", "ad ds"]], ["Azure", ["microsoft azure", "azure"]], ["AWS", ["amazon web services", "aws"]],
  ["Linux", ["linux", "ubuntu", "rhel", "red hat"]], ["Windows", ["windows server", "windows 10", "windows 11"]],
  ["JavaScript", ["javascript"]], ["TypeScript", ["typescript"]], ["Java", ["java"]], ["C#", ["c#", ".net"]], ["Git", ["git", "github", "gitlab"]],
  ["REST APIs", ["rest api", "restful api"]], ["Docker", ["docker"]], ["Kubernetes", ["kubernetes", "k8s"]],
  ["AutoCAD", ["autocad"]], ["SolidWorks", ["solidworks"]], ["CAD", ["computer aided design", "computer-aided design", "cad"]],
  ["Health & Safety", ["health and safety", "health & safety", "h&s"]], ["Clinical Care", ["clinical care", "patient care"]], ["Patient Care", ["patient care"]],
  ["Nursing", ["nursing", "registered nurse"]], ["Medication Management", ["medication management", "medication administration"]]
];

const QUALIFICATION_PATTERNS = [
  ["Bachelor's degree", /bachelor'?s degree|\bbsc\b|\bba\b|\bbeng\b|level 8 degree/i],
  ["Master's degree", /master'?s degree|\bmsc\b|\bma\b|level 9/i],
  ["Relevant degree / third-level qualification", /relevant degree|third[- ]level qualification|degree in [a-z &/-]+/i],
  ["Driving licence", /driving licen[cs]e|driver'?s licen[cs]e|full clean licen[cs]e|irish or european driving licen[cs]e/i],
  ["Right to work / work authorisation", /right to work|eligible to work|authori[sz]ed to work|work permit|visa sponsorship/i],
  ["Professional certification", /professional certification|professional qualification|certified|certification/i],
  ["ACCA / ACA / CIMA", /\bacca\b|\baca\b|\bcima\b/i], ["CPA", /\bcpa\b/i],
  ["CFA", /\bcfa\b/i], ["PMP / PRINCE2", /\bpmp\b|prince2/i], ["CCNA / CCNP", /\bccna\b|\bccnp\b/i],
  ["JNCIA / JNCIP", /\bjncia\b|\bjncip\b/i], ["CIPD", /\bcipd\b/i],
  ["NMBI registration", /\bnmbi\b|nursing and midwifery board of ireland/i], ["Safe Pass", /safe pass/i]
];

const IRISH_LOCATIONS = ["Dublin","Cork","Galway","Limerick","Waterford","Kilkenny","Sligo","Athlone","Dundalk","Drogheda","Letterkenny","Wexford","Kildare","Naas","Carlow","Mullingar","Shannon","Clare","Meath","Wicklow","Donegal","Ireland"];
const STOPWORDS = new Set("the a an and or to of in on for with from by as at is are be will this that you your our we they it role job team work working required preferred desirable essential have has ability strong excellent good knowledge experience skills skill years year within across using use provide support manage management responsible responsibilities candidate candidates company opportunity looking including related relevant successful must should can who their through into about per day days week weeks month months".split(" "));

let latestAnalysis = null;
let latestMatchResult = null;
const unique = values => [...new Set(values.filter(Boolean))];
const cleanText = value => value.replace(/\s+/g, " ").trim();

function detectSkills(lowerText) {
  return UNIVERSAL_SKILLS.filter(([, aliases]) => aliases.some(alias => lowerText.includes(alias.toLowerCase()))).map(([name]) => name);
}

function detectQualifications(text) {
  return unique(QUALIFICATION_PATTERNS.filter(([, regex]) => regex.test(text)).map(([label]) => label));
}

function detectExperience(text) {
  const matches = [];
  const regexes = [
    /(\d+)\s*(?:-|–|to)\s*(\d+)\s*(?:years?|yrs?)(?:\s+of)?(?:\s+work)?\s+experience/gi,
    /(\d+)\+\s*(?:years?|yrs?)(?:\s+of)?(?:\s+work)?\s+experience/gi,
    /(?:at least|minimum(?: of)?|min\.?)\s*(\d+)\+?\s*(?:years?|yrs?)/gi,
    /(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:relevant|professional|hands[- ]on|work)?\s*experience/gi
  ];
  regexes.forEach(regex => { let m; while ((m = regex.exec(text)) !== null) { const min=Number(m[1]); const max=m[2]?Number(m[2]):null; if(min<=30) matches.push({min,max}); } });
  if(matches.length){ matches.sort((a,b)=>b.min-a.min); const r=matches[0]; return r.max?`${r.min}–${r.max} years`:`${r.min}+ years`; }
  const lower=text.toLowerCase();
  if(/graduate|entry[- ]level|recent graduate|no experience required|junior position/.test(lower)) return "Graduate / Entry level";
  if(/senior|principal|head of|director|lead role/.test(lower)) return "Senior / Experienced";
  return "Not clearly stated";
}

function detectLocation(lowerText) {
  const found=IRISH_LOCATIONS.filter(location=>lowerText.includes(location.toLowerCase()));
  const specific=found.filter(location=>location!=="Ireland");
  return (specific.length?specific:found).slice(0,3).join(", ")||"Not detected";
}

function detectArrangement(lowerText) {
  if(/\bhybrid\b|hybrid working|hybrid model/.test(lowerText)) return "Hybrid";
  if(/fully remote|\bremote\b|work from home/.test(lowerText) && !/on[- ]site|onsite|office[- ]based/.test(lowerText)) return "Remote";
  if(/on[- ]site|onsite|office[- ]based|office based|5 days per week/.test(lowerText)) return "On-site";
  return "Not detected";
}

function detectSalary(text) {
  const currency = text.match(/(?:up to\s*)?(?:€|£|\$)\s?\d{2,3}(?:[,.]\d{3})?(?:\s*(?:-|–|to)\s*(?:€|£|\$)?\s?\d{2,3}(?:[,.]\d{3})?)?(?:\s*(?:per annum|p\.a\.|pa|annually|per year|a year))?/i);
  return currency ? cleanText(currency[0]) : "Not detected";
}

function extractRequirementLines(text) {
  const lines=text.split(/\r?\n/).map(l=>l.replace(/^[\s•*-]+/,"").trim()).filter(l=>l.length>=12 && l.length<=220);
  const sectionHints=/required|requirements|qualifications|skills|experience|essential|desirable|responsibilities|what you.?ll|what we.?re looking|candidate|you will|you should|you must/i;
  const actionHints=/experience|knowledge|proficien|ability|responsib|manage|support|analyse|analyze|prepare|develop|maintain|communicat|coordinate|deliver|perform|ensure|lead|assist|monitor|report|customer|client|stakeholder|certif|degree|licen[cs]e|fluent|language/i;
  return unique(lines.filter(line=>sectionHints.test(line)||actionHints.test(line)).slice(0,18));
}

function extractGenericSkillPhrases(text) {
  const found=[];
  const patterns=[
    /(?:experience (?:with|in|using)|knowledge of|proficien(?:t|cy) (?:with|in)|skilled in|familiarity with|competent in)\s+([^.;:\n]{2,90})/gi,
    /(?:strong|excellent|good)\s+([a-z][a-z &/+.-]{2,55})\s+skills/gi,
    /(?:certification in|qualification in|degree in)\s+([^.;:\n]{2,70})/gi
  ];
  patterns.forEach(regex=>{ let m; while((m=regex.exec(text))!==null){ const value=m[1].split(/,| and | or /).map(cleanText).filter(v=>v.length>2&&v.length<55); found.push(...value); } });
  return unique(found).slice(0,18);
}

function extractATSKeywords(text, knownSkills, genericSkills) {
  const lower=text.toLowerCase().replace(/[^a-z0-9+#./ -]/g," ");
  const counts=new Map();
  lower.split(/\s+/).forEach(word=>{ if(word.length<4||STOPWORDS.has(word)||/^\d+$/.test(word)) return; counts.set(word,(counts.get(word)||0)+1); });
  const frequent=[...counts.entries()].filter(([,n])=>n>=2).sort((a,b)=>b[1]-a[1]).slice(0,18).map(([w])=>w.replace(/\b\w/g,c=>c.toUpperCase()));
  return unique([...knownSkills,...genericSkills,...frequent]).slice(0,36);
}

function compareWithProfile(items, profileText) {
  if(!profileText.trim()) return {matched:[],gaps:[]};
  const profile=profileText.toLowerCase();
  const normalize=s=>s.toLowerCase().replace(/[^a-z0-9+# ]/g," ").split(/\s+/).filter(w=>w.length>2&&!STOPWORDS.has(w));
  const matched=[]; const gaps=[];
  items.forEach(item=>{
    const words=normalize(item);
    const hit=profile.includes(item.toLowerCase()) || (words.length && words.filter(w=>profile.includes(w)).length/words.length>=0.6);
    (hit?matched:gaps).push(item);
  });
  return {matched:unique(matched),gaps:unique(gaps)};
}

function analyseJobDescription(text, profileText="") {
  const lower=text.toLowerCase();
  const skills=detectSkills(lower);
  const genericSkills=extractGenericSkillPhrases(text);
  const qualifications=detectQualifications(text);
  const requirements=extractRequirementLines(text);
  const experience=detectExperience(text);
  const location=detectLocation(lower);
  const arrangement=detectArrangement(lower);
  const salary=detectSalary(text);
  const allComparable=unique([...skills,...genericSkills,...qualifications,...requirements.slice(0,12)]);
  const comparison=compareWithProfile(allComparable,profileText);
  const keywords=extractATSKeywords(text,skills,genericSkills);
  return {skills:unique([...skills,...genericSkills]).slice(0,30),qualifications,requirements,experience,location,arrangement,salary,keywords,matched:comparison.matched,gaps:comparison.gaps};
}

function itemMatchDetails(items, profileText){
  if(!items.length) return {score:null,matched:[],missing:[],matchedCount:0,total:0};
  const comparison=compareWithProfile(items,profileText);
  return {score:Math.round((comparison.matched.length/items.length)*100),matched:comparison.matched,missing:comparison.gaps,matchedCount:comparison.matched.length,total:items.length};
}

function highestYearsMentioned(text){
  const years=[]; let match;
  const regex=/(\d{1,2})\+?\s*(?:years?|yrs?)/gi;
  while((match=regex.exec(text))!==null){ const value=Number(match[1]); if(value<=40) years.push(value); }
  return years.length?Math.max(...years):null;
}

function scoreExperienceRequirement(requirement,profileText){
  if(requirement==="Not clearly stated") return {score:null,detail:"No explicit experience threshold in the job description."};
  const lower=profileText.toLowerCase();
  if(requirement==="Graduate / Entry level") return {score:100,detail:"The role is marked graduate / entry level; no minimum years threshold is required."};
  if(requirement==="Senior / Experienced"){
    const evidence=/\bsenior\b|\blead\b|\bmanager\b|\bhead of\b|\bprincipal\b/.test(lower);
    return {score:evidence?100:40,detail:evidence?"Senior-level wording is present in the profile.":"The job signals seniority, but clear senior-level wording was not found in the profile."};
  }
  const required=Number((requirement.match(/\d+/)||[])[0]);
  const candidate=highestYearsMentioned(profileText);
  if(!Number.isFinite(required)) return {score:null,detail:"The experience requirement could not be converted to a numeric threshold."};
  if(candidate===null) return {score:0,detail:`The job asks for ${required}+ years, but a years-of-experience figure was not found in the profile.`};
  const ratio=candidate/required;
  const score=ratio>=1?100:ratio>=0.75?75:ratio>=0.5?50:25;
  return {score,detail:`Profile evidence: approximately ${candidate} year${candidate===1?"":"s"}; job requirement: ${required}+ years.`};
}

function scorePreferences(result,profileText){
  const lower=profileText.toLowerCase();
  const checks=[];
  if(result.location!=="Not detected"){
    const locations=result.location.split(",").map(v=>v.trim().toLowerCase()).filter(Boolean);
    const profileHasLocation=IRISH_LOCATIONS.some(location=>lower.includes(location.toLowerCase()));
    if(profileHasLocation) checks.push(locations.some(location=>lower.includes(location))?100:0);
  }
  if(result.arrangement!=="Not detected"){
    const hasPreference=/\bremote\b|\bhybrid\b|on[- ]site|onsite|office[- ]based|office based/.test(lower);
    if(hasPreference){
      const target=result.arrangement.toLowerCase();
      const matched=target==="remote"?/\bremote\b/.test(lower):target==="hybrid"?/\bhybrid\b/.test(lower):/on[- ]site|onsite|office[- ]based|office based/.test(lower);
      checks.push(matched?100:0);
    }
  }
  if(!checks.length) return {score:null,detail:"No location or work-arrangement preference was found in the profile, so this does not affect the score."};
  const score=Math.round(checks.reduce((a,b)=>a+b,0)/checks.length);
  return {score,detail:score===100?"The detected location/work arrangement aligns with profile preferences.":"One or more detected location/work-arrangement signals do not align with the profile text."};
}

function calculateMatchScore(result,profileText){
  if(!profileText.trim()) return null;
  const skills=itemMatchDetails(result.skills,profileText);
  const qualifications=itemMatchDetails(result.qualifications,profileText);
  const experience=scoreExperienceRequirement(result.experience,profileText);
  const ats=itemMatchDetails(result.keywords.slice(0,24),profileText);
  const preferences=scorePreferences(result,profileText);
  const components=[
    {key:"skills",label:"Skills & knowledge",weight:40,...skills,detail:`${skills.matchedCount}/${skills.total} detected job skills found in the profile.`},
    {key:"qualifications",label:"Qualifications",weight:20,...qualifications,detail:qualifications.total?`${qualifications.matchedCount}/${qualifications.total} detected qualifications found in the profile.`:"No explicit qualification was detected, so this category is excluded."},
    {key:"experience",label:"Experience",weight:20,...experience},
    {key:"ats",label:"ATS keyword alignment",weight:15,...ats,detail:ats.total?`${ats.matchedCount}/${ats.total} priority keywords found in the profile.`:"No ATS keywords were available to compare."},
    {key:"preferences",label:"Location / work model",weight:5,...preferences}
  ];
  const available=components.filter(component=>component.score!==null);
  const totalWeight=available.reduce((sum,component)=>sum+component.weight,0);
  const overall=totalWeight?Math.round(available.reduce((sum,component)=>sum+(component.score*component.weight),0)/totalWeight):0;
  const matched=unique([...skills.matched,...qualifications.matched,...ats.matched]);
  const gaps=unique([...skills.missing,...qualifications.missing,...ats.missing]).slice(0,18);
  const confidence=profileText.length>=900&&available.length>=4?"High":profileText.length>=350&&available.length>=3?"Medium":"Low";
  const label=overall>=80?"Strong match":overall>=65?"Good match":overall>=50?"Moderate match":"Limited evidence";
  return {overall,label,confidence,components,matched,gaps};
}

function ensureMatchScoreUI(){
  if(document.getElementById("matchScorePanel")) return;
  const results=document.getElementById("analyzerResults");
  const analysisGrid=results?.querySelector(".analysis-grid");
  if(!results||!analysisGrid) return;
  const style=document.createElement("style");
  style.id="matchScoreStyles";
  style.textContent=`.match-score-panel{margin:18px 0 0;padding:20px}.match-score-top{display:grid;grid-template-columns:180px 1fr;gap:22px;align-items:center}.match-score-ring{width:150px;height:150px;border-radius:50%;display:grid;place-items:center;margin:auto;background:conic-gradient(var(--accent) calc(var(--score)*1%),var(--surface2) 0);position:relative}.match-score-ring:after{content:'';position:absolute;inset:12px;border-radius:50%;background:var(--surface)}.match-score-number{position:relative;z-index:1;text-align:center}.match-score-number strong{display:block;font-size:34px}.match-score-number span{font-size:10px;color:var(--muted)}.match-score-copy h3{margin:4px 0 6px}.match-score-copy p{margin:0;color:var(--muted);font-size:12px}.match-confidence{display:inline-block;margin-top:10px;padding:5px 8px;border:1px solid var(--border);border-radius:999px;color:var(--muted);font-size:10px}.match-components{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:18px}.match-component{padding:12px;background:var(--surface2);border:1px solid var(--border);border-radius:10px}.match-component span{display:block;color:var(--muted);font-size:10px}.match-component strong{display:block;font-size:18px;margin:4px 0}.match-component small{display:block;color:var(--muted2);font-size:9px;line-height:1.35}.match-progress{height:5px;background:#08121a;border-radius:99px;margin-top:8px;overflow:hidden}.match-progress i{display:block;height:100%;background:var(--accent);width:var(--component-score)}.match-score-empty{color:var(--muted);text-align:center;padding:12px}.match-actions{display:flex;justify-content:flex-end;margin-top:14px}@media(max-width:1000px){.match-components{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.match-score-top{grid-template-columns:1fr}.match-components{grid-template-columns:1fr}.match-score-ring{width:130px;height:130px}}`;
  document.head.appendChild(style);
  const panel=document.createElement("section");
  panel.id="matchScorePanel";
  panel.className="panel match-score-panel";
  panel.innerHTML=`<div id="matchScoreContent" class="match-score-empty">Add your resume, skills or profile context above to calculate a transparent match score.</div><div class="match-actions"><button class="secondary-btn" id="recalculateMatchScore" type="button">Recalculate match</button></div>`;
  results.insertBefore(panel,analysisGrid);
  document.getElementById("recalculateMatchScore").addEventListener("click",()=>renderMatchScore(latestAnalysis,document.getElementById("candidateContextInput").value));
}

function renderMatchScore(result,profileText){
  ensureMatchScoreUI();
  const content=document.getElementById("matchScoreContent");
  if(!content||!result) return;
  const match=calculateMatchScore(result,profileText);
  latestMatchResult=match;
  content.innerHTML="";
  if(!match){ content.className="match-score-empty"; content.textContent="Add your resume, skills or profile context above to calculate a transparent match score."; return; }
  content.className="";
  const top=document.createElement("div"); top.className="match-score-top";
  const ring=document.createElement("div"); ring.className="match-score-ring"; ring.style.setProperty("--score",match.overall);
  const number=document.createElement("div"); number.className="match-score-number"; const strong=document.createElement("strong"); strong.textContent=`${match.overall}%`; const span=document.createElement("span"); span.textContent="OVERALL MATCH"; number.append(strong,span); ring.appendChild(number);
  const copy=document.createElement("div"); copy.className="match-score-copy"; copy.innerHTML=`<div class="eyebrow">TRANSPARENT MATCH SCORE</div><h3></h3><p></p><span class="match-confidence"></span>`; copy.querySelector("h3").textContent=match.label; copy.querySelector("p").textContent="Calculated only from evidence found in the job description and your saved profile. Categories with no usable requirement are excluded and the remaining weights are rebalanced."; copy.querySelector(".match-confidence").textContent=`Evidence confidence: ${match.confidence}`;
  top.append(ring,copy); content.appendChild(top);
  const grid=document.createElement("div"); grid.className="match-components";
  match.components.forEach(component=>{ const card=document.createElement("div"); card.className="match-component"; const scoreText=component.score===null?"N/A":`${component.score}%`; card.innerHTML=`<span></span><strong></strong><small></small><div class="match-progress"><i></i></div>`; card.querySelector("span").textContent=`${component.label} · ${component.weight}% weight`; card.querySelector("strong").textContent=scoreText; card.querySelector("small").textContent=component.detail; card.querySelector("i").style.setProperty("--component-score",component.score===null?"0%":`${component.score}%`); grid.appendChild(card); });
  content.appendChild(grid);
}

function renderChips(id,values,primary=false){ const el=document.getElementById(id); el.innerHTML=""; if(!values.length){ const s=document.createElement("span"); s.className="analysis-empty-text"; s.textContent="No clear matches detected."; el.appendChild(s); return;} values.forEach(v=>{const s=document.createElement("span");s.className=`analysis-chip${primary?" primary":""}`;s.textContent=v;el.appendChild(s);}); }
function renderList(id,values){ const el=document.getElementById(id); el.innerHTML=""; if(!values.length){const s=document.createElement("span");s.className="analysis-empty-text";s.textContent="No explicit requirement detected.";el.appendChild(s);return;} values.forEach(v=>{const row=document.createElement("div");row.className="analysis-list-item";row.textContent=v;el.appendChild(row);}); }

function renderAnalysis(result){
  latestAnalysis=result;
  document.getElementById("analyzerEmptyState").hidden=true;
  document.getElementById("analyzerResults").hidden=false;
  document.getElementById("analysisExperience").textContent=result.experience;
  document.getElementById("analysisLocation").textContent=result.location;
  document.getElementById("analysisArrangement").textContent=result.arrangement;
  document.getElementById("analysisSalary").textContent=result.salary;
  document.getElementById("skillsCountBadge").textContent=result.skills.length;
  document.getElementById("qualificationsCountBadge").textContent=result.qualifications.length;
  document.getElementById("requirementsCountBadge").textContent=result.requirements.length;
  document.getElementById("keywordsCountBadge").textContent=result.keywords.length;
  document.getElementById("matchedCountBadge").textContent=result.matched.length;
  document.getElementById("gapsCountBadge").textContent=result.gaps.length;
  renderChips("analysisSkills",result.skills,true); renderList("analysisQualifications",result.qualifications); renderList("analysisRequirements",result.requirements);
  renderChips("analysisKeywords",result.keywords); renderChips("analysisMatched",result.matched,true); renderChips("analysisGaps",result.gaps);
  renderMatchScore(result,document.getElementById("candidateContextInput").value);
}

function showAnalyzerPage(){ ["dashboardPage","jobsPage","placeholderPage"].forEach(id=>document.getElementById(id)?.classList.remove("active")); document.getElementById("analyzerPage")?.classList.add("active"); document.getElementById("pageTitle").textContent="Job Description Analyzer"; document.getElementById("sidebar")?.classList.remove("open"); }
function hideAnalyzerPage(){ document.getElementById("analyzerPage")?.classList.remove("active"); }
function clearAnalyzer(){ const input=document.getElementById("jobDescriptionInput"); input.value=""; document.getElementById("analyzerCharCount").textContent="0 characters"; document.getElementById("analyzerResults").hidden=true; document.getElementById("analyzerEmptyState").hidden=false; latestAnalysis=null; latestMatchResult=null; input.focus(); }
function runAnalyzer(){ const input=document.getElementById("jobDescriptionInput"); const text=input.value.trim(); if(text.length<80){input.focus();window.alert("Please paste a fuller job description before analysing it.");return;} const profile=document.getElementById("candidateContextInput").value; renderAnalysis(analyseJobDescription(text,profile)); }

function saveProfileContext(){ const value=document.getElementById("candidateContextInput").value.trim(); localStorage.setItem(PROFILE_CONTEXT_KEY,value); document.getElementById("profileContextStatus").textContent=value?"Saved":"Empty"; if(latestAnalysis) renderMatchScore(latestAnalysis,value); }
function clearProfileContext(){ if(!window.confirm("Clear the saved profile context from this browser?")) return; localStorage.removeItem(PROFILE_CONTEXT_KEY); document.getElementById("candidateContextInput").value=""; document.getElementById("candidateContextCount").textContent="0 characters"; document.getElementById("profileContextStatus").textContent="Empty"; latestMatchResult=null; if(latestAnalysis) renderMatchScore(latestAnalysis,""); }

function saveAnalysisToTracker(){
  if(!latestAnalysis||typeof openJobModal!=="function") return;
  openJobModal();
  document.getElementById("requiredSkills").value=latestAnalysis.skills.slice(0,20).join(", ");
  if(latestAnalysis.location!=="Not detected") document.getElementById("location").value=latestAnalysis.location;
  if(["Hybrid","Remote","On-site"].includes(latestAnalysis.arrangement)) document.getElementById("workArrangement").value=latestAnalysis.arrangement;
  if(latestAnalysis.salary!=="Not detected") document.getElementById("salary").value=latestAnalysis.salary;
  if(latestMatchResult) document.getElementById("matchScore").value=latestMatchResult.overall;
  const matchBreakdown=latestMatchResult?latestMatchResult.components.map(component=>`${component.label}: ${component.score===null?"N/A":`${component.score}%`}`).join(" | "):"Not calculated";
  const notes=["Job Analyzer results:",`Overall match: ${latestMatchResult?`${latestMatchResult.overall}% (${latestMatchResult.label})`:"Not calculated"}`,`Match breakdown: ${matchBreakdown}`,`Experience: ${latestAnalysis.experience}`,`Qualifications: ${latestAnalysis.qualifications.join(", ")||"None explicitly detected"}`,`Key requirements: ${latestAnalysis.requirements.slice(0,8).join(" | ")||"None explicitly detected"}`,`ATS keywords: ${latestAnalysis.keywords.join(", ")||"None detected"}`];
  document.getElementById("notes").value=notes.join("\n");
  document.getElementById("company").focus();
}

function setupAnalyzerNavigation(){
  document.querySelectorAll(".nav button").forEach(button=>button.addEventListener("click",()=>{ if(button.dataset.page==="analyzer"){ document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b===button)); showAnalyzerPage(); } else hideAnalyzerPage(); }));
}

function initAnalyzer(){
  const input=document.getElementById("jobDescriptionInput"); const profile=document.getElementById("candidateContextInput"); if(!input||!profile) return;
  const saved=localStorage.getItem(PROFILE_CONTEXT_KEY)||""; profile.value=saved; document.getElementById("candidateContextCount").textContent=`${saved.length} characters`; document.getElementById("profileContextStatus").textContent=saved?"Saved":"Empty";
  input.addEventListener("input",()=>document.getElementById("analyzerCharCount").textContent=`${input.value.length} characters`);
  profile.addEventListener("input",()=>document.getElementById("candidateContextCount").textContent=`${profile.value.length} characters`);
  document.getElementById("analyzeJobButton").addEventListener("click",runAnalyzer);
  document.getElementById("clearAnalyzer").addEventListener("click",clearAnalyzer);
  document.getElementById("saveCandidateContext").addEventListener("click",saveProfileContext);
  document.getElementById("clearCandidateContext").addEventListener("click",clearProfileContext);
  document.getElementById("saveAnalysisToTracker").addEventListener("click",saveAnalysisToTracker);
  setupAnalyzerNavigation();
}

document.addEventListener("DOMContentLoaded",initAnalyzer);
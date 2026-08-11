"use strict";

/* Stage 3.1 - profile-aware, role-agnostic technical Job Description Analyzer.
   Runs entirely in the browser. No resume or job-description text is transmitted. */

const PROFILE_CONTEXT_KEY = "irelandJobHuntOS_candidateContext";

const SKILL_CATALOG = [
  ["Networking", ["networking", "network infrastructure", "enterprise network"]],
  ["NOC", ["network operations center", "network operations centre", "noc"]],
  ["TCP/IP", ["tcp/ip", "tcp ip"]], ["DNS", ["dns"]], ["DHCP", ["dhcp"]],
  ["VLANs", ["vlan", "vlans"]], ["Routing", ["routing", "router"]], ["Switching", ["switching", "switches"]],
  ["OSPF", ["ospf"]], ["BGP", ["bgp"]], ["STP", ["spanning tree", "stp"]],
  ["Cisco", ["cisco"]], ["Juniper", ["juniper"]], ["Aruba", ["aruba networks", "aruba"]],
  ["Fortinet", ["fortinet", "fortigate"]], ["Palo Alto", ["palo alto"]], ["Check Point", ["check point", "checkpoint"]],
  ["Firewalls", ["firewall", "firewalls"]], ["VPN", ["vpn", "virtual private network"]],
  ["Wireshark", ["wireshark"]], ["Nmap", ["nmap"]],
  ["First-line Support", ["first-line support", "first line support", "1st line support", "level 1 support", "l1 support"]],
  ["Second-line Support", ["second-line support", "second line support", "2nd line support", "level 2 support", "l2 support"]],
  ["Technical Support", ["technical support", "support engineer", "support environments"]],
  ["Troubleshooting", ["troubleshooting", "troubleshoot", "diagnose and resolve", "fault finding"]],
  ["Incident Management", ["incident management", "manage incidents", "incident resolution", "incident records"]],
  ["SLA Management", ["service level agreement", "service level agreements", "sla", "slas"]],
  ["RMM", ["remote monitoring and management", "rmm"]],
  ["Patch Management", ["patch management", "patching"]],
  ["Preventative Maintenance", ["preventative maintenance", "preventive maintenance"]],
  ["Vendor TAC", ["technical assistance centre", "technical assistance center", "vendor tac", "tac"]],
  ["Monitoring", ["monitoring", "health checks", "health check"]],
  ["Technical Documentation", ["technical documentation", "documentation", "technical reports", "incident records"]],
  ["Customer Support", ["customer-focused", "customer focused", "customer requirements", "customer engagement", "customer support"]],
  ["Microsoft Office", ["microsoft office", "ms office", "office applications"]],
  ["ServiceNow", ["servicenow"]], ["Jira", ["jira"]], ["ITIL", ["itil"]],
  ["Active Directory", ["active directory", "ad ds"]], ["Entra ID", ["entra id", "azure active directory", "azure ad"]],
  ["Windows Server", ["windows server"]], ["Windows", ["windows 10", "windows 11", "windows desktop"]],
  ["Linux", ["linux", "ubuntu", "debian", "rhel", "red hat"]],
  ["Microsoft 365", ["microsoft 365", "office 365", "m365"]],
  ["Azure", ["microsoft azure", "azure"]], ["AWS", ["amazon web services", "aws"]], ["GCP", ["google cloud platform", "gcp"]],
  ["VMware", ["vmware", "vsphere"]], ["Hyper-V", ["hyper-v", "hyper v"]],
  ["PowerShell", ["powershell"]], ["Python", ["python"]], ["Bash", ["bash", "shell scripting"]],
  ["SQL", ["sql"]], ["Git", ["git", "github", "gitlab"]],
  ["Cybersecurity", ["cybersecurity", "cyber security", "information security"]],
  ["SOC", ["security operations centre", "security operations center", "soc analyst", "soc environment"]],
  ["SIEM", ["siem", "security information and event management"]], ["Microsoft Sentinel", ["microsoft sentinel", "azure sentinel"]],
  ["Splunk", ["splunk"]], ["Wazuh", ["wazuh"]], ["EDR", ["edr", "endpoint detection and response"]],
  ["Microsoft Defender", ["microsoft defender", "defender for endpoint", "mde"]],
  ["Incident Response", ["incident response", "incident handling"]], ["Threat Detection", ["threat detection", "detection engineering"]],
  ["Threat Hunting", ["threat hunting"]], ["Vulnerability Management", ["vulnerability management", "vulnerability assessment", "vulnerability scanning"]],
  ["Nessus", ["nessus"]], ["Qualys", ["qualys"]], ["Rapid7", ["rapid7", "insightvm"]],
  ["Penetration Testing", ["penetration testing", "pen testing", "pentesting"]], ["Burp Suite", ["burp suite", "burpsuite"]],
  ["OWASP", ["owasp"]], ["MITRE ATT&CK", ["mitre att&ck", "mitre attack"]], ["NIST", ["nist"]], ["ISO 27001", ["iso 27001", "iso27001"]],
  ["IAM", ["identity and access management", "iam"]], ["Cloud Security", ["cloud security"]],
  ["Docker", ["docker"]], ["Kubernetes", ["kubernetes", "k8s"]], ["Terraform", ["terraform"]], ["Ansible", ["ansible"]],
  ["CI/CD", ["ci/cd", "continuous integration", "continuous delivery"]],
  ["REST APIs", ["rest api", "restful api"]], ["JavaScript", ["javascript"]], ["TypeScript", ["typescript"]],
  ["Java", ["java"]], ["C#", ["c#", ".net"]]
];

const ATS_TERMS = [
  "troubleshooting", "problem solving", "analytical", "communication", "customer focused", "customer-facing",
  "incident management", "service level agreements", "sla", "technical support", "network support", "managed services",
  "monitoring", "patch management", "preventative maintenance", "documentation", "technical reports", "vendor support",
  "networking", "security", "infrastructure", "operations", "escalation", "root cause", "on-call", "shift", "stakeholder"
];

const IRISH_LOCATIONS = ["Dublin","Cork","Galway","Limerick","Waterford","Kilkenny","Sligo","Athlone","Dundalk","Drogheda","Letterkenny","Wexford","Kildare","Naas","Carlow","Mullingar","Shannon","Clare","Meath","Wicklow","Donegal","Ireland"];

let latestAnalysis = null;

const unique = values => [...new Set(values.filter(Boolean))];
const has = (text, phrase) => text.includes(phrase.toLowerCase());

function detectSkills(lowerText) {
  return SKILL_CATALOG.filter(([, aliases]) => aliases.some(alias => has(lowerText, alias))).map(([name]) => name);
}

function detectCertifications(text) {
  const found = [];
  const patterns = [
    ["JNCIA", /\bjncia\b/i], ["JNCIP", /\bjncip\b/i], ["Juniper certification", /juniper certification/i],
    ["CCNA", /\bccna\b/i], ["CCNP", /\bccnp\b/i], ["CompTIA Network+", /network\+/i], ["CompTIA Security+", /security\+/i],
    ["CISSP", /\bcissp\b/i], ["CISM", /\bcism\b/i], ["CEH", /\bceh\b/i],
    ["Microsoft certification", /microsoft certified|\baz-\d{3}\b|\bsc-\d{3}\b/i],
    ["AWS certification", /aws certified/i], ["ITIL", /\bitil\b/i]
  ];
  patterns.forEach(([label, regex]) => { if (regex.test(text)) found.push(label); });
  return unique(found);
}

function detectQualifications(text) {
  const lower = text.toLowerCase();
  const found = detectCertifications(text);
  const tests = [
    ["Bachelor's degree", /bachelor'?s degree|bsc\b|level 8 degree/i],
    ["Master's degree", /master'?s degree|msc\b|level 9/i],
    ["Engineering / technical degree", /degree in engineering|engineering or a related technical discipline|related technical discipline/i],
    ["Driving licence", /driving licen[cs]e|driver'?s licen[cs]e|full irish or european driving licen[cs]e|full clean licen[cs]e/i],
    ["Security clearance / vetting", /security clearance|garda vetting|background clearance/i],
    ["Right to work in Ireland", /right to work in ireland|eligible to work in ireland|authori[sz]ed to work in ireland|work permit/i]
  ];
  tests.forEach(([label, regex]) => { if (regex.test(lower)) found.push(label); });
  return unique(found);
}

function detectExperience(text) {
  const matches = [];
  const regexes = [
    /(\d+)\s*(?:-|–|to)\s*(\d+)\s*(?:years?|yrs?)(?:\s+of)?(?:\s+work)?\s+experience/gi,
    /(\d+)\+\s*(?:years?|yrs?)(?:\s+of)?(?:\s+work)?\s+experience/gi,
    /(?:at least|min(?:imum)?\.?\s+of?)\s*(\d+)\s*(?:years?|yrs?)(?:\s+of)?\s+experience/gi,
    /(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:relevant|professional|hands[- ]on|work)\s+experience/gi
  ];
  regexes.forEach(regex => {
    let match;
    while ((match = regex.exec(text)) !== null) {
      const min = Number(match[1]);
      const max = match[2] ? Number(match[2]) : null;
      if (min <= 20) matches.push({ min, max });
    }
  });
  if (matches.length) {
    matches.sort((a,b) => b.min - a.min);
    const r = matches[0];
    return r.max ? `${r.min}–${r.max} years` : `${r.min}+ years`;
  }
  const lower = text.toLowerCase();
  if (/graduate|entry[- ]level|junior role|recent graduate|early career/.test(lower)) return "Graduate / Entry level";
  if (/senior|lead engineer|principal/.test(lower)) return "Senior / Experienced";
  return "Not clearly stated";
}

function detectLocation(lowerText) {
  const found = IRISH_LOCATIONS.filter(location => lowerText.includes(location.toLowerCase()));
  const specific = found.filter(location => location !== "Ireland");
  return (specific.length ? specific : found).slice(0,3).join(", ") || "Not detected";
}

function detectArrangement(lowerText) {
  if (/on[- ]site\s*[–-]?\s*5 days|5 days per week|five days per week/.test(lowerText)) return "On-site";
  if (/\bhybrid\b|hybrid working|hybrid model/.test(lowerText)) return "Hybrid";
  if (/fully remote|\bremote\b|work from home/.test(lowerText) && !/on[- ]site|onsite/.test(lowerText)) return "Remote";
  if (/on[- ]site|onsite|office[- ]based|office based/.test(lowerText)) return "On-site";
  return "Not detected";
}

function detectSalary(text) {
  const euro = text.match(/(?:up to\s*)?€\s?\d{2,3}(?:[,.]\d{3})?(?:\s*(?:-|–|to)\s*€?\s?\d{2,3}(?:[,.]\d{3})?)?(?:\s*(?:per annum|p\.a\.|pa|annually|year))?/i);
  return euro ? euro[0].replace(/\s+/g," ").trim() : "Not detected";
}

function detectOperationalRequirements(lowerText) {
  const rules = [
    ["First-line support", /first[- ]line support|1st line support|level 1 support/],
    ["Second-line support", /second[- ]line support|2nd line support|level 2 support/],
    ["Own incidents through resolution", /incidents? .*successful resolution|manage incidents|incident resolution/],
    ["Meet service level agreements (SLAs)", /service level agreements?|\bslas?\b/],
    ["Escalate complex issues", /escalate complex|escalat(?:e|ion).*senior/],
    ["Daily health checks / monitoring", /daily health checks?|health checks?|monitoring/],
    ["Patch management", /patch management|patching/],
    ["Preventative maintenance", /preventative maintenance|preventive maintenance/],
    ["RMM tool management", /remote monitoring and management|\brmm\b/],
    ["Technical reporting / documentation", /technical reports?|incident records?|documentation/],
    ["Vendor / TAC liaison", /technical assistance cent(?:re|er)|vendor support|\btac\b/],
    ["Customer communication", /communicat(?:e|ing) with customers|customer[- ]focused|customer requirements/],
    ["Strong troubleshooting", /strong troubleshooting|troubleshoot|diagnose and resolve/],
    ["Analytical problem solving", /analytical problem[- ]solving|analytical skills|problem[- ]solving skills/],
    ["Written and verbal communication", /written and verbal communication|communication skills/],
    ["On-call / shift availability", /on[- ]call|24\/7|24x7|shift work|weekend rota/],
    ["Travel requirement", /travel required|willingness to travel|regular travel/]
  ];
  return rules.filter(([, regex]) => regex.test(lowerText)).map(([label]) => label);
}

function detectKeywords(lowerText, skills, requirements, qualifications) {
  const hits = ATS_TERMS.filter(term => lowerText.includes(term));
  return unique([...skills, ...requirements, ...qualifications, ...hits.map(term => term.replace(/\b\w/g, c => c.toUpperCase()))]).slice(0,36);
}

function compareWithProfile(jobSkills, jobQualifications, jobRequirements, profileText) {
  if (!profileText.trim()) return { matched: [], gaps: [] };
  const lowerProfile = profileText.toLowerCase();
  const profileSkills = detectSkills(lowerProfile);
  const profileQualifications = detectQualifications(profileText);
  const matchedSkills = jobSkills.filter(skill => profileSkills.includes(skill) || lowerProfile.includes(skill.toLowerCase()));
  const matchedQualifications = jobQualifications.filter(q => profileQualifications.includes(q) || lowerProfile.includes(q.toLowerCase()));
  const matchedRequirements = jobRequirements.filter(req => {
    const core = req.toLowerCase().replace(/[^a-z0-9 +/#.-]/g," ");
    return core.split(/\s+/).filter(w => w.length > 4).some(word => lowerProfile.includes(word));
  });
  const matched = unique([...matchedSkills, ...matchedQualifications, ...matchedRequirements]);
  const gaps = unique([...jobSkills, ...jobQualifications].filter(item => !matched.includes(item)));
  return { matched, gaps };
}

function analyseJobDescription(text, profileText = "") {
  const clean = text.replace(/\r/g, "").trim();
  const lower = clean.toLowerCase();
  const skills = detectSkills(lower);
  const qualifications = detectQualifications(clean);
  const requirements = detectOperationalRequirements(lower);
  const experience = detectExperience(clean);
  const location = detectLocation(lower);
  const arrangement = detectArrangement(lower);
  const salary = detectSalary(clean);
  const keywords = detectKeywords(lower, skills, requirements, qualifications);
  const profileComparison = compareWithProfile(skills, qualifications, requirements, profileText);
  return { skills, qualifications, requirements, experience, location, arrangement, salary, keywords, ...profileComparison };
}

function renderChips(containerId, values, primary=false) {
  const container = document.getElementById(containerId); container.innerHTML = "";
  if (!values.length) { const e=document.createElement("span"); e.className="analysis-empty-text"; e.textContent="No clear matches detected."; container.appendChild(e); return; }
  values.forEach(value => { const chip=document.createElement("span"); chip.className=`analysis-chip${primary?" primary":""}`; chip.textContent=value; container.appendChild(chip); });
}

function renderList(containerId, values) {
  const container = document.getElementById(containerId); container.innerHTML = "";
  if (!values.length) { const e=document.createElement("span"); e.className="analysis-empty-text"; e.textContent="No explicit requirement detected."; container.appendChild(e); return; }
  values.forEach(value => { const row=document.createElement("div"); row.className="analysis-list-item"; row.textContent=value; container.appendChild(row); });
}

function renderAnalysis(result) {
  latestAnalysis = result;
  document.getElementById("analyzerEmptyState").hidden = true;
  document.getElementById("analyzerResults").hidden = false;
  document.getElementById("analysisExperience").textContent = result.experience;
  document.getElementById("analysisLocation").textContent = result.location;
  document.getElementById("analysisArrangement").textContent = result.arrangement;
  document.getElementById("analysisSalary").textContent = result.salary;
  document.getElementById("skillsCountBadge").textContent = result.skills.length;
  document.getElementById("qualificationsCountBadge").textContent = result.qualifications.length;
  document.getElementById("requirementsCountBadge").textContent = result.requirements.length;
  document.getElementById("keywordsCountBadge").textContent = result.keywords.length;
  document.getElementById("matchedCountBadge").textContent = result.matched.length;
  document.getElementById("gapsCountBadge").textContent = result.gaps.length;
  renderChips("analysisSkills", result.skills, true);
  renderList("analysisQualifications", result.qualifications);
  renderList("analysisRequirements", result.requirements);
  renderChips("analysisKeywords", result.keywords);
  renderChips("analysisMatched", result.matched, true);
  renderChips("analysisGaps", result.gaps);
}

function showAnalyzerPage() {
  ["dashboardPage","jobsPage","placeholderPage"].forEach(id => document.getElementById(id)?.classList.remove("active"));
  document.getElementById("analyzerPage")?.classList.add("active");
  document.getElementById("pageTitle").textContent = "Job Description Analyzer";
  document.getElementById("sidebar")?.classList.remove("open");
}
function hideAnalyzerPage(){ document.getElementById("analyzerPage")?.classList.remove("active"); }

function updateProfileCount(){ const el=document.getElementById("candidateContextInput"); document.getElementById("candidateContextCount").textContent=`${el.value.length} characters`; }
function saveProfileContext(){ localStorage.setItem(PROFILE_CONTEXT_KEY, document.getElementById("candidateContextInput").value.trim()); document.getElementById("profileContextStatus").textContent="Saved"; updateProfileCount(); }
function clearProfileContext(){ if(!confirm("Clear the saved resume / skills context from this browser?")) return; localStorage.removeItem(PROFILE_CONTEXT_KEY); document.getElementById("candidateContextInput").value=""; document.getElementById("profileContextStatus").textContent="Local"; updateProfileCount(); }

function clearAnalyzer(){ document.getElementById("jobDescriptionInput").value=""; document.getElementById("analyzerCharCount").textContent="0 characters"; document.getElementById("analyzerResults").hidden=true; document.getElementById("analyzerEmptyState").hidden=false; latestAnalysis=null; document.getElementById("jobDescriptionInput").focus(); }

function runAnalyzer(){
  const input=document.getElementById("jobDescriptionInput"); const text=input.value.trim();
  if(text.length<80){ input.focus(); alert("Please paste a fuller job description before analysing it."); return; }
  const profile=document.getElementById("candidateContextInput").value;
  renderAnalysis(analyseJobDescription(text, profile));
}

function saveAnalysisToTracker(){
  if(!latestAnalysis || typeof openJobModal!=="function") return;
  openJobModal();
  document.getElementById("requiredSkills").value=latestAnalysis.skills.join(", ");
  if(latestAnalysis.location!=="Not detected") document.getElementById("location").value=latestAnalysis.location;
  if(["Hybrid","Remote","On-site"].includes(latestAnalysis.arrangement)) document.getElementById("workArrangement").value=latestAnalysis.arrangement;
  if(latestAnalysis.salary!=="Not detected") document.getElementById("salary").value=latestAnalysis.salary;
  const notes=[
    "Job Analyzer results:",
    `Experience: ${latestAnalysis.experience}`,
    `Qualifications: ${latestAnalysis.qualifications.join(", ") || "None explicitly detected"}`,
    `Operational requirements: ${latestAnalysis.requirements.join(", ") || "None explicitly detected"}`,
    `ATS keywords: ${latestAnalysis.keywords.join(", ") || "None detected"}`,
    `Profile matches: ${latestAnalysis.matched.join(", ") || "No profile context / no matches detected"}`,
    `Potential gaps to review: ${latestAnalysis.gaps.join(", ") || "None detected"}`
  ];
  document.getElementById("notes").value=notes.join("\n");
  document.getElementById("company").focus();
}

function setupAnalyzerNavigation(){
  document.querySelectorAll(".nav button").forEach(button => {
    button.addEventListener("click", () => {
      if(button.dataset.page==="analyzer") showAnalyzerPage(); else hideAnalyzerPage();
    });
  });
}

function initAnalyzer(){
  const jobInput=document.getElementById("jobDescriptionInput"); if(!jobInput) return;
  const profileInput=document.getElementById("candidateContextInput");
  profileInput.value=localStorage.getItem(PROFILE_CONTEXT_KEY)||""; updateProfileCount();
  if(profileInput.value) document.getElementById("profileContextStatus").textContent="Saved";
  jobInput.addEventListener("input",()=>document.getElementById("analyzerCharCount").textContent=`${jobInput.value.length} characters`);
  profileInput.addEventListener("input",()=>{ document.getElementById("profileContextStatus").textContent="Unsaved"; updateProfileCount(); });
  document.getElementById("analyzeJobButton").addEventListener("click",runAnalyzer);
  document.getElementById("clearAnalyzer").addEventListener("click",clearAnalyzer);
  document.getElementById("saveAnalysisToTracker").addEventListener("click",saveAnalysisToTracker);
  document.getElementById("saveCandidateContext").addEventListener("click",saveProfileContext);
  document.getElementById("clearCandidateContext").addEventListener("click",clearProfileContext);
  setupAnalyzerNavigation();
}

document.addEventListener("DOMContentLoaded", initAnalyzer);

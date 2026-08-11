"use strict";

/* Stage 3 - rule-based Job Description Analyzer
   Runs entirely in the browser. No job-description text is transmitted. */

const ANALYZER_SKILLS = [
  ["Microsoft Sentinel", ["microsoft sentinel", "azure sentinel"]],
  ["Splunk", ["splunk"]],
  ["Wazuh", ["wazuh"]],
  ["SIEM", ["siem", "security information and event management"]],
  ["SOC", ["security operations centre", "security operations center", "soc analyst", "soc environment"]],
  ["Incident Response", ["incident response", "incident handling", "incident management"]],
  ["Threat Detection", ["threat detection", "detection engineering"]],
  ["Threat Hunting", ["threat hunting", "threat hunter"]],
  ["EDR", ["edr", "endpoint detection and response"]],
  ["Microsoft Defender", ["microsoft defender", "defender for endpoint", "mde"]],
  ["Sysmon", ["sysmon"]],
  ["Active Directory", ["active directory", "active directory domain services", "ad ds"]],
  ["Entra ID", ["entra id", "azure active directory", "azure ad"]],
  ["IAM", ["identity and access management", "iam"]],
  ["Azure", ["microsoft azure", "azure"]],
  ["AWS", ["amazon web services", "aws"]],
  ["GCP", ["google cloud platform", "gcp"]],
  ["Cloud Security", ["cloud security"]],
  ["Linux", ["linux", "ubuntu", "debian", "red hat", "rhel"]],
  ["Windows", ["windows server", "windows 10", "windows 11", "windows security"]],
  ["Networking", ["networking", "network fundamentals", "network security"]],
  ["TCP/IP", ["tcp/ip", "tcp ip"]],
  ["DNS", ["dns", "domain name system"]],
  ["DHCP", ["dhcp"]],
  ["VLANs", ["vlan", "vlans"]],
  ["Routing", ["routing", "routers"]],
  ["OSPF", ["ospf"]],
  ["BGP", ["bgp"]],
  ["Firewalls", ["firewall", "firewalls", "palo alto", "fortigate", "checkpoint"]],
  ["VPN", ["vpn", "virtual private network"]],
  ["Cisco", ["cisco"]],
  ["Wireshark", ["wireshark"]],
  ["Nmap", ["nmap"]],
  ["Burp Suite", ["burp suite", "burpsuite"]],
  ["Vulnerability Management", ["vulnerability management", "vulnerability assessment", "vulnerability scanning"]],
  ["Nessus", ["nessus"]],
  ["Qualys", ["qualys"]],
  ["Rapid7", ["rapid7", "insightvm"]],
  ["Penetration Testing", ["penetration testing", "pen testing", "pentesting"]],
  ["OWASP", ["owasp"]],
  ["Python", ["python"]],
  ["PowerShell", ["powershell"]],
  ["Bash", ["bash", "shell scripting"]],
  ["SQL", ["sql"]],
  ["Git", ["git", "github", "gitlab"]],
  ["ServiceNow", ["servicenow"]],
  ["Jira", ["jira"]],
  ["MITRE ATT&CK", ["mitre att&ck", "mitre attack"]],
  ["NIST", ["nist"]],
  ["ISO 27001", ["iso 27001", "iso27001"]],
  ["PCI DSS", ["pci dss", "pci-dss"]],
  ["GDPR", ["gdpr", "general data protection regulation"]],
  ["Malware Analysis", ["malware analysis", "malware investigation"]],
  ["Digital Forensics", ["digital forensics", "forensic analysis"]],
  ["Email Security", ["email security", "phishing analysis"]],
  ["DLP", ["data loss prevention", "dlp"]],
  ["Zero Trust", ["zero trust"]]
];

const ANALYZER_KEYWORDS = [
  "cybersecurity", "information security", "security operations", "monitoring", "alert triage",
  "incident", "threat", "vulnerability", "risk", "compliance", "log analysis", "security alerts",
  "endpoint security", "network security", "identity", "authentication", "access control", "phishing",
  "malware", "forensics", "cloud", "automation", "scripting", "troubleshooting", "ticketing",
  "documentation", "stakeholder", "communication", "problem solving", "analytical", "on-call"
];

const IRISH_LOCATIONS = [
  "Dublin", "Cork", "Galway", "Limerick", "Waterford", "Kilkenny", "Sligo", "Athlone",
  "Dundalk", "Drogheda", "Letterkenny", "Wexford", "Kildare", "Naas", "Carlow", "Mullingar",
  "Shannon", "Clare", "Meath", "Wicklow", "Donegal", "Ireland"
];

let latestAnalysis = null;

function analyzerContains(text, phrase) {
  return text.includes(phrase.toLowerCase());
}

function unique(values) {
  return [...new Set(values)];
}

function detectSkills(lowerText) {
  return ANALYZER_SKILLS
    .filter(([, aliases]) => aliases.some(alias => analyzerContains(lowerText, alias)))
    .map(([name]) => name);
}

function detectQualifications(lowerText) {
  const found = [];
  const tests = [
    ["Bachelor's degree", /bachelor'?s degree|bsc\b|level 8 degree/],
    ["Master's degree", /master'?s degree|msc\b|postgraduate degree|level 9/],
    ["Relevant degree", /degree in (cyber|computer|information|it|engineering)|relevant degree|third[- ]level qualification/],
    ["Security certification", /security\+|comptia security|cissp|cism|ceh|giac|gsec|sscp/],
    ["Networking certification", /ccna|ccnp|network\+|comptia network/],
    ["Microsoft certification", /microsoft certified|sc-200|az-500|az-900|sc-900/],
    ["Cloud certification", /aws certified|azure certification|google cloud certification|cloud certification/],
    ["Driving licence", /driving licen[cs]e|driver'?s licen[cs]e|full clean licen[cs]e/],
    ["Security clearance", /security clearance|garda vetting|background clearance|government clearance/],
    ["Right to work in Ireland", /right to work in ireland|eligible to work in ireland|authori[sz]ed to work in ireland|work permit/]
  ];
  tests.forEach(([label, regex]) => { if (regex.test(lowerText)) found.push(label); });
  return unique(found);
}

function detectExperience(text, lowerText) {
  if (/graduate|new graduate|recent graduate|entry[- ]level|junior role|early career|no experience required/.test(lowerText)) {
    return "Graduate / Entry level";
  }

  const patterns = [
    /(?:minimum of |at least |minimum |of )?(\d+)\s*(?:-|–|to)\s*(\d+)\s*(?:years?|yrs?)/gi,
    /(?:minimum of |at least |minimum )?(\d+)\+?\s*(?:years?|yrs?)\s+(?:of )?(?:relevant |professional |hands[- ]on )?experience/gi,
    /(?:experience of |with )(\d+)\+?\s*(?:years?|yrs?)/gi
  ];

  const matches = [];
  patterns.forEach(regex => {
    let match;
    while ((match = regex.exec(text)) !== null) {
      const min = Number(match[1]);
      const max = match[2] ? Number(match[2]) : null;
      if (min <= 20) matches.push({ min, max });
    }
  });

  if (matches.length) {
    matches.sort((a, b) => a.min - b.min);
    const requirement = matches[0];
    return requirement.max ? `${requirement.min}–${requirement.max} years` : `${requirement.min}+ years`;
  }

  if (/senior|lead |principal|managerial experience/.test(lowerText)) return "Senior / Experienced";
  return "Not clearly stated";
}

function detectLocation(lowerText) {
  const found = IRISH_LOCATIONS.filter(location => lowerText.includes(location.toLowerCase()));
  if (!found.length) return "Not detected";
  const specific = found.filter(location => location !== "Ireland");
  return (specific.length ? specific : found).slice(0, 3).join(", ");
}

function detectArrangement(lowerText) {
  const hybrid = /\bhybrid\b|hybrid working|hybrid model/.test(lowerText);
  const remote = /\bremote\b|remote working|work from home|fully remote/.test(lowerText);
  const onsite = /on[- ]site|onsite|office based|office-based/.test(lowerText);
  if (hybrid) return "Hybrid";
  if (remote && onsite) return "Remote / On-site mix";
  if (remote) return "Remote";
  if (onsite) return "On-site";
  return "Not detected";
}

function detectKeywords(lowerText, skills) {
  const keywordHits = ANALYZER_KEYWORDS.filter(keyword => lowerText.includes(keyword));
  const skillKeywords = skills.slice(0, 12);
  return unique([...skillKeywords, ...keywordHits.map(k => k.replace(/\b\w/g, c => c.toUpperCase()))]).slice(0, 24);
}

function detectRequirements(lowerText, experience, location, arrangement) {
  const requirements = [];
  if (experience !== "Not clearly stated") requirements.push(`Experience: ${experience}`);
  if (location !== "Not detected") requirements.push(`Location: ${location}`);
  if (arrangement !== "Not detected") requirements.push(`Work arrangement: ${arrangement}`);
  if (/excellent communication|strong communication|communication skills/.test(lowerText)) requirements.push("Communication skills");
  if (/analytical skills|strong analytical|problem[- ]solving|problem solving/.test(lowerText)) requirements.push("Analytical / problem-solving skills");
  if (/shift|24\/7|24x7|on-call|on call|weekend/.test(lowerText)) requirements.push("Shift / on-call availability mentioned");
  if (/travel required|willingness to travel|must travel/.test(lowerText)) requirements.push("Travel may be required");
  return requirements;
}

function analyseJobDescription(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  const lower = clean.toLowerCase();
  const skills = detectSkills(lower);
  const qualifications = detectQualifications(lower);
  const experience = detectExperience(clean, lower);
  const location = detectLocation(lower);
  const arrangement = detectArrangement(lower);
  const keywords = detectKeywords(lower, skills);
  const requirements = detectRequirements(lower, experience, location, arrangement);
  return { skills, qualifications, experience, location, arrangement, keywords, requirements };
}

function renderAnalyzerChips(containerId, values, primary = false) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  if (!values.length) {
    const empty = document.createElement("span");
    empty.className = "analysis-empty-text";
    empty.textContent = "No clear matches detected.";
    container.appendChild(empty);
    return;
  }
  values.forEach(value => {
    const chip = document.createElement("span");
    chip.className = `analysis-chip${primary ? " primary" : ""}`;
    chip.textContent = value;
    container.appendChild(chip);
  });
}

function renderAnalyzerList(containerId, values) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  if (!values.length) {
    const empty = document.createElement("span");
    empty.className = "analysis-empty-text";
    empty.textContent = "No explicit requirement detected.";
    container.appendChild(empty);
    return;
  }
  values.forEach(value => {
    const row = document.createElement("div");
    row.className = "analysis-list-item";
    row.textContent = value;
    container.appendChild(row);
  });
}

function renderAnalysis(result) {
  latestAnalysis = result;
  document.getElementById("analyzerEmptyState").hidden = true;
  document.getElementById("analyzerResults").hidden = false;
  document.getElementById("analysisExperience").textContent = result.experience;
  document.getElementById("analysisLocation").textContent = result.location;
  document.getElementById("analysisArrangement").textContent = result.arrangement;
  document.getElementById("analysisSkillCount").textContent = String(result.skills.length);
  document.getElementById("skillsCountBadge").textContent = String(result.skills.length);
  document.getElementById("qualificationsCountBadge").textContent = String(result.qualifications.length);
  document.getElementById("keywordsCountBadge").textContent = String(result.keywords.length);
  renderAnalyzerChips("analysisSkills", result.skills, true);
  renderAnalyzerChips("analysisKeywords", result.keywords);
  renderAnalyzerList("analysisQualifications", result.qualifications);
  renderAnalyzerList("analysisRequirements", result.requirements);
}

function showAnalyzerPage() {
  ["dashboardPage", "jobsPage", "placeholderPage"].forEach(id => document.getElementById(id)?.classList.remove("active"));
  document.getElementById("analyzerPage")?.classList.add("active");
  document.getElementById("pageTitle").textContent = "Job Description Analyzer";
  document.getElementById("sidebar")?.classList.remove("open");
}

function hideAnalyzerPage() {
  document.getElementById("analyzerPage")?.classList.remove("active");
}

function clearAnalyzer() {
  document.getElementById("jobDescriptionInput").value = "";
  document.getElementById("analyzerCharCount").textContent = "0 characters";
  document.getElementById("analyzerResults").hidden = true;
  document.getElementById("analyzerEmptyState").hidden = false;
  latestAnalysis = null;
  document.getElementById("jobDescriptionInput").focus();
}

function runAnalyzer() {
  const input = document.getElementById("jobDescriptionInput");
  const text = input.value.trim();
  if (text.length < 80) {
    input.focus();
    window.alert("Please paste a fuller job description before analysing it.");
    return;
  }
  renderAnalysis(analyseJobDescription(text));
}

function saveAnalysisToTracker() {
  if (!latestAnalysis) return;
  if (typeof openJobModal !== "function") {
    window.alert("The Job Tracker is not available. Refresh the page and try again.");
    return;
  }

  openJobModal();
  document.getElementById("requiredSkills").value = latestAnalysis.skills.join(", ");
  if (latestAnalysis.location !== "Not detected") document.getElementById("location").value = latestAnalysis.location;
  if (["Hybrid", "Remote", "On-site"].includes(latestAnalysis.arrangement)) {
    document.getElementById("workArrangement").value = latestAnalysis.arrangement;
  }

  const notes = [
    "Job Analyzer results:",
    `Experience: ${latestAnalysis.experience}`,
    `Qualifications: ${latestAnalysis.qualifications.length ? latestAnalysis.qualifications.join(", ") : "None explicitly detected"}`,
    `ATS keywords: ${latestAnalysis.keywords.join(", ") || "None detected"}`
  ];
  document.getElementById("notes").value = notes.join("\n");
  document.getElementById("company").focus();
}

function setupAnalyzerNavigation() {
  document.querySelectorAll(".nav button").forEach(button => {
    button.addEventListener("click", () => {
      if (button.dataset.page === "analyzer") showAnalyzerPage();
      else hideAnalyzerPage();
    });
  });

  document.getElementById("quickAddJob")?.addEventListener("click", hideAnalyzerPage);
  document.getElementById("returnDashboard")?.addEventListener("click", hideAnalyzerPage);
}

function setupAnalyzer() {
  const input = document.getElementById("jobDescriptionInput");
  if (!input) return;

  setupAnalyzerNavigation();
  input.addEventListener("input", () => {
    document.getElementById("analyzerCharCount").textContent = `${input.value.length.toLocaleString("en-IE")} characters`;
  });
  document.getElementById("analyzeJobButton").addEventListener("click", runAnalyzer);
  document.getElementById("clearAnalyzer").addEventListener("click", clearAnalyzer);
  document.getElementById("saveAnalysisToTracker").addEventListener("click", saveAnalysisToTracker);
}

document.addEventListener("DOMContentLoaded", setupAnalyzer);

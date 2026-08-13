"use strict";

/* Stage 4D.3 - precise ATS term extraction.
   Uses boundary-aware matching and keeps ATS alignment focused on technical/domain evidence. */
(function stage4d3PreciseAtsExtraction(){
  const SOFT=new Set(["Communication","Problem Solving","Attention to Detail","Teamwork","Leadership","Time Management","Customer Service","Stakeholder Management","Negotiation"]);
  const CATALOG=[
    ["Excel",["excel","microsoft excel"]],["TCP/IP",["tcp/ip","tcp ip"]],["DNS",["dns"]],["DHCP",["dhcp"]],["VLANs",["vlan","vlans"]],["Routing",["routing"]],["Switching",["switching"]],["VPN",["vpn","vpns"]],["Firewall",["firewall","firewalls"]],["SLA Management",["sla","slas","service level agreement","service level agreements"]],
    ["Cybersecurity",["cybersecurity","cyber security","information security"]],["SOC",["soc","security operations center","security operations centre"]],["SIEM",["siem","security information and event management"]],["Incident Response",["incident response","incident responder","incident responders"]],["MDR",["mdr","managed detection and response","managed detection & response"]],["Phishing",["phishing"]],
    ["Attack Lifecycle",["attack lifecycle"]],["Kill Chain",["kill chain"]],["Attack Vectors",["attack vector","attack vectors"]],["Threat Tactics",["threat tactic","threat tactics"]],["Attacker Techniques",["attacker technique","attacker techniques"]],["Windows",["windows"]],["macOS",["macos","mac os"]],["Linux",["linux"]],["Command Line",["command line","command-line"]],["O365",["o365","office 365","microsoft 365"]],["Okta",["okta"]],
    ["AWS",["aws","amazon web services"]],["GCP",["gcp","google cloud platform"]],["Azure",["azure","microsoft azure"]],["Wireshark",["wireshark"]],["Cisco",["cisco"]],["Juniper",["juniper"]],["Active Directory",["active directory"]],["Microsoft Sentinel",["microsoft sentinel","azure sentinel"]],["Splunk",["splunk"]],["Wazuh",["wazuh"]],["Python",["python"]],["SQL",["sql"]],["Docker",["docker"]],["Kubernetes",["kubernetes","k8s"]],["REST APIs",["rest api","restful api"]],["Cloud Infrastructure",["cloud infrastructure"]],["Cloud Applications",["cloud applications"]]
  ];
  const BOILER=/push the bounds|real passion|meaningfully impact|client comes first|comes first mindset|ask for help|change your tone|slacking a team member|competing priorities|spot the details|what you should bring|what we offer|our culture|our vision|our mission|compelling story/i;

  function escapeRegex(value){return String(value).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");}
  function hasAlias(text,alias){
    const raw=String(alias).trim();
    const body=escapeRegex(raw).replace(/\\ /g,"\\s+");
    const left=/^[a-z0-9]/i.test(raw)?"(?:^|[^a-z0-9])":"";
    const right=/[a-z0-9]$/i.test(raw)?"(?=$|[^a-z0-9])":"";
    return new RegExp(left+body+right,"i").test(String(text||""));
  }
  function unique(values){return [...new Set(values.filter(Boolean))];}
  function preciseTerms(text){return CATALOG.filter(([,aliases])=>aliases.some(alias=>hasAlias(text,alias))).map(([name])=>name);}

  const originalDetect=window.detectSkills;
  window.detectSkills=function stage4d3DetectSkills(text){
    const source=String(text||"");
    const precise=preciseTerms(source);
    const original=typeof originalDetect==="function"?originalDetect(source):[];
    const safe=(original||[]).filter(name=>{
      if(SOFT.has(name)) return true;
      const entry=CATALOG.find(([label])=>label===name);
      return entry?entry[1].some(alias=>hasAlias(source,alias)):true;
    });
    return unique([...precise,...safe]);
  };

  window.extractATSKeywords=function stage4d3ExtractATSKeywords(text,knownSkills){
    const technical=preciseTerms(text);
    const known=(knownSkills||[]).filter(v=>!SOFT.has(v)&&!BOILER.test(String(v)));
    return unique([...technical,...known]).slice(0,28);
  };

  const originalAnalyse=window.analyseJobDescription;
  if(typeof originalAnalyse==="function"){
    window.analyseJobDescription=function stage4d3Analyse(text,profileText=""){
      const result=originalAnalyse(text,profileText);
      result.skills=window.detectSkills(text);
      result.softSkills=(result.skills||[]).filter(v=>SOFT.has(v));
      result.skills=(result.skills||[]).filter(v=>!SOFT.has(v));
      result.keywords=window.extractATSKeywords(text,result.skills);
      if(result.experience==="Not clearly stated") result.experience="No explicit experience requirement detected";
      return result;
    };
  }
})();

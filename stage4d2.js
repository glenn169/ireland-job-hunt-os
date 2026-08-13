"use strict";

/* Stage 4D.2 - ATS keyword quality filter.
   Cleans analyzer ATS terms by keeping concise technical/job-specific concepts
   and excluding soft-skill or employer-marketing prose from ATS alignment. */
(function stage4d2AtsKeywordQualityFilter(){
  const SOFT=new Set(["Communication","Problem Solving","Attention to Detail","Teamwork","Leadership","Time Management","Customer Service","Stakeholder Management","Negotiation"]);
  const BOILER=/push the bounds|real passion|meaningfully impact|client comes first|comes first mindset|ask for help|change your tone|slacking a team member|high standard|competing priorities|spot the details|what you should bring|what we offer|our culture|our vision|our mission/i;
  const TECH=/security|cyber|network|noc|soc|siem|splunk|sentinel|wazuh|cisco|juniper|tcp\/ip|dns|dhcp|vlan|routing|switching|vpn|firewall|linux|windows|active directory|azure|aws|incident|monitoring|troubleshooting|technical support|sla|risk|vulnerability|penetration|mitre|owasp|python|sql|git|docker|kubernetes|api|cloud|identity|iam/i;

  function clean(value){return String(value||"").replace(/\s+/g," ").replace(/^[\s•*-]+/,"").trim();}
  function unique(values){return [...new Set(values.filter(Boolean))];}
  function concise(value){const v=clean(value);return v.length>=2&&v.length<=60&&v.split(/\s+/).length<=7&&!/[.!?]$/.test(v);}

  const originalExtract=window.extractATSKeywords;
  window.extractATSKeywords=function stage4d2Extract(text,knownSkills,genericSkills){
    const known=(knownSkills||[]).filter(v=>!SOFT.has(v));
    const generic=(genericSkills||[]).map(clean).filter(v=>concise(v)&&!BOILER.test(v)&&TECH.test(v));
    const fromText=[];
    const source=String(text||"");
    const catalogue=(window.UNIVERSAL_SKILLS||[]);
    catalogue.forEach(entry=>{
      const name=entry?.[0], aliases=entry?.[1]||[];
      if(!name||SOFT.has(name)) return;
      if(aliases.some(alias=>source.toLowerCase().includes(String(alias).toLowerCase()))&&TECH.test(name)) fromText.push(name);
    });
    const fallback=typeof originalExtract==="function"?originalExtract(text,knownSkills,genericSkills):[];
    const safeFallback=(fallback||[]).map(clean).filter(v=>concise(v)&&!BOILER.test(v)&&TECH.test(v)&&!SOFT.has(v));
    return unique([...known,...generic,...fromText,...safeFallback]).slice(0,24);
  };

  const originalAnalyse=window.analyseJobDescription;
  if(typeof originalAnalyse==="function"){
    window.analyseJobDescription=function stage4d2Analyse(text,profileText=""){
      const result=originalAnalyse(text,profileText);
      result.keywords=window.extractATSKeywords(text,result.skills||[],[]);
      result.experience=result.experience==="Not clearly stated"?"No explicit experience requirement detected":result.experience;
      result.softSkills=(result.skills||[]).filter(v=>SOFT.has(v));
      result.skills=(result.skills||[]).filter(v=>!SOFT.has(v));
      return result;
    };
  }
})();

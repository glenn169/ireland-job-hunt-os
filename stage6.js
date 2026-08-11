"use strict";

/* Feature loader: Stage 6 core + Stage 7 CV Tailoring + Stage 7.1 Smart Job Entry + Stage 7.2 CV Generator + Stage 7.3 Preserve-first tailoring + Stage 7.4 Supabase cloud CV storage. */
(function loadJobHuntFeatures(){
  const scripts=["stage6-core.js?v=18","stage7.js?v=18","smartjob.js?v=18","stage7cv.js?v=18","stage7preserve.js?v=18","stage74bootstrap.js?v=18","stage75docx.js?v=18"];
  scripts.forEach(src=>{
    if([...document.scripts].some(script=>script.src.includes(src.split("?")[0]))) return;
    const script=document.createElement("script");
    script.src=src;
    script.defer=true;
    document.head.appendChild(script);
  });
})();

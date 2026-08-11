"use strict";

/* Feature loader: Stage 6 core + Stage 7 CV Tailoring + Stage 7.1 Smart Job Entry. */
(function loadJobHuntFeatures(){
  const scripts=["stage6-core.js?v=10","stage7.js?v=10","smartjob.js?v=10"];
  scripts.forEach(src=>{
    if([...document.scripts].some(script=>script.src.includes(src.split("?")[0]))) return;
    const script=document.createElement("script");
    script.src=src;
    script.defer=true;
    document.head.appendChild(script);
  });
})();

"use strict";

/* Feature loader: Stage 6 core + Stage 7 CV Tailoring + Stage 7.1 Smart Job Entry + Stage 7.2 CV Generator. */
(function loadJobHuntFeatures(){
  const scripts=["stage6-core.js?v=12","stage7.js?v=12","smartjob.js?v=12","stage7cv.js?v=12"];
  scripts.forEach(src=>{
    if([...document.scripts].some(script=>script.src.includes(src.split("?")[0]))) return;
    const script=document.createElement("script");
    script.src=src;
    script.defer=true;
    document.head.appendChild(script);
  });
})();

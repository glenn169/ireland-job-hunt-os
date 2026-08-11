"use strict";

/* Feature loader: Stage 6 core + Stage 7 CV Tailoring + Stage 7.x CV helpers + Stage 8 follow-up system + Stage 9 daily workflow. */
(function loadJobHuntFeatures(){
  const scripts=["stage6-core.js?v=21","stage7.js?v=21","stage7summary.js?v=21","smartjob.js?v=21","stage7cv.js?v=21","stage7preserve.js?v=21","stage74bootstrap.js?v=21","stage75docx.js?v=21","stage8.js?v=21","stage9.js?v=21"];
  scripts.forEach(src=>{
    if([...document.scripts].some(script=>script.src.includes(src.split("?")[0]))) return;
    const script=document.createElement("script");
    script.src=src;
    script.defer=true;
    document.head.appendChild(script);
  });
})();

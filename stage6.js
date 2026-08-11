"use strict";

/* Feature loader: Stage 6 core + Stage 7 CV Tailoring + Stage 7.x CV helpers + Stage 8 follow-up system + Stage 9 daily workflow + Stage 10 live job discovery. */
(function loadJobHuntFeatures(){
  const scripts=["stage6-core.js?v=24","stage7.js?v=24","stage7summary.js?v=24","smartjob.js?v=24","stage7cv.js?v=24","stage7preserve.js?v=24","stage74bootstrap.js?v=24","stage75docx.js?v=24","stage8.js?v=24","stage9.js?v=24","stage10.js?v=24","stage10careerjet.js?v=24"];
  scripts.forEach(src=>{
    if([...document.scripts].some(script=>script.src.includes(src.split("?")[0]))) return;
    const script=document.createElement("script");
    script.src=src;
    script.defer=true;
    document.head.appendChild(script);
  });
})();

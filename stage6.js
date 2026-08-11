"use strict";

/* Feature loader: Stage 6 core + Stage 7 CV Tailoring + Stage 7.x CV helpers + Stage 8 follow-up system + Stage 9 daily workflow + Stage 10 multi-source live job discovery. */
(function loadJobHuntFeatures(){
  const scripts=["stage6-core.js?v=23","stage7.js?v=23","stage7summary.js?v=23","smartjob.js?v=23","stage7cv.js?v=23","stage7preserve.js?v=23","stage74bootstrap.js?v=23","stage75docx.js?v=23","stage8.js?v=23","stage9.js?v=23","stage10.js?v=25","stage10multi.js?v=25"];
  scripts.forEach(src=>{
    if([...document.scripts].some(script=>script.src.includes(src.split("?")[0]))) return;
    const script=document.createElement("script");
    script.src=src;
    script.defer=true;
    document.head.appendChild(script);
  });
})();

"use strict";

/* Feature loader: Stage 6 core + Stage 7 CV Tailoring + Stage 7.x CV helpers + Stage 8 follow-up system. */
(function loadJobHuntFeatures(){
  const scripts=["stage6-core.js?v=20","stage7.js?v=20","stage7summary.js?v=20","smartjob.js?v=20","stage7cv.js?v=20","stage7preserve.js?v=20","stage74bootstrap.js?v=20","stage75docx.js?v=20","stage8.js?v=20"];
  scripts.forEach(src=>{
    if([...document.scripts].some(script=>script.src.includes(src.split("?")[0]))) return;
    const script=document.createElement("script");
    script.src=src;
    script.defer=true;
    document.head.appendChild(script);
  });
})();

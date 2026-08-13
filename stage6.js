"use strict";

/* Feature loader: Stage 6 core + Stage 7 tailoring base + Stage 4 PDF/ATS workflow + Stage 8 follow-up system + Stage 9 daily workflow + Stage 10 multi-source live job discovery + Stage 11 application workspace. */
(function loadJobHuntFeatures(){
  const scripts=["stage6-core.js?v=23","stage7.js?v=23","stage7summary.js?v=23","smartjob.js?v=23","stage74bootstrap.js?v=23","stage4.js?v=1","stage8.js?v=23","stage9.js?v=23","stage10.js?v=26","stage10multi.js?v=26","stage106.js?v=26","stage11.js?v=27"];
  scripts.forEach(src=>{
    if([...document.scripts].some(script=>script.src.includes(src.split("?")[0]))) return;
    const script=document.createElement("script");
    script.src=src;
    script.defer=true;
    document.head.appendChild(script);
  });
})();

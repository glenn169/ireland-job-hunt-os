"use strict";

/* Feature loader: stable Stage 6/7 base + follow-up, daily workflow, search and application workspace. Stage 4 is temporarily disabled while its runtime interaction issue is isolated. */
(function loadJobHuntFeatures(){
  const scripts=["stage6-core.js?v=23","stage7.js?v=23","stage7summary.js?v=23","smartjob.js?v=23","stage74bootstrap.js?v=23","stage8.js?v=23","stage9.js?v=23","stage10.js?v=26","stage10multi.js?v=26","stage106.js?v=26","stage11.js?v=27"];
  scripts.forEach(src=>{
    if([...document.scripts].some(script=>script.src.includes(src.split("?")[0]))) return;
    const script=document.createElement("script");
    script.src=src;
    script.defer=true;
    document.head.appendChild(script);
  });
})();

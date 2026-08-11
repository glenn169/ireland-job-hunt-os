"use strict";

/* Feature loader: Stage 6 core + Stage 7 CV Tailoring Assistant. */
(function loadJobHuntFeatures(){
  const scripts=["stage6-core.js?v=9","stage7.js?v=9"];
  scripts.forEach(src=>{
    if([...document.scripts].some(script=>script.src.includes(src.split("?")[0]))) return;
    const script=document.createElement("script");
    script.src=src;
    script.defer=true;
    document.head.appendChild(script);
  });
})();

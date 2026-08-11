"use strict";

/* Stage 7.4 bootstrap: load the official Supabase browser client, then the cloud CV integration. */
(function loadStage74(){
  const loadIntegration=()=>{
    if([...document.scripts].some(script=>script.src.includes("stage74.js"))) return;
    const integration=document.createElement("script");
    integration.src="stage74.js?v=16";
    integration.defer=true;
    document.head.appendChild(integration);
  };

  if(window.supabase?.createClient){
    loadIntegration();
    return;
  }

  const existing=[...document.scripts].find(script=>script.src.includes("@supabase/supabase-js@2"));
  if(existing){
    existing.addEventListener("load",loadIntegration,{once:true});
    return;
  }

  const script=document.createElement("script");
  script.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  script.async=true;
  script.onload=loadIntegration;
  script.onerror=()=>console.error("Could not load the Supabase client library.");
  document.head.appendChild(script);
})();

"use strict";

/* Stage 4A - PDF-only Profile CV import.
   Narrow compatibility layer: keeps the existing Profile parser and UI,
   but restricts Profile/Master CV uploads to PDF and reuses PDF.js extraction.

   Stage 4B - Job Analyzer automatically uses the saved Profile CV.
   The existing candidate context field remains in the DOM for analyzer compatibility,
   but users no longer need to edit or save it manually. */
(function stage4aPdfProfileImport(){
  const PDF_ACCEPT = ".pdf,application/pdf";
  const PROFILE_PAGE_ID = "profilePage";

  function isPdf(file){
    if(!file) return false;
    return file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
  }

  function setStatus(message, bad=false){
    const candidates = [
      document.getElementById("cvImportStatus"),
      document.getElementById("s74MasterStatus"),
      document.querySelector("#profilePage .profile-import-status")
    ].filter(Boolean);
    candidates.forEach(el=>{
      el.textContent = message;
      if(el.classList?.contains("s74-status")){
        el.classList.toggle("bad", bad);
        if(!bad) el.classList.remove("bad");
      }
    });
  }

  function enforceFileInputs(){
    const page = document.getElementById(PROFILE_PAGE_ID);
    if(!page) return;
    page.querySelectorAll('input[type="file"]').forEach(input=>{
      input.accept = PDF_ACCEPT;
      input.dataset.stage4aPdfOnly = "1";
    });

    page.querySelectorAll("small, .s74-status, .profile-note, .analysis-notice").forEach(el=>{
      const text = el.textContent || "";
      if(/PDF,\s*DOCX\s*or\s*TXT/i.test(text)) el.textContent = text.replace(/PDF,\s*DOCX\s*or\s*TXT/gi,"PDF");
    });
  }

  function installPdfOnlyExtractor(){
    if(typeof window.extractPdfText !== "function") return false;
    if(window.__stage4aOriginalExtractCvText === undefined){
      window.__stage4aOriginalExtractCvText = window.extractCvText;
    }
    window.extractCvText = async function stage4aExtractCvText(file){
      if(!isPdf(file)) throw new Error("Unsupported file type. Please upload a PDF CV.");
      return window.extractPdfText(file);
    };
    return true;
  }

  function installCloudRestriction(){
    if(typeof window.s74FileTypeAllowed === "function"){
      window.s74FileTypeAllowed = file => isPdf(file);
    }
  }

  function rejectNonPdf(event){
    const input = event.target;
    if(!(input instanceof HTMLInputElement) || input.type !== "file") return;
    if(!input.closest(`#${PROFILE_PAGE_ID}`)) return;
    const file = input.files?.[0];
    if(!file || isPdf(file)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    input.value = "";
    setStatus("Please upload your CV as a PDF file.", true);
    window.alert("Please upload your CV as a PDF file.");
  }

  function refresh(){
    enforceFileInputs();
    installPdfOnlyExtractor();
    installCloudRestriction();
  }

  document.addEventListener("change", rejectNonPdf, true);

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", refresh, {once:true});
  } else {
    refresh();
  }

  const observer = new MutationObserver(()=>refresh());
  const startObserver = ()=>{
    const page = document.getElementById(PROFILE_PAGE_ID);
    if(page) observer.observe(page,{childList:true,subtree:true});
  };
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",startObserver,{once:true});
  else startObserver();

  let attempts=0;
  const timer=setInterval(()=>{
    refresh();
    attempts += 1;
    if(attempts >= 40) clearInterval(timer);
  },250);
})();

(function stage4bAnalyzerProfileAuto(){
  function syncFromProfile(){
    if(typeof window.loadStructuredProfile !== "function" || typeof window.syncAnalyzerContext !== "function") return;
    window.syncAnalyzerContext(window.loadStructuredProfile());
  }

  function init(){
    const page=document.getElementById("analyzerPage");
    if(!page) return;

    syncFromProfile();

    const oldPanel=page.querySelector(".candidate-context-panel");
    if(oldPanel) oldPanel.style.display="none";

    const inputPanel=page.querySelector(".analyzer-input-panel");
    if(inputPanel && !document.getElementById("stage4bProfileNotice")){
      const notice=document.createElement("section");
      notice.id="stage4bProfileNotice";
      notice.className="panel";
      notice.innerHTML='<div class="analysis-card-head"><div><div class="eyebrow">PROFILE CV</div><h3>Using your saved Profile CV automatically</h3></div><span class="analysis-count">AUTO</span></div><p class="analysis-notice">Paste only the job description below. The Job Analyzer automatically matches it against the CV and profile information saved on your Profile page.</p>';
      inputPanel.parentNode.insertBefore(notice,inputPanel);
    }

    const analyzeButton=document.getElementById("analyzeJobButton");
    if(analyzeButton && !analyzeButton.dataset.stage4bBound){
      analyzeButton.dataset.stage4bBound="1";
      analyzeButton.addEventListener("click",syncFromProfile,true);
    }
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();

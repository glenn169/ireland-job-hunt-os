"use strict";

/* Stage 4A - PDF-only Profile CV import.
   Narrow compatibility layer: keeps the existing Profile parser and UI,
   but restricts Profile/Master CV uploads to PDF and reuses PDF.js extraction. */
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
      else if(/PDF,\s*DOCX\s*or\s*TXT/i.test(text)) el.textContent = "PDF only.";
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

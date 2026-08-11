"use strict";

/* Stage 10.6 - Advanced Job Search & Filtering.
   Client-side filters, sorting, saved/hidden state and progressive reveal on top of Stage 10.5 multi-source results. */
(function stage106AdvancedSearch(){
  const HIDDEN_KEY="irelandJobHuntOS_hiddenLiveJobsV1";
  const PAGE_SIZE=25;
  let visibleCount=PAGE_SIZE;

  const q=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const uniq=items=>[...new Set((items||[]).map(v=>String(v||"").trim()).filter(Boolean))];
  const norm=value=>String(value||"").trim().toLowerCase().replace(/\s+/g," ");
  const providers=job=>uniq(Array.isArray(job?.providers)&&job.providers.length?job.providers:[job?.provider,job?.source]);

  function jobKey(job){
    const url=norm(job?.redirect_url).replace(/[?#].*$/,"");
    if(url)return `url:${url}`;
    if(job?.id)return `id:${norm(providers(job).join("+"))}:${String(job.id)}`;
    return `job:${norm(job?.title)}|${norm(job?.company)}|${norm(job?.location)}`;
  }
  function hiddenSet(){try{return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY)||"[]"));}catch{return new Set();}}
  function saveHidden(set){localStorage.setItem(HIDDEN_KEY,JSON.stringify([...set].slice(-1000)));}
  function trackerJobs(){try{return JSON.parse(localStorage.getItem("irelandJobHuntOS")||"{}").jobs||[];}catch{return [];}}
  function isSaved(job){
    const url=norm(job.redirect_url).replace(/[?#].*$/,"");
    const title=norm(job.title),company=norm(job.company);
    return trackerJobs().some(saved=>{
      const savedUrl=norm(saved.jobUrl).replace(/[?#].*$/,"");
      if(url&&savedUrl&&url===savedUrl)return true;
      if(job.id&&saved.sourceJobId&&String(job.id)===String(saved.sourceJobId))return true;
      return title&&company&&norm(saved.position||saved.role)===title&&norm(saved.company)===company;
    });
  }
  function workMode(job){
    const raw=norm(job.remote_type||job.workArrangement);
    const hay=norm(`${job.title||""} ${job.description||""} ${job.location||""}`);
    if(raw.includes("remote")||hay.includes("fully remote")||hay.includes("100% remote"))return "remote";
    if(raw.includes("hybrid")||hay.includes("hybrid"))return "hybrid";
    if(raw.includes("site")||raw.includes("office")||hay.includes("on-site")||hay.includes("onsite"))return "on-site";
    return "unspecified";
  }
  function employment(job){
    const raw=norm(`${job.contract_time||""} ${job.contract_type||""} ${job.employment_type||""} ${job.title||""}`);
    if(raw.includes("intern"))return "internship";
    if(raw.includes("graduate"))return "graduate";
    if(raw.includes("part"))return "part-time";
    if(raw.includes("contract")||raw.includes("temporary")||raw.includes("fixed term"))return "contract";
    if(raw.includes("full"))return "full-time";
    return "unspecified";
  }
  function daysOld(value){
    if(!value)return Infinity;
    const d=new Date(value);if(Number.isNaN(d.getTime()))return Infinity;
    return Math.max(0,(Date.now()-d.getTime())/86400000);
  }
  function salaryValue(job){
    const vals=[job.salary_max,job.salary_min].map(Number).filter(Number.isFinite);
    if(vals.length)return Math.max(...vals);
    const nums=String(job.salary_text||"").match(/\d[\d,.]*/g)?.map(v=>Number(v.replace(/,/g,""))).filter(Number.isFinite)||[];
    return nums.length?Math.max(...nums):0;
  }

  function ensureUI(){
    const page=q("liveSearchPage");
    if(!page||q("s106Filters"))return;
    const countRow=page.querySelector(".job-count-row");
    if(!countRow)return;
    const panel=document.createElement("section");
    panel.className="panel s106-filter-panel";
    panel.id="s106Filters";
    panel.innerHTML=`
      <div class="analysis-card-head"><div><div class="eyebrow">REFINE RESULTS</div><h3>Advanced filters</h3></div><button class="link-button" id="s106Clear">Clear filters</button></div>
      <div class="s106-grid">
        <div class="field"><label for="s106Source">Source</label><select id="s106Source"><option value="">All sources</option></select></div>
        <div class="field"><label for="s106Location">Filter location</label><input id="s106Location" placeholder="Dublin, Cork, Galway, Remote..."></div>
        <div class="field"><label for="s106Work">Work arrangement</label><select id="s106Work"><option value="">All</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="on-site">On-site</option><option value="unspecified">Not specified</option></select></div>
        <div class="field"><label for="s106Type">Employment type</label><select id="s106Type"><option value="">All</option><option value="full-time">Full-time</option><option value="part-time">Part-time</option><option value="contract">Contract</option><option value="internship">Internship</option><option value="graduate">Graduate</option><option value="unspecified">Not specified</option></select></div>
        <div class="field"><label for="s106Date">Date posted</label><select id="s106Date"><option value="">Any time</option><option value="1">Last 24 hours</option><option value="3">Last 3 days</option><option value="7">Last 7 days</option><option value="14">Last 14 days</option><option value="30">Last 30 days</option></select></div>
        <div class="field"><label for="s106Salary">Minimum salary</label><select id="s106Salary"><option value="0">Any / not listed</option><option value="30000">€30,000+</option><option value="40000">€40,000+</option><option value="50000">€50,000+</option><option value="60000">€60,000+</option><option value="80000">€80,000+</option></select></div>
        <div class="field"><label for="s106Sort">Sort results</label><select id="s106Sort"><option value="match">Best match</option><option value="newest">Newest</option><option value="salary">Highest salary</option><option value="company">Company A–Z</option></select></div>
      </div>
      <div class="s106-summary-row"><span id="s106Summary">Search to see advanced result statistics.</span><button class="link-button" id="s106Restore" hidden>Restore hidden jobs</button></div>`;
    countRow.parentNode.insertBefore(panel,countRow);

    const style=document.createElement("style");
    style.id="stage106Styles";
    style.textContent=`
      .s106-filter-panel{display:grid;gap:14px}.s106-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.s106-summary-row{display:flex;justify-content:space-between;gap:12px;align-items:center;color:var(--muted);font-size:11px}.s106-load{display:flex;justify-content:center;padding:8px 0 2px}.s106-load button{min-width:180px}.s106-saved{font-size:10px;padding:4px 7px;border-radius:999px;border:1px solid rgba(40,209,124,.45);color:var(--accent);margin-left:6px}.s106-hidden-btn{border-color:rgba(245,186,69,.35)!important;color:var(--warn)!important}.s106-card-hidden{display:none!important}@media(max-width:1050px){.s106-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.s106-grid{grid-template-columns:1fr}.s106-summary-row{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);

    ["s106Source","s106Work","s106Type","s106Date","s106Salary","s106Sort"].forEach(id=>q(id)?.addEventListener("change",()=>{visibleCount=PAGE_SIZE;s10RenderResults();}));
    q("s106Location")?.addEventListener("input",()=>{visibleCount=PAGE_SIZE;s10RenderResults();});
    q("s106Clear")?.addEventListener("click",clearFilters);
    q("s106Restore")?.addEventListener("click",()=>{localStorage.removeItem(HIDDEN_KEY);visibleCount=PAGE_SIZE;s10RenderResults();});
  }

  function clearFilters(){
    ["s106Source","s106Location","s106Work","s106Type","s106Date","s106Sort"].forEach(id=>{if(q(id))q(id).value=id==="s106Sort"?"match":"";});
    if(q("s106Salary"))q("s106Salary").value="0";
    if(q("s10MinScore"))q("s10MinScore").value="0";
    visibleCount=PAGE_SIZE;
    s10RenderResults();
  }

  function populateSources(){
    const select=q("s106Source");if(!select)return;
    const current=select.value;
    const names=uniq((window.s10Results||s10Results||[]).flatMap(providers)).sort((a,b)=>a.localeCompare(b));
    select.innerHTML='<option value="">All sources</option>'+names.map(name=>`<option value="${esc(norm(name))}">${esc(name)}</option>`).join("");
    if([...select.options].some(o=>o.value===current))select.value=current;
  }

  function filteredResults(){
    const hidden=hiddenSet();
    const source=norm(q("s106Source")?.value);
    const loc=norm(q("s106Location")?.value);
    const work=q("s106Work")?.value||"";
    const type=q("s106Type")?.value||"";
    const maxDays=Number(q("s106Date")?.value||0);
    const salaryMin=Number(q("s106Salary")?.value||0);
    const minScore=Number(q("s10MinScore")?.value||0);
    const sort=q("s106Sort")?.value||"match";
    let list=s10Results.filter(job=>{
      if(hidden.has(jobKey(job)))return false;
      if((job._match?.score||0)<minScore)return false;
      if(source&&!providers(job).some(p=>norm(p)===source))return false;
      if(loc&&!norm(`${job.location||""} ${job.remote_type||""}`).includes(loc))return false;
      if(work&&workMode(job)!==work)return false;
      if(type&&employment(job)!==type)return false;
      if(maxDays&&daysOld(job.created)>maxDays)return false;
      if(salaryMin&&salaryValue(job)<salaryMin)return false;
      return true;
    });
    list=[...list].sort((a,b)=>{
      if(sort==="newest")return (new Date(b.created||0).getTime()||0)-(new Date(a.created||0).getTime()||0);
      if(sort==="salary")return salaryValue(b)-salaryValue(a);
      if(sort==="company")return String(a.company||"").localeCompare(String(b.company||""));
      return (b._match?.score||0)-(a._match?.score||0);
    });
    return list;
  }

  function renderSummary(list){
    const hidden=hiddenSet();
    const sourceCount=uniq(list.flatMap(providers)).length;
    const above60=list.filter(j=>(j._match?.score||0)>=60).length;
    const savedCount=list.filter(isSaved).length;
    if(q("s106Summary"))q("s106Summary").textContent=`${list.length} matching jobs · ${sourceCount} ${sourceCount===1?"source":"sources"} · ${above60} at 60%+ match · ${savedCount} already saved`;
    const restore=q("s106Restore");if(restore){restore.hidden=!hidden.size;restore.textContent=`Restore ${hidden.size} hidden ${hidden.size===1?"job":"jobs"}`;}
  }

  function enhanceCard(job,html){
    const saved=isSaved(job);
    const marker=saved?'<span class="s106-saved">Saved ✓</span>':"";
    let out=html.replace(/(<div class="s10-company">[\s\S]*?<\/div>)/,`$1${marker}`);
    const hide=`<button class="s106-hidden-btn" data-s106-hide="${esc(jobKey(job))}">Hide job</button>`;
    out=out.replace('</div><div class="s10-source-note">',`${hide}</div><div class="s10-source-note">`);
    if(!out.includes('data-s106-hide='))out=out.replace('</article>',`<div class="s10-actions">${hide}</div></article>`);
    if(saved)out=out.replace(/<button data-s10-save="[^"]+">Save to Tracker<\/button>/,'<button disabled>Already saved ✓</button>');
    return out;
  }

  function bindCards(host){
    host.querySelectorAll("[data-s10-save]").forEach(btn=>btn.addEventListener("click",()=>{s10SaveJob(btn.dataset.s10Save,btn);setTimeout(s10RenderResults,0);}));
    host.querySelectorAll("[data-s106-hide]").forEach(btn=>btn.addEventListener("click",()=>{
      const set=hiddenSet();set.add(btn.dataset.s106Hide);saveHidden(set);visibleCount=Math.max(PAGE_SIZE,visibleCount-1);s10RenderResults();
    }));
    q("s106LoadMore")?.addEventListener("click",()=>{visibleCount+=PAGE_SIZE;s10RenderResults();});
  }

  function boot(){
    if(typeof s10RenderResults!=="function"||typeof s10Card!=="function"||typeof s10Search!=="function"||!q("liveSearchPage")){setTimeout(boot,120);return;}
    if(window.__stage106Ready)return;window.__stage106Ready=true;
    ensureUI();
    const baseCard=s10Card;
    s10Card=function(job){return enhanceCard(job,baseCard(job));};

    s10RenderResults=function(){
      ensureUI();populateSources();
      const host=q("s10Results");if(!host)return;
      const list=filteredResults();renderSummary(list);
      if(q("s10Count"))q("s10Count").textContent=`${list.length} filtered ${list.length===1?"job":"jobs"} · ${s10Results.length} collected`;
      if(!list.length){host.innerHTML='<div class="panel s10-status">No jobs match these filters. Clear one or more filters or broaden the search.</div>';return;}
      const shown=list.slice(0,visibleCount);
      host.innerHTML=shown.map(s10Card).join("")+(shown.length<list.length?`<div class="s106-load"><button class="secondary-btn" id="s106LoadMore">Load ${Math.min(PAGE_SIZE,list.length-shown.length)} more jobs</button></div>`:"");
      bindCards(host);
    };

    const baseSearch=s10Search;
    s10Search=async function(useProfile=true){visibleCount=PAGE_SIZE;await baseSearch(useProfile);populateSources();if(!q("s10Results")?.textContent?.includes("Live search failed"))s10RenderResults();};
    q("s10MinScore")?.addEventListener("change",()=>{visibleCount=PAGE_SIZE;s10RenderResults();});
    document.querySelector('.nav [data-page="search"]')?.addEventListener("click",()=>setTimeout(()=>{ensureUI();populateSources();if(s10Results.length)s10RenderResults();},60));
  }
  boot();
})();

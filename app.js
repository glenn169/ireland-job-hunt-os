"use strict";

const STORAGE_KEY = "irelandJobHuntOS";

const DEFAULT_STATE = {
  version: 1,
  profile: {
    targetRoles: [
      "SOC Analyst",
      "Cybersecurity Analyst",
      "Security Operations",
      "IT Security",
      "Junior Security Engineer",
      "NOC",
      "Network Engineer",
      "IT Support",
      "Graduate Cybersecurity",
      "Junior Penetration Tester"
    ]
  },
  jobs: [],
  dailyGoals: {},
  activity: []
};

function cloneDefault() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = cloneDefault();
    saveState(initial);
    return initial;
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      ...cloneDefault(),
      ...parsed,
      profile: { ...DEFAULT_STATE.profile, ...(parsed.profile || {}) },
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
      dailyGoals: parsed.dailyGoals || {},
      activity: Array.isArray(parsed.activity) ? parsed.activity : []
    };
  } catch (error) {
    console.error("Unable to read saved data", error);
    return cloneDefault();
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let appState = loadState();

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function displayDate() {
  setText("currentDate", new Intl.DateTimeFormat("en-IE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date()));
}

function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isFollowUpDue(job) {
  if (!job.followUpDate) return false;
  if (["Offer", "Rejected", "Withdrawn"].includes(job.status)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${job.followUpDate}T00:00:00`) <= today;
}

function updateStats() {
  const jobs = appState.jobs;
  const applications = jobs.filter(j => ["Applied", "Assessment", "Interview", "Final Interview", "Offer", "Rejected"].includes(j.status));
  const interviews = jobs.filter(j => ["Interview", "Final Interview", "Offer"].includes(j.status));
  const offers = jobs.filter(j => j.status === "Offer");
  const saved = jobs.filter(j => j.status === "Saved");
  const followUps = jobs.filter(isFollowUpDue);
  const rate = applications.length ? ((interviews.length / applications.length) * 100).toFixed(1) : "0";

  setText("totalApplications", applications.length);
  setText("totalInterviews", interviews.length);
  setText("totalOffers", offers.length);
  setText("savedJobs", saved.length);
  setText("followUps", followUps.length);
  setText("interviewRate", `${rate}%`);
}

function renderRoles() {
  const container = document.getElementById("targetRoles");
  container.innerHTML = "";
  appState.profile.targetRoles.forEach(role => {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = role;
    container.appendChild(span);
  });
}

function loadGoals() {
  const goals = appState.dailyGoals[getTodayKey()] || {};
  document.querySelectorAll("#dailyGoals input[type='checkbox']").forEach(box => {
    box.checked = Boolean(goals[box.dataset.goal]);
  });
  updateGoalProgress();
}

function updateGoalProgress() {
  const boxes = [...document.querySelectorAll("#dailyGoals input[type='checkbox']")];
  setText("goalProgress", `${boxes.filter(b => b.checked).length} / ${boxes.length}`);
}

function saveGoal(event) {
  const today = getTodayKey();
  appState.dailyGoals[today] ||= {};
  appState.dailyGoals[today][event.target.dataset.goal] = event.target.checked;
  saveState(appState);
  updateGoalProgress();
}

const PAGES = {
  dashboard: ["Dashboard", ""],
  jobs: ["Job Tracker", "Stage 2 will add the complete job and application tracking system."],
  analyzer: ["Job Description Analyzer", "Paste job descriptions and identify skills, qualifications, keywords, and experience requirements."],
  skills: ["Skills & Learning", "Manage your cybersecurity profile and identify skills gaps."],
  daily: ["Daily Job Hunt", "Your dedicated daily job-search workflow will be built here."],
  interviews: ["Interview Preparation", "Technical, behavioural, and STAR preparation will be organised here."],
  analytics: ["Application Analytics", "Application performance and job-market insights will appear here."],
  search: ["Job Search", "Quick searches for LinkedIn, Indeed, IrishJobs, Jobs.ie, PublicJobs, and career pages."],
  profile: ["Personal Profile", "Your education, skills, certifications, experience, projects, and preferences will be managed here."]
};

function navigate(page) {
  const info = PAGES[page];
  if (!info) return;
  document.querySelectorAll(".nav button").forEach(btn => btn.classList.toggle("active", btn.dataset.page === page));
  const dashboard = document.getElementById("dashboardPage");
  const placeholder = document.getElementById("placeholderPage");
  if (page === "dashboard") {
    dashboard.classList.add("active");
    placeholder.classList.remove("active");
  } else {
    dashboard.classList.remove("active");
    placeholder.classList.add("active");
    setText("placeholderTitle", info[0]);
    setText("placeholderDescription", info[1]);
  }
  setText("pageTitle", info[0]);
  document.getElementById("sidebar").classList.remove("open");
}

function setupEvents() {
  document.getElementById("mobileMenu").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
  document.querySelectorAll(".nav button").forEach(btn => btn.addEventListener("click", () => navigate(btn.dataset.page)));
  document.querySelectorAll("#dailyGoals input[type='checkbox']").forEach(box => box.addEventListener("change", saveGoal));
  document.getElementById("quickAddJob").addEventListener("click", () => navigate("jobs"));
  document.getElementById("returnDashboard").addEventListener("click", () => navigate("dashboard"));
}

function init() {
  displayDate();
  renderRoles();
  loadGoals();
  updateStats();
  setupEvents();
}

document.addEventListener("DOMContentLoaded", init);

/* =====================================================================
   SOLO LEVEL UP — a 60-day gamified self-improvement tracker
   Plain JS, no build step. All data lives in localStorage.
   ===================================================================== */
(function () {
  "use strict";

  // ------------------------------------------------------------------
  // Constants
  // ------------------------------------------------------------------
  const STORAGE_KEY = "solo-level-up:v1";
  const CAMPAIGN_DAYS = 60;

  const STATS = {
    STR: { name: "Strength", desc: "Training, lifting, physical power" },
    VIT: { name: "Vitality", desc: "Sleep, nutrition, hydration, recovery" },
    AGI: { name: "Agility", desc: "Discipline, productivity, deep work" },
    INT: { name: "Intelligence", desc: "Reading, learning, new skills" },
    PER: { name: "Perception", desc: "Mindfulness, focus, reflection" },
    CHA: { name: "Charisma", desc: "Relationships, social, communication" },
  };
  const STAT_KEYS = Object.keys(STATS);
  const STAT_BASE = 10;
  const XP_PER_STAT_POINT = 40;

  const RANKS = [
    { r: "E", min: 1, name: "E-Rank" },
    { r: "D", min: 8, name: "D-Rank" },
    { r: "C", min: 16, name: "C-Rank" },
    { r: "B", min: 25, name: "B-Rank" },
    { r: "A", min: 35, name: "A-Rank" },
    { r: "S", min: 45, name: "S-Rank" },
  ];

  const GATE_RANKS = {
    E: { xp: 100, gold: 50 },
    D: { xp: 200, gold: 100 },
    C: { xp: 350, gold: 175 },
    B: { xp: 550, gold: 275 },
    A: { xp: 800, gold: 400 },
    S: { xp: 1200, gold: 600 },
  };

  const PHASES = [
    { name: "Awakening", blurb: "Show up. Build the habit of logging every day." },
    { name: "Foundation", blurb: "Lock in the routine. No zero days." },
    { name: "Momentum", blurb: "Raise the bar. Push one quest harder." },
    { name: "The Trial", blurb: "The midpoint wall. Discipline over motivation." },
    { name: "Ascension", blurb: "You are not who you were. Clear a high-rank gate." },
    { name: "Transcendence", blurb: "Finish strong. Become the person from your vision." },
  ];

  const PRESETS = [
    { name: "Push-ups", stat: "STR", type: "count", target: 50, unit: "reps", xp: 25, def: true },
    { name: "Sit-ups", stat: "STR", type: "count", target: 50, unit: "reps", xp: 20 },
    { name: "Squats", stat: "STR", type: "count", target: 50, unit: "reps", xp: 20 },
    { name: "Workout / training session", stat: "STR", type: "check", xp: 35 },
    { name: "Run or walk", stat: "AGI", type: "count", target: 3, unit: "km", xp: 30, def: true },
    { name: "Sleep 7+ hours", stat: "VIT", type: "check", xp: 20, def: true },
    { name: "Drink water", stat: "VIT", type: "count", target: 8, unit: "glasses", xp: 15, def: true },
    { name: "Eat clean (no junk food)", stat: "VIT", type: "check", xp: 20 },
    { name: "Deep work", stat: "AGI", type: "count", target: 90, unit: "min", xp: 30, def: true },
    { name: "No phone first hour of the day", stat: "AGI", type: "check", xp: 15 },
    { name: "Read", stat: "INT", type: "count", target: 20, unit: "pages", xp: 25, def: true },
    { name: "Learn a skill", stat: "INT", type: "count", target: 30, unit: "min", xp: 25 },
    { name: "Meditate", stat: "PER", type: "count", target: 10, unit: "min", xp: 20, def: true },
    { name: "Journal / reflect", stat: "PER", type: "check", xp: 15 },
    { name: "Reach out to someone", stat: "CHA", type: "check", xp: 15, def: true },
    { name: "Do something kind", stat: "CHA", type: "check", xp: 15 },
  ];

  const SYSTEM_MESSAGES = [
    "The weak stay weak because they stop. Do not stop.",
    "Every rep is experience. Every page is experience. Collect it.",
    "No one is coming to level you up. That is the point.",
    "Discipline is the only stat that multiplies all the others.",
    "You don't rise to your goals. You fall to your systems.",
    "Small daily quests. Massive 60-day transformation.",
    "Today's clear is tomorrow's baseline.",
    "Motivation is a buff. Habits are permanent stats.",
    "The gate only opens for those who walk toward it.",
    "A missed day is a penalty, not a game over. Return.",
    "Rank is earned in the hours nobody sees.",
    "Level up quietly. Let the results be loud.",
  ];

  // ------------------------------------------------------------------
  // Date helpers (local dates as YYYY-MM-DD keys)
  // ------------------------------------------------------------------
  const pad = (n) => String(n).padStart(2, "0");
  const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
  const todayKey = () => toKey(new Date());
  const addDays = (k, n) => { const d = fromKey(k); d.setDate(d.getDate() + n); return toKey(d); };
  const dayNum = (k) => { const [y, m, d] = k.split("-").map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };
  const diffDays = (a, b) => dayNum(b) - dayNum(a);
  const fmtDate = (k, opts) => fromKey(k).toLocaleDateString(undefined, opts || { weekday: "short", month: "short", day: "numeric" });

  // ------------------------------------------------------------------
  // Misc helpers
  // ------------------------------------------------------------------
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const $ = (sel, root = document) => root.querySelector(sel);
  const fmtNum = (n) => Math.round(n).toLocaleString();
  const stepFor = (q) => q.step || (q.target >= 50 ? 10 : q.target >= 15 ? 5 : 1);

  // XP curve: going from level L to L+1 costs 40 + 8*(L-1)
  const xpForLevel = (L) => 40 + 8 * (L - 1);
  function levelFromXP(xp) {
    let L = 1, rem = Math.max(0, xp);
    while (rem >= xpForLevel(L)) { rem -= xpForLevel(L); L++; }
    return { level: L, into: rem, need: xpForLevel(L) };
  }
  const rankFor = (level) => RANKS.filter((r) => level >= r.min).pop();

  // ------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------
  let state = load();
  let ui = { view: "status", date: todayKey(), editingQuest: null };

  function defaultState() {
    return {
      version: 1,
      hunter: null, // { name, vision, startDate, firstStart, title }
      quests: [],
      penaltyQuest: "20 burpees + 15 minutes on the task you've been avoiding",
      logs: {},
      gates: [],
      rewards: [
        { id: uid(), name: "Episode of a show guilt-free", cost: 60 },
        { id: uid(), name: "Favorite takeout meal", cost: 200 },
        { id: uid(), name: "New book or game", cost: 450 },
      ],
      purchases: [],
      meta: { seenLevel: 1, seenAchievements: [], seenClears: [] },
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) { console.warn("Could not load save", e); }
    return defaultState();
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { toast("Save failed", "Your browser blocked local storage. Export a backup from System.", "bad"); }
  }

  function getLog(date) {
    if (!state.logs[date]) state.logs[date] = { q: {}, note: "", mood: 0, energy: 0, penalty: false };
    return state.logs[date];
  }
  function questsForDate(date) {
    return state.quests.filter((q) => q.createdAt <= date && (!q.archivedAt || q.archivedAt > date));
  }
  const targetOf = (q) => (q.type === "check" ? 1 : q.target);

  // ------------------------------------------------------------------
  // Derived game state — everything is recomputed from the logs, so
  // toggling a quest on/off can never double-award XP.
  // ------------------------------------------------------------------
  function compute() {
    const h = state.hunter;
    const today = todayKey();
    const statXP = Object.fromEntries(STAT_KEYS.map((k) => [k, 0]));
    const days = {};
    let xp = 0, gold = 0, run = 0, best = 0, clears = 0, penaltiesDone = 0, journalDays = 0;

    if (h) {
      const first = h.firstStart || h.startDate;
      for (let d = first; d <= today; d = addDays(d, 1)) {
        const log = state.logs[d] || { q: {} };
        const qs = questsForDate(d);
        let dayXP = 0, done = 0;
        qs.forEach((q) => {
          const ratio = Math.min(1, (log.q[q.id] || 0) / targetOf(q));
          const g = Math.floor(q.xp * ratio);
          dayXP += g; statXP[q.stat] += g;
          if (ratio >= 1) done++;
        });
        const cleared = qs.length > 0 && done === qs.length;
        let bonus = 0;
        if (cleared) {
          run++; clears++;
          bonus = 50 + Math.min(run - 1, 10) * 5; // streak-scaled clear bonus
          best = Math.max(best, run);
        } else if (d !== today) {
          run = 0;
        }
        // Penalty: if yesterday (within the run) wasn't cleared
        const prev = addDays(d, -1);
        const hasPenalty = d > first && days[prev] && !days[prev].cleared;
        let penaltyXP = 0;
        if (hasPenalty) {
          if (log.penalty) { penaltyXP = 30; penaltiesDone++; statXP.AGI += 30; }
          else if (d !== today) penaltyXP = -50;
        }
        if (log.note && log.note.trim()) journalDays++;
        const total = dayXP + bonus + penaltyXP;
        xp += total;
        gold += Math.floor(dayXP / 2) + (cleared ? 25 : 0) + (penaltyXP > 0 ? 10 : 0);
        days[d] = { xp: total, questXP: dayXP, bonus, penaltyXP, done, total: qs.length, pct: qs.length ? done / qs.length : 0, cleared, hasPenalty, penaltyDone: !!log.penalty };
      }
    }

    let gatesCleared = 0, highestGate = null;
    state.gates.forEach((g) => {
      if (!g.clearedAt) return;
      const r = GATE_RANKS[g.rank];
      xp += r.xp; gold += r.gold; statXP[g.stat] = (statXP[g.stat] || 0) + Math.floor(r.xp / 2);
      gatesCleared++;
      if (!highestGate || "EDCBAS".indexOf(g.rank) > "EDCBAS".indexOf(highestGate)) highestGate = g.rank;
    });
    state.purchases.forEach((p) => (gold -= p.cost));

    xp = Math.max(0, xp);
    const lv = levelFromXP(xp);
    const stats = Object.fromEntries(STAT_KEYS.map((k) => [k, STAT_BASE + Math.floor(statXP[k] / XP_PER_STAT_POINT)]));
    const todayDay = days[today];
    const streak = run; // run holds yesterday's streak if today isn't cleared yet
    const dayIndex = h ? diffDays(h.startDate, today) + 1 : 0;

    const c = { xp, gold, days, statXP, stats, streak, best, clears, gatesCleared, highestGate, penaltiesDone, journalDays, todayDay, dayIndex, ...lv };
    c.rank = rankFor(c.level);
    c.achievements = ACHIEVEMENTS.filter((a) => a.test(c)).map((a) => a.id);
    return c;
  }

  // ------------------------------------------------------------------
  // Titles (achievements)
  // ------------------------------------------------------------------
  const ACHIEVEMENTS = [
    { id: "awakened", name: "The Awakened", desc: "Accepted the System's trial.", test: () => true },
    { id: "first-clear", name: "First Blood", desc: "Clear every daily quest in a single day.", test: (c) => c.clears >= 1 },
    { id: "streak-3", name: "Kindled", desc: "3-day clear streak.", test: (c) => c.best >= 3 },
    { id: "streak-7", name: "Unbroken", desc: "7-day clear streak.", test: (c) => c.best >= 7 },
    { id: "streak-14", name: "Iron Will", desc: "14-day clear streak.", test: (c) => c.best >= 14 },
    { id: "streak-30", name: "Relentless", desc: "30-day clear streak.", test: (c) => c.best >= 30 },
    { id: "streak-60", name: "Sovereign of Discipline", desc: "60-day clear streak. Flawless.", test: (c) => c.best >= 60 },
    { id: "redeemed", name: "Redeemed", desc: "Complete a penalty quest.", test: (c) => c.penaltiesDone >= 1 },
    { id: "scribe", name: "The Scribe", desc: "Write journal entries on 7 days.", test: (c) => c.journalDays >= 7 },
    { id: "gate-1", name: "Gate Breaker", desc: "Clear your first gate.", test: (c) => c.gatesCleared >= 1 },
    { id: "gate-5", name: "Dungeon Diver", desc: "Clear 5 gates.", test: (c) => c.gatesCleared >= 5 },
    { id: "gate-a", name: "High-Rank Raider", desc: "Clear an A-rank or S-rank gate.", test: (c) => c.highestGate === "A" || c.highestGate === "S" },
    { id: "stat-30", name: "Specialist", desc: "Raise any stat to 30.", test: (c) => STAT_KEYS.some((k) => c.stats[k] >= 30) },
    { id: "balanced", name: "Well-Rounded", desc: "Every stat at 15 or higher.", test: (c) => STAT_KEYS.every((k) => c.stats[k] >= 15) },
    { id: "rank-D", name: "D-Rank Hunter", desc: "Reach level 8.", test: (c) => c.level >= 8 },
    { id: "rank-C", name: "C-Rank Hunter", desc: "Reach level 16.", test: (c) => c.level >= 16 },
    { id: "rank-B", name: "B-Rank Hunter", desc: "Reach level 25.", test: (c) => c.level >= 25 },
    { id: "rank-A", name: "A-Rank Hunter", desc: "Reach level 35.", test: (c) => c.level >= 35 },
    { id: "rank-S", name: "S-Rank Hunter", desc: "Reach level 45.", test: (c) => c.level >= 45 },
    { id: "day-60", name: "Day Sixty", desc: "Reach the final day of the campaign.", test: (c) => c.dayIndex >= CAMPAIGN_DAYS },
  ];
  const achvById = (id) => ACHIEVEMENTS.find((a) => a.id === id);

  // ------------------------------------------------------------------
  // Notifications
  // ------------------------------------------------------------------
  function toast(title, body, kind) {
    const el = document.createElement("div");
    el.className = "toast " + (kind || "");
    el.innerHTML = `<b>[SYSTEM] ${esc(title)}</b>${body ? esc(body) : ""}`;
    const box = $("#toasts");
    box.appendChild(el);
    while (box.children.length > 3) box.firstElementChild.remove();
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 300); }, 3200);
  }

  const modalQueue = [];
  function showModal(html) {
    modalQueue.push(html);
    if (modalQueue.length === 1) openNextModal();
  }
  function openNextModal() {
    const m = $("#modal");
    if (!modalQueue.length) { m.hidden = true; m.innerHTML = ""; return; }
    m.innerHTML = `<div class="window">${modalQueue[0]}<div style="margin-top:18px"><button class="btn primary" data-action="close-modal">Confirm</button></div></div>`;
    m.hidden = false;
    $("button", m).focus();
  }
  function closeModal() { modalQueue.shift(); openNextModal(); }

  // Compare derived state with what the player has already "seen" and announce changes.
  function announce(c) {
    const meta = state.meta;
    if (c.level > meta.seenLevel) {
      const prevRank = rankFor(meta.seenLevel);
      showModal(`<div class="muted small mono">[SYSTEM]</div><h1>LEVEL UP!</h1>
        <div class="big">${c.level}</div>
        <p class="dim">Your body and mind have grown stronger.</p>
        ${prevRank.r !== c.rank.r ? `<p class="rank rank-${c.rank.r}" style="font-size:22px">Rank up: ${c.rank.name}</p>` : ""}`);
    }
    meta.seenLevel = c.level;

    const newAch = c.achievements.filter((id) => !meta.seenAchievements.includes(id));
    newAch.forEach((id) => { if (id !== "awakened") toast("Title acquired", `“${achvById(id).name}” — ${achvById(id).desc}`, "gold"); });
    meta.seenAchievements = c.achievements.slice();

    const today = todayKey();
    if (c.todayDay && c.todayDay.cleared && !meta.seenClears.includes(today)) {
      meta.seenClears.push(today);
      meta.seenClears = meta.seenClears.slice(-90);
      showModal(`<div class="muted small mono">[SYSTEM]</div><h1 style="font-size:24px">DAILY QUEST COMPLETE</h1>
        <p class="dim">You have completed every daily quest. Rewards distributed:</p>
        <div class="reward-line"><span>+${c.todayDay.bonus} BONUS XP</span><span class="cost">+25 GOLD</span><span>STREAK ${c.streak}</span></div>`);
    }
    save();
  }

  // ------------------------------------------------------------------
  // Rendering
  // ------------------------------------------------------------------
  function render() {
    const app = $("#app");
    if (!state.hunter) {
      $("#topbar").hidden = true;
      app.innerHTML = renderOnboarding();
      return;
    }
    const c = compute();
    $("#topbar").hidden = false;
    document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.view === ui.view));
    $("#topMeta").innerHTML = `
      <span class="pill hide-sm">DAY ${clamp(c.dayIndex, 1, 999)}${c.dayIndex <= CAMPAIGN_DAYS ? "/" + CAMPAIGN_DAYS : ""}</span>
      <span class="pill">LV ${c.level}</span>
      <span class="pill gold">${fmtNum(c.gold)} G</span>`;

    const views = { status: renderStatus, quests: renderQuests, gates: renderGates, campaign: renderCampaign, shop: renderShop, system: renderSystem };
    app.innerHTML = (views[ui.view] || renderStatus)(c);
    announce(c);
    tickCountdown();
  }

  // ---------- Onboarding ----------
  function renderOnboarding() {
    return `<div class="awaken">
      <div class="window">
        <div class="awaken-title">
          <div class="muted mono small">[SYSTEM NOTIFICATION]</div>
          <h1>YOU HAVE BEEN CHOSEN</h1>
          <p>The System has selected you as a Player. For the next ${CAMPAIGN_DAYS} days you will receive Daily Quests.
          Complete them to gain experience, raise your stats, and level up your real life. Fail them, and a penalty awaits.</p>
        </div>
        <form id="onboardForm" class="stack" autocomplete="off">
          <div class="form-grid">
            <label class="field">Hunter name<input type="text" name="name" required maxlength="40" placeholder="Your name" /></label>
            <label class="field">Campaign start date<input type="date" name="start" value="${todayKey()}" required /></label>
          </div>
          <label class="field">Your Day-60 vision — who are you after ${CAMPAIGN_DAYS} days?
            <textarea name="vision" maxlength="600" placeholder="e.g. I wake up at 6am without an alarm, I've run a 5K, I've read 4 books, and I finally shipped my side project."></textarea>
          </label>
          <div>
            <div class="spread" style="margin-bottom:8px"><h3 class="dim" style="letter-spacing:.14em;font-size:15px">CHOOSE YOUR DAILY QUESTS</h3><span class="muted small">5–8 is the sweet spot. You can edit these later.</span></div>
            <div class="preset-grid">
              ${PRESETS.map((p, i) => `<label class="preset"><input type="checkbox" name="preset" value="${i}" ${p.def ? "checked" : ""}/>
                <span><b>${esc(p.name)}${p.type === "count" ? ` — ${p.target} ${esc(p.unit)}` : ""}</b><small>${p.stat} · ${p.xp} XP</small></span></label>`).join("")}
            </div>
          </div>
          <div class="typewriter" id="acceptLine">Will you accept?</div>
          <div class="row" style="justify-content:center"><button class="btn primary" type="submit" style="padding:12px 34px;font-size:16px">Accept</button></div>
        </form>
      </div>
    </div>`;
  }

  function completeOnboarding(form) {
    const fd = new FormData(form);
    const name = String(fd.get("name") || "").trim();
    if (!name) return;
    const start = String(fd.get("start") || todayKey());
    const picks = fd.getAll("preset").map(Number);
    state.hunter = { name, vision: String(fd.get("vision") || "").trim(), startDate: start, firstStart: start, title: "awakened" };
    state.quests = picks.map((i) => {
      const p = PRESETS[i];
      return { id: uid(), name: p.name, stat: p.stat, type: p.type, target: p.target || 1, unit: p.unit || "", xp: p.xp, createdAt: start, archivedAt: null };
    });
    state.meta = { seenLevel: 1, seenAchievements: ["awakened"], seenClears: [] };
    save();
    ui.view = "quests";
    ui.date = start > todayKey() ? todayKey() : todayKey();
    render();
    showModal(`<div class="muted small mono">[SYSTEM]</div><h1 style="font-size:26px">PLAYER REGISTERED</h1>
      <p class="dim">Welcome, <b>${esc(name)}</b>. Your Daily Quest has arrived. Complete it before midnight.</p>
      <p class="muted small">Tip: everything is saved in this browser. Use System → Export to back up your progress.</p>`);
  }

  // ---------- Status ----------
  function renderStatus(c) {
    const h = state.hunter;
    const title = achvById(h.title) && c.achievements.includes(h.title) ? achvById(h.title).name : "—";
    const t = c.todayDay || { done: 0, total: questsForDate(todayKey()).length };
    const msg = SYSTEM_MESSAGES[dayNum(todayKey()) % SYSTEM_MESSAGES.length];
    const nextRank = RANKS.find((r) => r.min > c.level);
    const campaignPct = clamp((c.dayIndex - 1) / CAMPAIGN_DAYS, 0, 1);

    return `<div class="grid">
      <div class="window"><div class="sys-msg">${esc(msg)}</div></div>

      <div class="grid two">
        <section class="window">
          <div class="win-title"><h2>Status</h2><span class="muted small mono">${fmtNum(c.xp)} total XP</span></div>
          <div class="hero">
            <div class="level-badge"><div><div class="lv-label">LEVEL</div><div class="lv-num">${c.level}</div></div></div>
            <div class="hero-info">
              <div class="hero-name">${esc(h.name)}</div>
              <dl class="kv">
                <dt>Rank</dt><dd class="rank rank-${c.rank.r}">${c.rank.name}${nextRank ? ` <span class="muted small">· ${nextRank.name} at LV ${nextRank.min}</span>` : ""}</dd>
                <dt>Title</dt><dd>${esc(title)}</dd>
                <dt>Job</dt><dd>${c.level >= 45 ? "Sovereign" : c.level >= 25 ? "Ascendant" : "Player"}</dd>
              </dl>
            </div>
          </div>
          <div style="margin-top:16px">
            <div class="spread small"><span class="dim">EXP</span><span class="mono">${fmtNum(c.into)} / ${fmtNum(c.need)}</span></div>
            <div class="bar" title="${Math.round((c.into / c.need) * 100)}% to level ${c.level + 1}"><span style="width:${(c.into / c.need) * 100}%"></span></div>
          </div>
          <hr class="sep" />
          <div class="grid three">
            <div class="metric"><div class="m-val">${c.streak}<span class="muted small"> days</span></div><div class="m-lbl">Streak · best ${c.best}</div></div>
            <div class="metric"><div class="m-val" style="color:var(--gold)">${fmtNum(c.gold)}</div><div class="m-lbl">Gold</div></div>
            <div class="metric"><div class="m-val">${c.clears}</div><div class="m-lbl">Days cleared</div></div>
          </div>
        </section>

        <section class="window">
          <div class="win-title"><h2>Stats</h2><span class="muted small">+1 per ${XP_PER_STAT_POINT} stat XP</span></div>
          <div class="stats-layout">
            <div class="radar-wrap">${radarSVG(c.stats)}</div>
            <div class="stats-list">
              ${STAT_KEYS.map((k) => {
                const into = c.statXP[k] % XP_PER_STAT_POINT;
                return `<div>
                  <div class="stat-row"><span class="stat-abbr">${k}</span>
                    <div class="bar thin" title="${into}/${XP_PER_STAT_POINT} XP to next point"><span style="width:${(into / XP_PER_STAT_POINT) * 100}%"></span></div>
                    <span class="stat-val">${c.stats[k]}</span></div>
                  <div class="stat-name" title="${esc(STATS[k].desc)}">${STATS[k].name}</div></div>`;
              }).join("")}
            </div>
          </div>
        </section>
      </div>

      <div class="grid two">
        <section class="window ${c.todayDay && c.todayDay.hasPenalty && !c.todayDay.penaltyDone ? "danger" : ""}">
          <div class="win-title"><h2>Today's Daily Quest</h2><span class="countdown" data-countdown></span></div>
          <div class="spread"><span class="dim">${t.done} / ${t.total} quests complete</span><span class="mono small">${t.total ? Math.round((t.done / t.total) * 100) : 0}%</span></div>
          <div class="bar good" style="margin:8px 0 14px"><span style="width:${t.total ? (t.done / t.total) * 100 : 0}%"></span></div>
          ${c.todayDay && c.todayDay.hasPenalty && !c.todayDay.penaltyDone ? `<p style="color:var(--bad);margin:0 0 12px">⚠ A penalty quest is active. Complete it today or lose 50 XP.</p>` : ""}
          <button class="btn primary" data-action="goto" data-view="quests">Open Daily Quests</button>
        </section>

        <section class="window">
          <div class="win-title"><h2>The ${CAMPAIGN_DAYS}-Day Trial</h2><span class="muted small">${c.dayIndex < 1 ? "Starts " + fmtDate(h.startDate) : c.dayIndex > CAMPAIGN_DAYS ? "Complete" : `Phase ${Math.ceil(c.dayIndex / 10)}: ${PHASES[Math.ceil(c.dayIndex / 10) - 1].name}`}</span></div>
          <div class="spread small"><span class="dim">Day ${clamp(c.dayIndex, 0, CAMPAIGN_DAYS)} of ${CAMPAIGN_DAYS}</span><span class="mono">${Math.max(0, CAMPAIGN_DAYS - c.dayIndex)} days left</span></div>
          <div class="bar" style="margin:8px 0 12px"><span style="width:${campaignPct * 100}%"></span></div>
          ${h.vision ? `<div class="muted small" style="letter-spacing:.12em;font-family:var(--font-display)">YOUR VISION</div><p style="margin:4px 0 0">${esc(h.vision)}</p>` : `<p class="muted">Add your Day-60 vision in System → Profile.</p>`}
        </section>
      </div>

      <section class="window">
        <div class="win-title"><h2>Titles</h2><span class="muted small">${c.achievements.length} / ${ACHIEVEMENTS.length} acquired</span></div>
        <div class="achv-grid">
          ${ACHIEVEMENTS.map((a) => {
            const got = c.achievements.includes(a.id);
            const eq = h.title === a.id;
            return `<div class="achv ${got ? "" : "locked"} ${eq ? "equipped" : ""}">
              <h4>${got ? "" : "🔒 "}${esc(a.name)}</h4><p>${esc(a.desc)}</p>
              ${got ? `<div class="equip">${eq ? `<span class="small" style="color:var(--gold)">EQUIPPED</span>` : `<button class="btn ghost small" data-action="equip" data-id="${a.id}">Equip</button>`}</div>` : ""}
            </div>`;
          }).join("")}
        </div>
      </section>
    </div>`;
  }

  function radarSVG(stats) {
    const size = 260, cx = size / 2, cy = size / 2, R = 92;
    const maxV = Math.max(30, ...STAT_KEYS.map((k) => stats[k])) * 1.1;
    const pt = (i, r) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / STAT_KEYS.length; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
    const rings = [0.25, 0.5, 0.75, 1].map((f) => `<polygon points="${STAT_KEYS.map((_, i) => pt(i, R * f).join(",")).join(" ")}" fill="none" stroke="rgba(76,201,255,.18)" stroke-width="1"/>`).join("");
    const axes = STAT_KEYS.map((_, i) => { const [x, y] = pt(i, R); return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(76,201,255,.18)"/>`; }).join("");
    const poly = STAT_KEYS.map((k, i) => pt(i, (stats[k] / maxV) * R).join(",")).join(" ");
    const dots = STAT_KEYS.map((k, i) => { const [x, y] = pt(i, (stats[k] / maxV) * R); return `<circle cx="${x}" cy="${y}" r="4" fill="#4cc9ff" stroke="#05070f" stroke-width="2" data-tip="${STATS[k].name}: ${stats[k]}"/><circle cx="${x}" cy="${y}" r="12" fill="transparent" data-tip="${STATS[k].name}: ${stats[k]}"/>`; }).join("");
    const labels = STAT_KEYS.map((k, i) => { const [x, y] = pt(i, R + 20); return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" fill="#9fb3d1" font-family="Rajdhani, sans-serif" font-weight="700" font-size="14" letter-spacing="1">${k}</text>`; }).join("");
    return `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Stat radar: ${STAT_KEYS.map((k) => `${k} ${stats[k]}`).join(", ")}">
      ${rings}${axes}<polygon points="${poly}" fill="rgba(76,201,255,.22)" stroke="#4cc9ff" stroke-width="2" stroke-linejoin="round" style="filter:drop-shadow(0 0 6px rgba(76,201,255,.6))"/>${dots}${labels}</svg>`;
  }

  // ---------- Quests ----------
  function renderQuests(c) {
    const h = state.hunter;
    const today = todayKey();
    const first = h.firstStart || h.startDate;
    if (ui.date > today) ui.date = today;
    if (ui.date < first) ui.date = first;
    const date = ui.date;
    const isToday = date === today;
    const log = state.logs[date] || { q: {}, note: "", mood: 0, energy: 0 };
    const qs = questsForDate(date);
    const d = c.days[date] || { done: 0, total: qs.length, hasPenalty: false };
    const idx = diffDays(h.startDate, date) + 1;

    if (today < first) {
      return `<div class="window"><div class="empty">Your campaign begins on <b>${fmtDate(first)}</b>. Rest up, Hunter.</div></div>`;
    }

    const questHTML = qs.length ? qs.map((q) => {
      const v = log.q[q.id] || 0;
      const tgt = targetOf(q);
      const done = v >= tgt;
      const ratio = Math.min(1, v / tgt);
      const ctrl = q.type === "check"
        ? `<button class="check ${done ? "on" : ""}" data-action="toggle" data-id="${q.id}" aria-label="${done ? "Mark incomplete" : "Mark complete"}: ${esc(q.name)}">✓</button>`
        : `<div class="q-ctrl">
            <button class="icon-btn" data-action="dec" data-id="${q.id}" aria-label="Decrease ${esc(q.name)}">−</button>
            <span class="q-count"><input type="number" min="0" inputmode="decimal" value="${v}" data-action="set" data-id="${q.id}" aria-label="${esc(q.name)} progress" /> <span class="muted">/ ${q.target}</span></span>
            <button class="icon-btn" data-action="inc" data-id="${q.id}" aria-label="Increase ${esc(q.name)}">+</button>
            <button class="check ${done ? "on" : ""}" data-action="max" data-id="${q.id}" aria-label="Complete ${esc(q.name)}">✓</button>
          </div>`;
      return `<div class="quest ${done ? "done" : ""}">
        <div><div class="q-name">${esc(q.name)}${q.type === "count" ? ` <span class="muted" style="font-weight:400">[${v}/${q.target} ${esc(q.unit)}]</span>` : ""}</div>
          <div class="q-meta"><span class="tag">${q.stat}</span><span>${q.xp} XP</span>${done ? `<span style="color:var(--good)">COMPLETE</span>` : ""}</div></div>
        ${ctrl}
        ${q.type === "count" ? `<div class="q-bar"><div class="bar thin ${done ? "good" : ""}"><span style="width:${ratio * 100}%"></span></div></div>` : ""}
      </div>`;
    }).join("") : `<div class="empty">No daily quests configured. Add some in <a href="#" data-action="goto" data-view="system">System → Daily Quests</a>.</div>`;

    const penalty = d.hasPenalty ? `<section class="window danger">
        <div class="win-title"><h3>Penalty Quest</h3><span class="small" style="color:var(--bad)">${d.penaltyDone ? "COMPLETED" : isToday ? "−50 XP at midnight if ignored" : "FAILED — −50 XP"}</span></div>
        <p class="dim" style="margin-top:0">You failed to complete yesterday's Daily Quest. The System demands atonement.</p>
        <div class="quest ${d.penaltyDone ? "done" : ""}"><div><div class="q-name">${esc(state.penaltyQuest)}</div><div class="q-meta"><span>+30 XP · +10 Gold on completion</span></div></div>
          <button class="check ${d.penaltyDone ? "on" : ""}" data-action="penalty" aria-label="Toggle penalty quest">✓</button></div>
      </section>` : "";

    return `<div class="grid">
      <div class="spread">
        <div class="date-nav">
          <button class="icon-btn" data-action="date" data-delta="-1" ${date <= first ? "disabled" : ""} aria-label="Previous day">‹</button>
          <div class="date-label">${isToday ? "TODAY" : fmtDate(date, { weekday: "long" }).toUpperCase()} · ${fmtDate(date, { month: "short", day: "numeric" })}</div>
          <button class="icon-btn" data-action="date" data-delta="1" ${isToday ? "disabled" : ""} aria-label="Next day">›</button>
        </div>
        ${!isToday ? `<button class="btn ghost small" data-action="date-today">Jump to today</button>` : ""}
      </div>

      ${penalty}

      <section class="window">
        <div class="quest-head">
          <div class="muted mono small">[DAILY QUEST${idx >= 1 && idx <= CAMPAIGN_DAYS ? ` · DAY ${idx}/${CAMPAIGN_DAYS}` : ""}]</div>
          <h1>PREPARATION TO BECOME STRONG</h1>
          <div class="goal">Goals · ${d.done}/${d.total} complete</div>
          ${isToday ? `<div style="margin-top:6px"><span class="muted small">TIME REMAINING</span><div class="countdown" data-countdown></div></div>` : ""}
        </div>
        <div class="quest-list">${questHTML}</div>
        ${d.cleared ? `<div class="cleared-stamp">✦ QUEST CLEARED ✦</div>` : ""}
        <div class="reward-line small">
          <span>CLEAR REWARD: +${50 + Math.min(Math.max(c.streak - (d.cleared ? 1 : 0), 0), 10) * 5} XP</span>
          <span class="cost">+25 GOLD</span>
          <span>STREAK BONUS GROWS DAILY (MAX +50)</span>
        </div>
        ${!isToday && !d.cleared ? `<p class="muted small" style="text-align:center;margin-bottom:0">Logging a past day? Be honest — the System only works if you do.</p>` : ""}
      </section>

      <section class="window">
        <div class="win-title"><h3>Hunter's Log</h3><span class="muted small">Journaling raises the odds you stick with it</span></div>
        <div class="grid two">
          <div class="stack">
            <div class="spread"><span class="dim">Mood</span><div class="scale">${[1, 2, 3, 4, 5].map((n) => `<button class="${log.mood === n ? "on" : ""}" data-action="scale" data-field="mood" data-v="${n}">${n}</button>`).join("")}</div></div>
            <div class="spread"><span class="dim">Energy</span><div class="scale">${[1, 2, 3, 4, 5].map((n) => `<button class="${log.energy === n ? "on" : ""}" data-action="scale" data-field="energy" data-v="${n}">${n}</button>`).join("")}</div></div>
            <p class="muted small" style="margin:0">Prompts: What did I win today? What got in my way? What's the one thing for tomorrow?</p>
          </div>
          <textarea id="noteField" data-date="${date}" placeholder="Write your log...">${esc(log.note || "")}</textarea>
        </div>
      </section>
    </div>`;
  }

  // ---------- Gates ----------
  function renderGates(c) {
    const active = state.gates.filter((g) => !g.clearedAt);
    const cleared = state.gates.filter((g) => g.clearedAt);
    const rankColor = { E: "#9fb3d1", D: "#6ee7b7", C: "#4cc9ff", B: "#a78bfa", A: "#ffb547", S: "#ff5e7e" };
    const gateCard = (g) => {
      const objs = g.objectives || [];
      const doneN = objs.filter((o) => o.done).length;
      const canClear = objs.length === 0 || doneN === objs.length;
      const r = GATE_RANKS[g.rank];
      const dl = g.deadline ? diffDays(todayKey(), g.deadline) : null;
      return `<div class="gate ${g.clearedAt ? "cleared" : ""}">
        <div class="row" style="align-items:flex-start;flex-wrap:nowrap">
          <div class="gate-rank" style="color:${rankColor[g.rank]}">${g.rank}</div>
          <div style="flex:1;min-width:0">
            <div class="spread"><h3>${esc(g.name)}</h3><span class="small"><span class="mono">+${r.xp} XP</span> · <span class="cost">+${r.gold} G</span> · ${g.stat}</span></div>
            ${g.desc ? `<p class="dim small" style="margin:2px 0 0">${esc(g.desc)}</p>` : ""}
            <div class="muted small" style="margin-top:2px">${g.clearedAt ? `Cleared ${fmtDate(g.clearedAt)}` : dl === null ? "No deadline" : dl < 0 ? `<span style="color:var(--bad)">Overdue by ${-dl} day${dl === -1 ? "" : "s"}</span>` : dl === 0 ? `<span style="color:var(--warn)">Closes today</span>` : `Closes in ${dl} day${dl === 1 ? "" : "s"} (${fmtDate(g.deadline)})`}</div>
          </div>
        </div>
        ${objs.length ? `<div class="bar thin good"><span style="width:${(doneN / objs.length) * 100}%"></span></div>
          <div class="stack" style="gap:6px">${objs.map((o) => `<label class="objective ${o.done ? "done" : ""}"><input type="checkbox" ${o.done ? "checked" : ""} ${g.clearedAt ? "disabled" : ""} data-action="objective" data-gate="${g.id}" data-id="${o.id}"/><span>${esc(o.text)}</span></label>`).join("")}</div>` : ""}
        <div class="row">
          ${g.clearedAt ? `<button class="btn ghost small" data-action="gate-reopen" data-id="${g.id}">Reopen</button>`
            : `<button class="btn primary small" data-action="gate-clear" data-id="${g.id}" ${canClear ? "" : "disabled"}>Clear gate</button>`}
          <button class="btn ghost small" data-action="gate-delete" data-id="${g.id}">Delete</button>
        </div>
      </div>`;
    };

    return `<div class="grid">
      <section class="window">
        <div class="win-title"><h2>Gates</h2><span class="muted small">Big goals with big rewards</span></div>
        <p class="dim" style="margin-top:0">Daily quests build habits. <b>Gates</b> are milestones: run your first 5K, finish a book, ship a project, hit a weight. Break each into objectives, then clear it for a large XP and gold reward. Rank it honestly — an S-rank gate should scare you a little.</p>
        <div class="stack">${active.length ? active.map(gateCard).join("") : `<div class="empty">No gates open. Create one below — aim for one every 10-day phase.</div>`}</div>
      </section>

      <section class="window">
        <div class="win-title"><h3>Open a new gate</h3></div>
        <form id="gateForm" class="stack" autocomplete="off">
          <div class="form-grid">
            <label class="field" style="grid-column:span 2">Gate name<input type="text" name="name" required maxlength="80" placeholder="Run a 5K without stopping"/></label>
            <label class="field">Rank<select name="rank">${Object.keys(GATE_RANKS).map((r) => `<option value="${r}" ${r === "C" ? "selected" : ""}>${r}-Rank (+${GATE_RANKS[r].xp} XP)</option>`).join("")}</select></label>
            <label class="field">Stat<select name="stat">${STAT_KEYS.map((k) => `<option value="${k}">${k} — ${STATS[k].name}</option>`).join("")}</select></label>
            <label class="field">Deadline (optional)<input type="date" name="deadline"/></label>
          </div>
          <label class="field">Why it matters (optional)<input type="text" name="desc" maxlength="200" placeholder="Proves to myself I can do hard things"/></label>
          <label class="field">Objectives — one per line (optional)<textarea name="objectives" placeholder="Run 2K without stopping&#10;Run 3K without stopping&#10;Run 5K"></textarea></label>
          <div><button class="btn primary" type="submit">Open gate</button></div>
        </form>
      </section>

      ${cleared.length ? `<section class="window"><div class="win-title"><h3>Cleared gates</h3><span class="muted small">${cleared.length}</span></div><div class="stack">${cleared.map(gateCard).join("")}</div></section>` : ""}
    </div>`;
  }

  // ---------- Campaign ----------
  // Sequential single-hue ramp (cyan), light→dark reads as more complete on a dark surface.
  const heat = (pct) => pct <= 0 ? "rgba(3,8,20,.5)" : `rgba(76,201,255,${0.15 + pct * 0.7})`;

  function renderCampaign(c) {
    const h = state.hunter;
    const today = todayKey();
    const elapsed = clamp(c.dayIndex, 0, CAMPAIGN_DAYS);
    let cleared = 0, logged = 0;
    for (let i = 0; i < elapsed; i++) { const d = c.days[addDays(h.startDate, i)]; if (d) { if (d.cleared) cleared++; if (d.done > 0) logged++; } }
    const rate = elapsed ? Math.round((cleared / elapsed) * 100) : 0;

    const rows = PHASES.map((p, pi) => {
      const cells = Array.from({ length: 10 }, (_, j) => {
        const i = pi * 10 + j;
        const k = addDays(h.startDate, i);
        const d = c.days[k];
        const fut = k > today;
        const tip = fut ? `Day ${i + 1} · ${fmtDate(k)} · upcoming` : `Day ${i + 1} · ${fmtDate(k)} · ${d ? `${d.done}/${d.total} quests · ${d.xp >= 0 ? "+" : ""}${d.xp} XP` : "no data"}`;
        return `<button class="day-cell ${fut ? "future" : ""} ${k === today ? "today" : ""} ${d && d.cleared ? "cleared" : ""}" style="background:${fut ? "" : heat(d ? d.pct : 0)}" ${fut ? "disabled" : `data-action="open-day" data-date="${k}"`} data-tip="${esc(tip)}" aria-label="${esc(tip)}">${i + 1}</button>`;
      }).join("");
      const current = c.dayIndex >= pi * 10 + 1 && c.dayIndex <= pi * 10 + 10;
      return `<div class="phase-row"><div class="phase-label" style="${current ? "color:var(--glow)" : ""}">Phase ${pi + 1}: ${p.name}<small>DAYS ${pi * 10 + 1}–${pi * 10 + 10}</small></div><div class="day-cells">${cells}</div></div>`;
    }).join("");

    const phaseIdx = clamp(Math.ceil(c.dayIndex / 10), 1, 6) - 1;

    return `<div class="grid">
      <div class="grid three">
        <div class="window metric"><div class="m-val">${elapsed}<span class="muted small"> / ${CAMPAIGN_DAYS}</span></div><div class="m-lbl">Days elapsed</div></div>
        <div class="window metric"><div class="m-val">${rate}%</div><div class="m-lbl">Clear rate · ${cleared} cleared</div></div>
        <div class="window metric"><div class="m-val">${c.best}</div><div class="m-lbl">Best streak</div></div>
      </div>

      <section class="window">
        <div class="win-title"><h2>The ${CAMPAIGN_DAYS}-Day Trial</h2>
          <div class="legend">Less <i style="background:${heat(0)}"></i><i style="background:${heat(0.33)}"></i><i style="background:${heat(0.66)}"></i><i style="background:${heat(1)}"></i> More · ● cleared</div></div>
        ${c.dayIndex >= 1 && c.dayIndex <= CAMPAIGN_DAYS ? `<p class="dim" style="margin-top:0"><b style="color:var(--glow)">Phase ${phaseIdx + 1} — ${PHASES[phaseIdx].name}:</b> ${PHASES[phaseIdx].blurb}</p>` : ""}
        ${c.dayIndex > CAMPAIGN_DAYS ? `<p style="margin-top:0;color:var(--good)">The trial is complete. Look back at your vision — then start a new campaign from System to keep climbing.</p>` : ""}
        ${rows}
      </section>

      <section class="window chart">
        <div class="win-title"><h3>XP earned per day</h3><span class="muted small">Includes clear bonuses and penalties</span></div>
        ${xpChart(c)}
      </section>
    </div>`;
  }

  function xpChart(c) {
    const h = state.hunter;
    const today = todayKey();
    const n = CAMPAIGN_DAYS;
    const vals = Array.from({ length: n }, (_, i) => { const k = addDays(h.startDate, i); return { k, i, v: k <= today && c.days[k] ? c.days[k].xp : null }; });
    const maxV = Math.max(100, ...vals.map((d) => d.v || 0));
    const minV = Math.min(0, ...vals.map((d) => d.v || 0));
    const W = 720, H = 200, pl = 36, pr = 8, pt = 10, pb = 22;
    const iw = W - pl - pr, ih = H - pt - pb;
    const y = (v) => pt + ih * (1 - (v - minV) / (maxV - minV));
    const bw = iw / n;
    const ticks = [minV, 0, Math.round(maxV / 2), maxV].filter((v, i, a) => a.indexOf(v) === i);
    const grid = ticks.map((t) => `<line x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}" stroke="rgba(76,201,255,${t === 0 ? 0.35 : 0.1})"/><text x="${pl - 6}" y="${y(t)}" text-anchor="end" dominant-baseline="middle" fill="#62759a" font-size="10" font-family="JetBrains Mono, monospace">${t}</text>`).join("");
    const bars = vals.map((d) => {
      if (d.v === null) return "";
      const x = pl + d.i * bw + 1;
      const y0 = y(0), y1 = y(d.v);
      const top = Math.min(y0, y1), hgt = Math.max(1.5, Math.abs(y1 - y0));
      const fill = d.v < 0 ? "#ff4d6d" : "#4cc9ff";
      const tip = `Day ${d.i + 1} · ${fmtDate(d.k)} · ${d.v >= 0 ? "+" : ""}${d.v} XP`;
      return `<rect x="${x}" y="${top}" width="${Math.max(1, bw - 2)}" height="${hgt}" rx="2" fill="${fill}"/><rect x="${pl + d.i * bw}" y="${pt}" width="${bw}" height="${ih}" fill="transparent" data-tip="${esc(tip)}"/>`;
    }).join("");
    const xl = [1, 10, 20, 30, 40, 50, 60].map((dn) => `<text x="${pl + (dn - 0.5) * bw}" y="${H - 6}" text-anchor="middle" fill="#62759a" font-size="10" font-family="JetBrains Mono, monospace">${dn}</text>`).join("");
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Bar chart of XP earned each day of the campaign">${grid}${bars}${xl}</svg>`;
  }

  // ---------- Shop ----------
  function renderShop(c) {
    return `<div class="grid two">
      <section class="window">
        <div class="win-title"><h2>Reward Shop</h2><span class="cost" style="font-size:18px">${fmtNum(c.gold)} G</span></div>
        <p class="dim" style="margin-top:0">Gold is earned from quests (½ of quest XP), daily clears (+25), and gates. Spend it on real-life rewards you define. Earned rewards hit harder than impulse ones.</p>
        <div class="stack">
          ${state.rewards.length ? state.rewards.map((r) => `<div class="reward-item"><div><b>${esc(r.name)}</b><div class="cost small">${fmtNum(r.cost)} G</div></div>
            <div class="row"><button class="btn small" data-action="buy" data-id="${r.id}" ${c.gold >= r.cost ? "" : "disabled"}>Redeem</button><button class="icon-btn" data-action="reward-delete" data-id="${r.id}" aria-label="Delete reward">×</button></div></div>`).join("") : `<div class="empty">No rewards yet. Add one →</div>`}
        </div>
        <hr class="sep"/>
        <form id="rewardForm" class="row" autocomplete="off" style="align-items:flex-end">
          <label class="field" style="flex:2;min-width:180px">Reward<input type="text" name="name" required maxlength="80" placeholder="Movie night"/></label>
          <label class="field" style="flex:1;min-width:90px">Cost (G)<input type="number" name="cost" required min="1" value="100"/></label>
          <button class="btn primary" type="submit">Add</button>
        </form>
      </section>
      <section class="window">
        <div class="win-title"><h3>Redemption history</h3></div>
        ${state.purchases.length ? `<div class="stack">${state.purchases.slice().reverse().map((p, i) => `<div class="spread small"><span>${esc(p.name)} <span class="muted">· ${fmtDate(p.date)}</span></span><span class="row"><span class="cost">−${p.cost} G</span><button class="btn ghost small" data-action="refund" data-idx="${state.purchases.length - 1 - i}">Undo</button></span></div>`).join("")}</div>` : `<div class="empty">Nothing redeemed yet.</div>`}
      </section>
    </div>`;
  }

  // ---------- System (settings) ----------
  function renderSystem(c) {
    const h = state.hunter;
    const active = state.quests.filter((q) => !q.archivedAt);
    const archived = state.quests.filter((q) => q.archivedAt);
    const eq = ui.editingQuest ? state.quests.find((q) => q.id === ui.editingQuest) : null;
    const qRow = (q) => `<div class="q-edit-row ${q.archivedAt ? "archived" : ""}">
        <div><b>${esc(q.name)}</b>${q.type === "count" ? ` <span class="muted">— ${q.target} ${esc(q.unit)}</span>` : ""}<div class="small muted">${q.stat} · ${q.xp} XP · since ${fmtDate(q.createdAt)}${q.archivedAt ? ` · retired ${fmtDate(q.archivedAt)}` : ""}</div></div>
        <div class="row">${q.archivedAt ? `<button class="btn ghost small" data-action="q-restore" data-id="${q.id}">Restore</button>`
          : `<button class="btn ghost small" data-action="q-edit" data-id="${q.id}">Edit</button><button class="btn ghost small" data-action="q-archive" data-id="${q.id}">Retire</button>`}</div>
      </div>`;

    return `<div class="grid">
      <div class="grid two">
        <section class="window">
          <div class="win-title"><h2>Daily Quests</h2><span class="muted small">${active.length} active</span></div>
          <p class="dim small" style="margin-top:0">Retiring a quest removes it from today onward but keeps the XP you already earned from it.</p>
          <div class="stack">${active.map(qRow).join("") || `<div class="empty">No active quests.</div>`}</div>
          ${archived.length ? `<details style="margin-top:12px"><summary class="muted small" style="cursor:pointer">Retired quests (${archived.length})</summary><div class="stack" style="margin-top:8px">${archived.map(qRow).join("")}</div></details>` : ""}
        </section>

        <section class="window">
          <div class="win-title"><h3>${eq ? "Edit quest" : "Add a quest"}</h3>${eq ? `<button class="btn ghost small" data-action="q-cancel">Cancel</button>` : ""}</div>
          <form id="questForm" class="stack" autocomplete="off">
            <label class="field">Quest<input type="text" name="name" required maxlength="80" value="${esc(eq ? eq.name : "")}" placeholder="e.g. Practice guitar"/></label>
            <div class="form-grid">
              <label class="field">Stat<select name="stat">${STAT_KEYS.map((k) => `<option value="${k}" ${eq && eq.stat === k ? "selected" : ""}>${k} — ${STATS[k].name}</option>`).join("")}</select></label>
              <label class="field">Type<select name="type"><option value="check" ${eq && eq.type === "check" ? "selected" : ""}>Checkbox (done / not done)</option><option value="count" ${eq && eq.type === "count" ? "selected" : ""}>Counter (reach a target)</option></select></label>
              <label class="field">Target (counter)<input type="number" name="target" min="1" step="any" value="${eq ? eq.target : 10}"/></label>
              <label class="field">Unit (counter)<input type="text" name="unit" maxlength="16" value="${esc(eq ? eq.unit : "min")}"/></label>
              <label class="field">XP reward<input type="number" name="xp" min="5" max="100" value="${eq ? eq.xp : 20}"/></label>
            </div>
            <p class="muted small" style="margin:0">Guide: 10–15 XP easy · 20–25 medium · 30–40 hard. Default quest XP sums to ~170/day.</p>
            <div><button class="btn primary" type="submit">${eq ? "Save quest" : "Add quest"}</button></div>
          </form>
          <hr class="sep"/>
          <form id="penaltyForm" class="stack" autocomplete="off">
            <label class="field">Penalty quest (assigned the day after you miss a full clear)<input type="text" name="penalty" maxlength="120" value="${esc(state.penaltyQuest)}"/></label>
            <div><button class="btn small" type="submit">Save penalty</button></div>
          </form>
        </section>
      </div>

      <div class="grid two">
        <section class="window">
          <div class="win-title"><h3>Profile</h3></div>
          <form id="profileForm" class="stack" autocomplete="off">
            <label class="field">Hunter name<input type="text" name="name" required maxlength="40" value="${esc(h.name)}"/></label>
            <label class="field">Day-60 vision<textarea name="vision" maxlength="600">${esc(h.vision)}</textarea></label>
            <div><button class="btn primary" type="submit">Save profile</button></div>
          </form>
        </section>

        <section class="window">
          <div class="win-title"><h3>Data</h3></div>
          <p class="dim small" style="margin-top:0">Progress is stored only in this browser. Export a backup regularly, and import it on another device to continue there.</p>
          <div class="row">
            <button class="btn" data-action="export">Export backup</button>
            <label class="btn ghost" style="cursor:pointer">Import backup<input type="file" accept="application/json,.json" id="importFile" hidden/></label>
          </div>
          <hr class="sep"/>
          <p class="dim small" style="margin-top:0">Campaign started ${fmtDate(h.startDate, { month: "long", day: "numeric", year: "numeric" })}. Starting a new ${CAMPAIGN_DAYS}-day campaign keeps your level, stats, titles and gold.</p>
          <div class="row">
            <button class="btn" data-action="new-campaign">Start new campaign</button>
            <button class="btn danger" data-action="reset">Erase everything</button>
          </div>
        </section>
      </div>
    </div>`;
  }

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------
  function setProgress(qid, value) {
    const q = state.quests.find((x) => x.id === qid);
    if (!q) return;
    const log = getLog(ui.date);
    const before = log.q[qid] || 0;
    const tgt = targetOf(q);
    const v = Math.max(0, Math.round(Number(value) * 100) / 100 || 0);
    log.q[qid] = q.type === "check" ? (v >= 1 ? 1 : 0) : v;
    if (before < tgt && log.q[qid] >= tgt) toast("Quest complete", `${q.name} · +${q.xp} XP (${q.stat})`);
    save();
    render();
  }

  function onClick(e) {
    const t = e.target.closest("[data-action],[data-view]");
    if (!t) return;
    if (t.matches("#tabs button")) { ui.view = t.dataset.view; ui.date = todayKey(); render(); window.scrollTo(0, 0); return; }
    const a = t.dataset.action;
    if (!a || t.tagName === "INPUT" && (a === "set" || a === "objective")) return;
    const id = t.dataset.id;
    switch (a) {
      case "close-modal": closeModal(); break;
      case "goto": e.preventDefault(); ui.view = t.dataset.view; render(); window.scrollTo(0, 0); break;
      case "equip": state.hunter.title = id; save(); render(); toast("Title equipped", achvById(id).name, "gold"); break;
      case "toggle": { const v = (getLog(ui.date).q[id] || 0) ? 0 : 1; setProgress(id, v); break; }
      case "inc": case "dec": {
        const q = state.quests.find((x) => x.id === id);
        const cur = getLog(ui.date).q[id] || 0;
        setProgress(id, Math.max(0, cur + (a === "inc" ? stepFor(q) : -stepFor(q))));
        break;
      }
      case "max": {
        const q = state.quests.find((x) => x.id === id);
        const cur = getLog(ui.date).q[id] || 0;
        setProgress(id, cur >= q.target ? 0 : q.target);
        break;
      }
      case "penalty": { const log = getLog(ui.date); log.penalty = !log.penalty; save(); if (log.penalty) toast("Penalty cleared", "+30 XP · +10 Gold. Atonement accepted.", "gold"); render(); break; }
      case "scale": { const log = getLog(ui.date); const f = t.dataset.field; const v = Number(t.dataset.v); log[f] = log[f] === v ? 0 : v; save(); render(); break; }
      case "date": ui.date = addDays(ui.date, Number(t.dataset.delta)); render(); break;
      case "date-today": ui.date = todayKey(); render(); break;
      case "open-day": ui.date = t.dataset.date; ui.view = "quests"; render(); window.scrollTo(0, 0); break;
      case "gate-clear": {
        const g = state.gates.find((x) => x.id === id); g.clearedAt = todayKey(); save();
        showModal(`<div class="muted small mono">[SYSTEM]</div><h1 style="font-size:26px">GATE CLEARED</h1><p class="dim">${esc(g.name)}</p>
          <div class="reward-line"><span>+${GATE_RANKS[g.rank].xp} XP</span><span class="cost">+${GATE_RANKS[g.rank].gold} GOLD</span><span>${g.stat} UP</span></div>`);
        render(); break;
      }
      case "gate-reopen": { const g = state.gates.find((x) => x.id === id); g.clearedAt = null; save(); render(); break; }
      case "gate-delete": if (confirm("Delete this gate? Any XP it gave will be removed.")) { state.gates = state.gates.filter((x) => x.id !== id); save(); render(); } break;
      case "buy": {
        const r = state.rewards.find((x) => x.id === id);
        if (compute().gold < r.cost) return;
        state.purchases.push({ rewardId: r.id, name: r.name, cost: r.cost, date: todayKey() }); save();
        toast("Reward redeemed", `${r.name} — enjoy it. You earned it.`, "gold"); render(); break;
      }
      case "refund": state.purchases.splice(Number(t.dataset.idx), 1); save(); render(); break;
      case "reward-delete": state.rewards = state.rewards.filter((x) => x.id !== id); save(); render(); break;
      case "q-edit": ui.editingQuest = id; render(); $("#questForm input[name=name]").focus(); break;
      case "q-cancel": ui.editingQuest = null; render(); break;
      case "q-archive": {
        const q = state.quests.find((x) => x.id === id);
        // Retire from today; if created today, remove entirely.
        if (q.createdAt >= todayKey()) state.quests = state.quests.filter((x) => x.id !== id);
        else q.archivedAt = todayKey();
        save(); render(); break;
      }
      case "q-restore": { const q = state.quests.find((x) => x.id === id); q.archivedAt = null; save(); render(); break; }
      case "export": exportData(); break;
      case "new-campaign":
        if (confirm(`Start a new ${CAMPAIGN_DAYS}-day campaign today? Your level, stats, titles, and gold carry over.`)) {
          state.hunter.startDate = todayKey(); save(); ui.view = "status"; render();
          toast("New campaign", `Day 1 of ${CAMPAIGN_DAYS}. Arise again.`);
        }
        break;
      case "reset":
        if (confirm("Erase ALL progress? This cannot be undone. (Export a backup first if unsure.)") && confirm("Really erase everything?")) {
          localStorage.removeItem(STORAGE_KEY); state = defaultState(); ui = { view: "status", date: todayKey() }; render();
        }
        break;
    }
  }

  function onChange(e) {
    const t = e.target;
    if (t.dataset.action === "set") setProgress(t.dataset.id, t.value);
    else if (t.dataset.action === "objective") {
      const g = state.gates.find((x) => x.id === t.dataset.gate);
      const o = g.objectives.find((x) => x.id === t.dataset.id);
      o.done = t.checked; save(); render();
    } else if (t.id === "importFile" && t.files[0]) importData(t.files[0]);
  }

  let noteTimer = null;
  function onInput(e) {
    const t = e.target;
    if (t.id === "noteField") {
      const date = t.dataset.date;
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => { getLog(date).note = t.value; save(); }, 300);
    }
  }

  function onSubmit(e) {
    const f = e.target;
    e.preventDefault();
    const fd = new FormData(f);
    switch (f.id) {
      case "onboardForm": completeOnboarding(f); break;
      case "gateForm": {
        const objectives = String(fd.get("objectives") || "").split("\n").map((s) => s.trim()).filter(Boolean).map((text) => ({ id: uid(), text, done: false }));
        state.gates.push({ id: uid(), name: String(fd.get("name")).trim(), desc: String(fd.get("desc") || "").trim(), rank: fd.get("rank"), stat: fd.get("stat"), deadline: fd.get("deadline") || null, objectives, createdAt: todayKey(), clearedAt: null });
        save(); toast("Gate opened", `${fd.get("rank")}-Rank gate detected: ${fd.get("name")}`); render(); break;
      }
      case "rewardForm":
        state.rewards.push({ id: uid(), name: String(fd.get("name")).trim(), cost: Math.max(1, Math.round(Number(fd.get("cost")) || 1)) });
        save(); render(); break;
      case "questForm": {
        const data = {
          name: String(fd.get("name")).trim(), stat: fd.get("stat"), type: fd.get("type"),
          target: Math.max(1, Number(fd.get("target")) || 1), unit: String(fd.get("unit") || "").trim(),
          xp: clamp(Math.round(Number(fd.get("xp")) || 20), 5, 100),
        };
        if (data.type === "check") data.target = 1;
        if (ui.editingQuest) {
          Object.assign(state.quests.find((q) => q.id === ui.editingQuest), data);
          ui.editingQuest = null; toast("Quest updated", data.name);
        } else {
          state.quests.push({ id: uid(), ...data, createdAt: todayKey(), archivedAt: null });
          toast("New daily quest", `${data.name} · ${data.xp} XP`);
        }
        save(); render(); break;
      }
      case "penaltyForm": state.penaltyQuest = String(fd.get("penalty")).trim() || state.penaltyQuest; save(); toast("Penalty updated", state.penaltyQuest, "bad"); render(); break;
      case "profileForm": state.hunter.name = String(fd.get("name")).trim() || state.hunter.name; state.hunter.vision = String(fd.get("vision") || "").trim(); save(); toast("Profile saved", ""); render(); break;
    }
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `solo-level-up-backup-${todayKey()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("Backup exported", a.download);
  }
  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !data.hunter || !Array.isArray(data.quests) || typeof data.logs !== "object") throw new Error("Not a Solo Level Up backup");
        if (!confirm("Replace your current progress with this backup?")) return;
        state = Object.assign(defaultState(), data);
        save(); ui.view = "status"; render(); toast("Backup restored", `Welcome back, ${state.hunter.name}.`);
      } catch (err) { toast("Import failed", err.message, "bad"); }
    };
    reader.readAsText(file);
  }

  // ------------------------------------------------------------------
  // Countdown, day rollover, tooltips
  // ------------------------------------------------------------------
  let lastDay = todayKey();
  function tickCountdown() {
    const now = new Date();
    const mid = new Date(now); mid.setHours(24, 0, 0, 0);
    const s = Math.max(0, Math.floor((mid - now) / 1000));
    const txt = `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
    document.querySelectorAll("[data-countdown]").forEach((el) => (el.textContent = txt));
    if (todayKey() !== lastDay) { // midnight passed while the app was open
      if (ui.date === lastDay) ui.date = todayKey();
      lastDay = todayKey();
      if (!document.activeElement || document.activeElement.id !== "noteField") render();
    }
  }

  const tip = $("#tooltip");
  document.addEventListener("pointerover", (e) => {
    const t = e.target.closest("[data-tip]");
    if (!t) { tip.hidden = true; return; }
    tip.textContent = t.getAttribute("data-tip"); tip.hidden = false;
  });
  document.addEventListener("pointermove", (e) => {
    if (tip.hidden) return;
    const w = tip.offsetWidth;
    tip.style.left = clamp(e.clientX + 12, 8, window.innerWidth - w - 8) + "px";
    tip.style.top = e.clientY + 16 + "px";
  });

  document.addEventListener("click", onClick);
  document.addEventListener("change", onChange);
  document.addEventListener("input", onInput);
  document.addEventListener("submit", onSubmit);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#modal").hidden) closeModal(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tickCountdown(); });
  setInterval(tickCountdown, 1000);

  render();
})();

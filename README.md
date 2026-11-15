# ▲ Solo Level Up

A 60-day, in-browser daily tracker that turns self-improvement into an RPG. You're the Player. The System hands you a **Daily Quest** every day. Clear it to earn XP, raise your stats, rank up from E to S, and become the person in your Day-60 vision.

No accounts, no server, no build step. Open `index.html` and play.

## Run it

- **Locally:** open `index.html` in any modern browser.
- **Hosted:** turn on GitHub Pages (Settings → Pages → deploy from branch, root) to use it on your phone.

Progress is saved in your browser's `localStorage`. Use **System → Export backup** often, and **Import** it to move to another device.

## How the game works

| Mechanic | What it does |
|---|---|
| **Daily Quests** | Your habits. Checkbox quests (sleep 7h) or counter quests (50 push-ups, 20 pages). Each one gives XP to one stat. Partial progress on a counter quest earns partial XP. |
| **Full clear bonus** | Finish every quest in a day for +50 XP and +25 gold. The bonus goes up by 5 XP for each day in your streak, up to +100 total. |
| **Penalty Quest** | If you miss a full clear, the next day brings a penalty quest. Do it for +30 XP (Redemption). Ignore it and you lose 50 XP at midnight. |
| **Stats** | STR · VIT · AGI · INT · PER · CHA. Each starts at 10 and gains 1 point per 40 XP earned in that area. A radar chart shows your build. |
| **Levels & Ranks** | Level *L → L+1* costs `40 + 8·(L−1)` XP. The ranks are E (1), D (8), C (16), B (25), A (35) and S (45). Reaching S takes about 70% consistency over the 60 days. |
| **Gates** | Big goals broken into objectives, ranked E–S (+100 to +1200 XP). Aim to clear one in each 10-day phase. |
| **The 60-Day Trial** | Six 10-day phases (Awakening → Foundation → Momentum → The Trial → Ascension → Transcendence). A heatmap of every day and a chart of XP per day. |
| **Titles** | 20 achievements (streaks, gates, ranks, journaling). You can equip one as your title. |
| **Reward Shop** | Earn gold, then spend it on real-life rewards you set yourself. |
| **Hunter's Log** | A daily journal with 1–5 ratings for mood and energy. |

XP and gold are always recalculated from your daily logs, so ticking and unticking a quest can never give XP twice. When you retire a quest, you keep the XP it already earned you.

## Files

- `index.html`: the page layout
- `styles.css`: the "System window" theme (works on desktop and phones)
- `app.js`: game logic, rendering and saving

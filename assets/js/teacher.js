// Общий код страниц учителя: uchitel.html, uchitel-raspisanie.html, uchitel-profil.html
import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

// страницы только для учителя; настоящая защита данных — в правилах Firestore
export const ADMIN_EMAIL = "фия.учитель@meridian.local";

const CALENDAR_ID = "027d9547736afe5b445e10c3f039e99e46481562e9063146a0d075658348772e@group.calendar.google.com";
const CALENDAR_API_KEY = "AIzaSyCybGpL9j3nX5O2Moi-Ao-3whgs48rBi-k";

export const SUBJECTS = [
  ["english", "Английский"],
  ["math", "Математика"],
  ["physics", "Физика"],
  ["chemistry", "Химия"],
];
export const DAY_ABBR = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"];
export const DAY_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS_GENITIVE = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];

export const esc = (t) => String(t).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
export const norm = (t) => (t || "").normalize("NFC").trim().toLowerCase();
export const fmtTime = (d) => d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
export function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

export function getWeekStart(offset) {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
  monday.setDate(monday.getDate() + offset * 7);
  return monday;
}

export function isoWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round((d - firstThursday) / (7 * 86400000));
}

export function formatWeekRange(monday, saturday) {
  const from = monday.getDate(), to = saturday.getDate();
  if (monday.getMonth() === saturday.getMonth()) return `${from}–${to} ${MONTHS_GENITIVE[saturday.getMonth()]}`;
  return `${from} ${MONTHS_GENITIVE[monday.getMonth()]} – ${to} ${MONTHS_GENITIVE[saturday.getMonth()]}`;
}

// предметы в календаре можно писать по-русски или по-английски: "Математика", "math", "Math"
const SUBJECT_ALIASES = {
  english: ["english", "английский", "английский язык"],
  math: ["math", "maths", "mathematics", "математика"],
  physics: ["physics", "физика"],
  chemistry: ["chemistry", "химия"],
};
const SUBJECT_RU = Object.fromEntries(SUBJECTS);
function subjectIdFromText(text) {
  const t = norm(text);
  return Object.keys(SUBJECT_ALIASES).find(id => SUBJECT_ALIASES[id].includes(t)) || null;
}
function subjectDisplay(text) {
  const id = subjectIdFromText(text);
  return id ? SUBJECT_RU[id] : (text || "").trim();
}

function safeMeetUrl(ev) {
  const fromConf = ev.conferenceData && Array.isArray(ev.conferenceData.entryPoints)
    ? (ev.conferenceData.entryPoints.find(p => p.entryPointType === "video") || {}).uri
    : null;
  const url = ev.hangoutLink || fromConf || null;
  return url && /^https:\/\//i.test(url) ? url : null;
}

// все уроки из календаря за период; названия событий — "Имя Ф. - Предмет"
export async function fetchLessons(timeMin, timeMax) {
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`);
  url.searchParams.set("key", CALENDAR_API_KEY);
  url.searchParams.set("timeMin", timeMin.toISOString());
  url.searchParams.set("timeMax", timeMax.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "250");

  let events;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Calendar API ${res.status}`);
    events = (await res.json()).items || [];
  } catch (e) {
    console.warn("Не удалось получить расписание из календаря:", e);
    return [];
  }

  const lessons = [];
  for (const ev of events) {
    if (!ev.summary || !ev.start || !ev.start.dateTime) continue;
    const start = new Date(ev.start.dateTime);
    const end = ev.end && ev.end.dateTime ? new Date(ev.end.dateTime) : new Date(start.getTime() + 3600000);
    const dayIndex = (start.getDay() + 6) % 7;
    if (dayIndex === 6) continue; // по воскресеньям уроков нет
    const parts = ev.summary.split(" - ");
    lessons.push({
      start,
      end,
      dayIndex,
      student: (parts[0] || ev.summary).trim(),
      subject: parts.length > 1 ? subjectDisplay(parts.slice(1).join(" - ")) : "",
      duration: `${Math.round((end - start) / 60000)} мин`,
      joinUrl: safeMeetUrl(ev),
    });
  }
  lessons.sort((a, b) => a.start - b.start);
  return lessons;
}

// проверка входа + общая обвязка страницы; onReady вызывается, когда вошла именно учительница
export function initTeacherPage(onReady) {
  const logout = document.getElementById("logoutBtn");
  if (logout) logout.addEventListener("click", () => { if (window.meridianLogout) window.meridianLogout(); });

  onAuthStateChanged(auth, async (user) => {
    if (!user) return; // auth-guard.js отправит на login.html

    if ((user.email || "").toLowerCase() !== ADMIN_EMAIL) {
      window.location.replace("kabinet.html");
      return;
    }
    const gate = document.getElementById("adminGate");
    if (gate) gate.remove();

    document.getElementById("avatarCircle").textContent = "Ф";
    try {
      const saved = localStorage.getItem(`meridian_avatar_${user.email || ""}`);
      if (saved) document.getElementById("avatarCircle").innerHTML = `<img src="assets/avatars/${saved}" alt="">`;
    } catch (e) {}

    // статус в боковой карточке: сколько уроков ещё сегодня
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    fetchLessons(now, endOfDay).then(list => {
      const left = list.filter(l => l.end > now).length;
      if (left) {
        document.getElementById("sideStatus").style.display = "flex";
        document.getElementById("sideStatusText").textContent = `Сегодня ещё уроков: ${left}`;
      }
    });

    await onReady(user);
  });
}

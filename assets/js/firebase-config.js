// assets/js/firebase-config.js
//
// Вставь сюда свои значения из Firebase Console:
// Project settings (шестерёнка) → General → Your apps → SDK setup and configuration
//
// Это ПУБЛИЧНЫЕ идентификаторы проекта — не пароли, класть их в открытый
// JS-файл на GitHub Pages нормально и безопасно.
 
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
 
const firebaseConfig = {
  apiKey: "AIzaSyDB9lrZqZf_qoTDfwnrRuTTnj8zjcElZuM",
  authDomain: "meridian-school-e4a4c.firebaseapp.com",
  projectId: "meridian-school-e4a4c",
  storageBucket: "meridian-school-e4a4c.firebasestorage.app",
  messagingSenderId: "580960294344",
  appId: "1:580960294344:web:1f65ba60404dce5e29cfd"
};
 
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

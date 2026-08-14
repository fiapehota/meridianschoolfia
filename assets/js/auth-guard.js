// assets/js/auth-guard.js
//
// Подключи этот файл на КАЖДОЙ странице, которую нужно закрыть логином:
//   <script type="module" src="assets/js/auth-guard.js"></script>
//
// Пока идёт проверка — страница скрыта (см. CSS ниже), чтобы контент
// не "мигал" на экране до входа.
 
import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
 
// прячем страницу, пока не знаем, вошёл человек или нет
const style = document.createElement("style");
style.textContent = "body{visibility:hidden;}";
document.head.appendChild(style);
 
onAuthStateChanged(auth, (user) => {
  if (user) {
    // вошёл — показываем страницу
    style.remove();
  } else {
    // не вошёл — отправляем на страницу логина,
    // запоминая, куда вернуться после входа
    const here = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`login.html?next=${here}`);
  }
});
 
// необязательно: вызвать logout() из консоли или повесить на кнопку "Iziet"
window.meridianLogout = () => signOut(auth).then(() => window.location.replace("login.html"));

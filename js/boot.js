// 共用的自主檢查表畫面（js/pages/self-check.js）用 registerPage 註冊
// 【資安】原本寫在 index.html 的內嵌 <script>，移到獨立檔案，才能用 CSP 禁止所有內嵌程式碼
window.PAGES = {};
function registerPage(id, def) { window.PAGES[id] = def; }

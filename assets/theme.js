document.addEventListener("DOMContentLoaded", () => {
  // 共通ヘッダーのメニュー（<details>）：Esc で閉じてメニューのボタンへフォーカスを戻し、メニューの外を押したら閉じる
  document.querySelectorAll(".sh-menu").forEach((menu) => {
    menu.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.open) {
        menu.open = false;
        menu.querySelector("summary").focus();
      }
    });
    document.addEventListener("click", (e) => {
      if (menu.open && !menu.contains(e.target)) menu.open = false;
    });
  });

  const toggle = document.querySelector("[data-theme-toggle]");
  if (!toggle) return;
  // ダークモードかどうかをボタンの状態（aria-pressed）にも反映する
  const reflect = () => toggle.setAttribute("aria-pressed", document.documentElement.getAttribute("data-theme") === "dark" ? "true" : "false");
  reflect();

  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    reflect();
    try {
      localStorage.setItem("theme", next);
    } catch {
      // localStorageが使えない環境では永続化しないだけで動作は継続する
    }
  });
});

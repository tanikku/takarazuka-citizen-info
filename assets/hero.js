// トップのメインビジュアル（正式A案）。写真は自動では切り替えず、点のボタンとキーボードの左右キーでだけ切り替える。
// JavaScript が動かない環境でも、横スクロールで全部の写真を見られる。
(() => {
  const track = document.getElementById("ah-hero-track");
  const dots = [...document.querySelectorAll("[data-hero-slide]")];
  if (!track || dots.length === 0) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const current = () => Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
  const go = (i) => {
    const n = Math.max(0, Math.min(dots.length - 1, i));
    track.scrollTo({ left: n * track.clientWidth, behavior: reduce ? "auto" : "smooth" });
  };
  const sync = () => {
    const i = current();
    dots.forEach((b, j) => b.setAttribute("aria-current", j === i ? "true" : "false"));
  };
  dots.forEach((b) => b.addEventListener("click", () => go(Number(b.dataset.heroSlide))));
  track.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      go(current() + (e.key === "ArrowRight" ? 1 : -1));
    }
  });
  let timer = 0;
  track.addEventListener("scroll", () => {
    clearTimeout(timer);
    timer = setTimeout(sync, 80);
  }, { passive: true });
})();

// 「宝塚の実力。」第1弾：ファーストビューの街の名前を選ぶと、主要3指標がその街の数字に切り替わる。
// 数字はページの HTML（data-*）に、data/jitsuryoku/zeishu-shigoto.json から書き出したものだけを使う。
// JavaScript が動かないときは、HTML の宝塚市の数字がそのまま見える（街の名前もただの文字のまま）。
(function () {
  var list = document.querySelector(".jf-chips");
  var stats = document.querySelectorAll(".jf-stat[data-stat]");
  var status = document.querySelector(".jf-sr");
  var hint = document.querySelector(".jf-hint");
  if (!list || stats.length === 0) return;

  var items = list.querySelectorAll("li[data-city]");
  var labels = { ind: "個人市民税の割合", dn: "昼夜間人口比率", med: "医療・福祉の割合" };

  function show(item, announce) {
    for (var i = 0; i < items.length; i++) {
      var on = items[i] === item;
      items[i].classList.toggle("is-selected", on);
      items[i].firstChild.setAttribute("aria-pressed", on ? "true" : "false");
    }
    var city = item.firstChild.textContent;
    var parts = [];
    for (var j = 0; j < stats.length; j++) {
      var key = stats[j].getAttribute("data-stat");
      var value = item.getAttribute("data-" + key);
      stats[j].querySelector(".jf-stat__city").textContent = city;
      stats[j].querySelector(".jf-stat__num").textContent = value;
      parts.push(labels[key] + " " + value);
    }
    if (announce && status) status.textContent = city + "の数字を表示しました。" + parts.join("、") + "。";
  }

  for (var k = 0; k < items.length; k++) {
    (function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "jf-chip";
      button.textContent = item.textContent;
      button.setAttribute("aria-pressed", item.classList.contains("is-selected") ? "true" : "false");
      button.addEventListener("click", function () { show(item, true); });
      item.textContent = "";
      item.appendChild(button);
    })(items[k]);
  }
  if (hint) hint.hidden = false;
})();

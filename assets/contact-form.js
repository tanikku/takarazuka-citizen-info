document.getElementById("contact-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const statusEl = document.getElementById("contact-form-status");
  const submitBtn = form.querySelector('button[type="submit"]');
  const turnstileToken = form.querySelector('[name="cf-turnstile-response"]')?.value;

  if (!turnstileToken) {
    statusEl.textContent = "認証が完了していません。少し待ってから再度お試しください。";
    return;
  }

  const payload = {
    name: form.name.value,
    email: form.email.value,
    category: form.category.value,
    subject: form.subject.value,
    message: form.message.value,
    turnstileToken,
  };

  submitBtn.disabled = true;
  statusEl.textContent = "送信中...";

  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({ ok: false }));

    if (res.ok && json.ok) {
      form.hidden = true;
      statusEl.textContent = "お問い合わせを受け付けました。";
    } else {
      statusEl.textContent = json.error || "送信に失敗しました。しばらくしてから再度お試しください。";
      submitBtn.disabled = false;
    }
  } catch {
    statusEl.textContent = "送信に失敗しました。しばらくしてから再度お試しください。";
    submitBtn.disabled = false;
  }
});

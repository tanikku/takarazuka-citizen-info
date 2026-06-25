// お問い合わせフォームの送信を受け取るCloudflare Pages Function。
// Turnstileでスパム対策、Resend経由でCONTACT_NOTIFY_EMAILへ通知メールを送る。
// 送信内容・送信元IPはどこにも保存しない（このリクエスト処理のみで完結する）。

const ALLOWED_CATEGORIES = ["記事内容の訂正・削除依頼", "情報提供", "PR・広告掲載の相談", "その他"];
const MAX_LENGTHS = { name: 100, email: 200, subject: 200, message: 2000 };

function stripHtml(value) {
  return String(value).replace(/<[^>]*>/g, "");
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "送信内容を読み取れませんでした。" }, { status: 400 });
  }

  const { name, email, category, subject, message, turnstileToken } = body ?? {};

  if (
    !name || typeof name !== "string" || name.length === 0 || name.length > MAX_LENGTHS.name ||
    !email || typeof email !== "string" || email.length > MAX_LENGTHS.email || !isValidEmail(email) ||
    !ALLOWED_CATEGORIES.includes(category) ||
    !subject || typeof subject !== "string" || subject.length === 0 || subject.length > MAX_LENGTHS.subject ||
    !message || typeof message !== "string" || message.length === 0 || message.length > MAX_LENGTHS.message ||
    !turnstileToken || typeof turnstileToken !== "string"
  ) {
    return Response.json({ ok: false, error: "入力内容をご確認ください。" }, { status: 400 });
  }

  const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY,
      response: turnstileToken,
      remoteip: request.headers.get("CF-Connecting-IP") ?? "",
    }),
  });
  const verifyJson = await verifyRes.json().catch(() => ({ success: false }));
  if (!verifyJson.success) {
    return Response.json({ ok: false, error: "認証に失敗しました。もう一度お試しください。" }, { status: 400 });
  }

  const safe = {
    name: stripHtml(name).slice(0, MAX_LENGTHS.name),
    email: stripHtml(email).slice(0, MAX_LENGTHS.email),
    category: stripHtml(category),
    subject: stripHtml(subject).slice(0, MAX_LENGTHS.subject),
    message: stripHtml(message).slice(0, MAX_LENGTHS.message),
  };

  const emailText = [
    `お問い合わせ種別：${safe.category}`,
    `件名：${safe.subject}`,
    `お名前・団体名：${safe.name}`,
    `メールアドレス：${safe.email}`,
    "",
    "--- 内容 ---",
    safe.message,
  ].join("\n");

  const sendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM_EMAIL,
      to: env.CONTACT_NOTIFY_EMAIL,
      reply_to: safe.email,
      subject: `[宝塚Today お問い合わせ] ${safe.category}：${safe.subject}`,
      text: emailText,
    }),
  });

  if (!sendRes.ok) {
    return Response.json({ ok: false, error: "送信に失敗しました。しばらくしてから再度お試しください。" }, { status: 502 });
  }

  return Response.json({ ok: true });
}

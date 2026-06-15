/**
 * Отправка email через Resend API
 * https://resend.com/docs/api-reference/emails/send-email
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@ai-nastoika.ru";
const SITE_URL = process.env.SITE_URL || "https://dev.ai-nastoika.ru";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set, skipping email to", to);
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `AI Настойка <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[email] Resend error:", res.status, err);
      return false;
    }

    console.log("[email] Sent to", to);
    return true;
  } catch (err) {
    console.error("[email] Failed:", err);
    return false;
  }
}

export async function sendVerificationEmail(to: string, token: string): Promise<boolean> {
  const link = `${SITE_URL}/#/verify-email?token=${token}`;

  return sendEmail({
    to,
    subject: "Подтвердите вашу почту — AI Настойка",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h1 style="font-size: 24px; color: #1a1a1a; margin-bottom: 16px;">🍹 AI Настойка</h1>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          Здравствуйте! Подтвердите вашу электронную почту, нажав на кнопку ниже:
        </p>
        <a href="${link}" style="display: inline-block; margin: 24px 0; padding: 14px 32px; background: #8B4513; color: #fff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
          Подтвердить email
        </a>
        <p style="font-size: 14px; color: #888; line-height: 1.5;">
          Или скопируйте ссылку: <br/>${link}
        </p>
        <p style="font-size: 13px; color: #aaa; margin-top: 32px;">
          Ссылка действительна 24 часа. Если вы не регистрировались — просто проигнорируйте это письмо.
        </p>
      </div>
    `,
  });
}

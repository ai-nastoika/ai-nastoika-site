/**
 * Отправка SMS через SMSC.ru
 * https://smsc.ru/api/http/
 */

const SMSC_LOGIN = process.env.SMSC_LOGIN || "";
const SMSC_PASSWORD = process.env.SMSC_PASSWORD || "";

interface SendSmsParams {
  phone: string; // формат: 79001234567
  message: string;
}

export async function sendSms({ phone, message }: SendSmsParams): Promise<boolean> {
  if (!SMSC_LOGIN || !SMSC_PASSWORD) {
    console.warn("[sms] SMSC credentials not set, skipping SMS to", phone);
    return false;
  }

  try {
    const params = new URLSearchParams({
      login: SMSC_LOGIN,
      psw: SMSC_PASSWORD,
      phones: phone,
      mes: message,
      fmt: "3", // JSON
      charset: "utf-8",
      sender: "AI-Nastoik",
    });

    const res = await fetch(`https://smsc.ru/sys/send.php?${params.toString()}`);
    const data = await res.json();

    if (data.error) {
      console.error("[sms] SMSC error:", data.error, data.error_code);
      return false;
    }

    console.log("[sms] Sent to", phone, "id:", data.id);
    return true;
  } catch (err) {
    console.error("[sms] Failed:", err);
    return false;
  }
}

export async function sendOtpSms(phone: string, code: string): Promise<boolean> {
  return sendSms({
    phone,
    message: `AI Настойка: ваш код подтверждения ${code}`,
  });
}

/**
 * Нормализация телефона: убираем всё кроме цифр, приводим к 7XXXXXXXXXX
 */
export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("8")) {
    return "7" + digits.slice(1);
  }
  if (digits.length === 11 && digits.startsWith("7")) {
    return digits;
  }
  if (digits.length === 10) {
    return "7" + digits;
  }

  return null; // невалидный номер
}

import { env } from "./env";

/**
 * Пополнение баланса через ЮKassa (https://yookassa.ru/developers/api).
 *
 * Это рабочая заготовка: она честно создаёт платёж через реальный API ЮKassa
 * и возвращает ссылку на оплату, но требует настоящих `YOOKASSA_SHOP_ID` /
 * `YOOKASSA_SECRET_KEY` на сервере (переменные окружения — см. api/lib/env.ts).
 * Пока их нет, `isPaymentsConfigured()` вернёт false, и balanceRouter отдаст
 * пользователю понятную ошибку вместо попытки создать платёж.
 *
 * Перед первым реальным использованием обязательно:
 * 1. Завести магазин в личном кабинете ЮKassa, получить shopId и секретный ключ.
 * 2. Прописать YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY в .env на сервере.
 * 3. Настроить в личном кабинете ЮKassa вебхук на
 *    POST https://dev.ai-nastoika.ru/api/webhooks/yookassa
 *    для событий payment.succeeded (обработчик — см. api/boot.ts).
 * 4. Протестировать в тестовом режиме ЮKassa перед переключением на боевой.
 */

const API_BASE = "https://api.yookassa.ru/v3";

export function isPaymentsConfigured(): boolean {
  return Boolean(env.yookassaShopId && env.yookassaSecretKey);
}

function authHeader(): string {
  const token = Buffer.from(`${env.yookassaShopId}:${env.yookassaSecretKey}`).toString("base64");
  return `Basic ${token}`;
}

export type CreatePaymentResult = { paymentId: string; confirmationUrl: string };

/** Создаёт платёж в ЮKassa и возвращает ссылку, куда редиректить пользователя. */
export async function createTopupPayment(params: {
  userId: number;
  amountRub: number;
  returnUrl: string;
  idempotenceKey: string;
}): Promise<CreatePaymentResult> {
  if (!isPaymentsConfigured()) {
    throw new Error("Приём платежей временно не настроен на сервере (нет YOOKASSA_SHOP_ID/YOOKASSA_SECRET_KEY)");
  }

  const res = await fetch(`${API_BASE}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
      "Idempotence-Key": params.idempotenceKey,
    },
    body: JSON.stringify({
      amount: { value: params.amountRub.toFixed(2), currency: "RUB" },
      capture: true,
      confirmation: { type: "redirect", return_url: params.returnUrl },
      description: `Пополнение баланса «Ай, настойка», пользователь #${params.userId}`,
      metadata: { userId: params.userId },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ошибка платёжного шлюза (${res.status}): ${text.slice(0, 300)}`);
  }

  const json = (await res.json()) as { id: string; confirmation?: { confirmation_url?: string } };
  if (!json.confirmation?.confirmation_url) {
    throw new Error("Платёжный шлюз не вернул ссылку на оплату");
  }

  return { paymentId: json.id, confirmationUrl: json.confirmation.confirmation_url };
}

export type YookassaPaymentStatus = {
  id: string;
  status: "pending" | "waiting_for_capture" | "succeeded" | "canceled";
  paid: boolean;
  amount: { value: string; currency: string };
  metadata?: { userId?: string | number };
};

/**
 * Перепроверяет статус платежа напрямую в ЮKassa (по id), а не доверяет телу
 * вебхука — так рекомендует сама ЮKassa, чтобы не зачислить деньги по
 * подделанному запросу на вебхук-эндпоинт.
 */
export async function fetchPaymentStatus(paymentId: string): Promise<YookassaPaymentStatus> {
  const res = await fetch(`${API_BASE}/payments/${paymentId}`, {
    headers: { Authorization: authHeader() },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Не удалось проверить статус платежа (${res.status}): ${text.slice(0, 300)}`);
  }
  return (await res.json()) as YookassaPaymentStatus;
}

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

type PaymentMetadata = {
  kind: "topup" | "donation";
  userId?: number;
  name?: string;
  message?: string;
};

async function createPayment(params: {
  amountRub: number;
  returnUrl: string;
  idempotenceKey: string;
  description: string;
  metadata: PaymentMetadata;
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
      description: params.description,
      metadata: params.metadata,
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

/** Создаёт платёж на пополнение баланса и возвращает ссылку, куда редиректить пользователя. */
export async function createTopupPayment(params: {
  userId: number;
  amountRub: number;
  returnUrl: string;
  idempotenceKey: string;
}): Promise<CreatePaymentResult> {
  return createPayment({
    amountRub: params.amountRub,
    returnUrl: params.returnUrl,
    idempotenceKey: params.idempotenceKey,
    description: `Пополнение баланса «Ай, настойка», пользователь #${params.userId}`,
    metadata: { kind: "topup", userId: params.userId },
  });
}

/**
 * Создаёт платёж-донат. В отличие от пополнения баланса, не требует userId —
 * поддержать проект можно и без регистрации. Если donorUserId передан
 * (человек залогинен), после подтверждения оплаты вебхук выставит ему
 * значок донора (users.isDonor) — см. api/boot.ts.
 */
export async function createDonationPayment(params: {
  amountRub: number;
  returnUrl: string;
  idempotenceKey: string;
  donorUserId?: number;
  name?: string;
  message?: string;
}): Promise<CreatePaymentResult> {
  return createPayment({
    amountRub: params.amountRub,
    returnUrl: params.returnUrl,
    idempotenceKey: params.idempotenceKey,
    description: `Донат на развитие проекта «Ай, настойка»`,
    metadata: {
      kind: "donation",
      userId: params.donorUserId,
      name: params.name?.slice(0, 100),
      message: params.message?.slice(0, 500),
    },
  });
}

export type YookassaPaymentStatus = {
  id: string;
  status: "pending" | "waiting_for_capture" | "succeeded" | "canceled";
  paid: boolean;
  amount: { value: string; currency: string };
  metadata?: PaymentMetadata;
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

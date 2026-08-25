import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  appId: required("APP_ID"),
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  moonshotApiKey: process.env.MOONSHOT_API_KEY ?? "",
  // ЮKassa (пополнение баланса личного кабинета) — не required(), т.к. без них
  // сайт должен продолжать работать, просто пополнение будет недоступно.
  yookassaShopId: process.env.YOOKASSA_SHOP_ID ?? "",
  yookassaSecretKey: process.env.YOOKASSA_SECRET_KEY ?? "",
  // Прямой перевод по СБП мимо ЮKassa (донат на карту/телефон получателя
  // напрямую) — намеренно храним в .env, а не в коде, т.к. репозиторий
  // публичный и номер телефона/имя получателя не должны лежать в git-истории.
  donationPhoneNumber: process.env.DONATION_PHONE_NUMBER ?? "",
  donationPhoneOwner: process.env.DONATION_PHONE_OWNER ?? "",
  donationPhoneBank: process.env.DONATION_PHONE_BANK ?? "",
};

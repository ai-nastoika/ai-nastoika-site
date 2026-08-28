// dotenv по умолчанию НЕ перезаписывает переменные, которые уже присутствуют
// в process.env на момент запуска процесса (например, "застрявшие" в
// сохранённом снимке PM2 (~/.pm2/dump.pm2) или экспортированные когда-то
// вручную в shell/systemd). Из-за этого правки .env на диске могут тихо
// игнорироваться даже после `pm2 restart --update-env` — процесс продолжает
// работать со старым секретом, и это невозможно понять, не сравнивая
// вручную файл с `pm2 env`. .env — единственный источник истины для этого
// проекта, поэтому override: true обязателен.
import dotenv from "dotenv";
dotenv.config({ override: true });

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
  // Секрет для подписи/проверки JWT-токенов входа. Раньше три разных файла
  // независимо читали process.env.JWT_SECRET с разными захардкоженными
  // запасными значениями "на случай, если не задано" — эти значения лежали
  // открытым текстом в публичном репозитории. required() убирает тихий
  // fallback: без реального секрета сервер просто не запустится, вместо
  // того чтобы незаметно подписывать токены общедоступной строкой.
  jwtSecret: required("JWT_SECRET"),
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
  // Домены, с которых разрешены запросы к API (CORS). Через запятую, без слэша
  // на конце: "https://ai-nastoika.ru,https://dev.ai-nastoika.ru". Если не
  // задано — используются оба известных домена проекта по умолчанию, чтобы
  // не сломать текущий деплой на dev-поддомене, если .env ещё не обновили.
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "https://ai-nastoika.ru,https://dev.ai-nastoika.ru")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};

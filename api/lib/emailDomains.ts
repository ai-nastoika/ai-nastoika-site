/**
 * Валидация email-домена по ФЗ от 01.01.2025
 * Регистрация только с российской почтой.
 */

// Явный белый список популярных российских почтовых доменов
const ALLOWED_DOMAINS = new Set([
  // Mail.ru Group
  "mail.ru", "bk.ru", "inbox.ru", "list.ru",
  // Yandex
  "yandex.ru", "yandex.com", "ya.ru",
  // Rambler
  "rambler.ru", "ro.ru", "lenta.ru", "myrambler.ru", "autorambler.ru",
  // Операторы связи
  "mts.ru", "beeline.ru", "megafon.ru", "tele2.ru",
  // Прочие
  "internet.ru", "pochta.ru", "newmail.ru",
]);

// Разрешённые доменные зоны верхнего уровня
const ALLOWED_TLDS = [".ru", ".рф", ".su"];

// Заблокированные зоны (даже если домен совпал бы)
const BLOCKED_TLDS = [".ua", ".com.ua"];

export function isRussianEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;

  // Проверяем блокировку .ua
  for (const blocked of BLOCKED_TLDS) {
    if (domain.endsWith(blocked)) return false;
  }

  // Явный белый список
  if (ALLOWED_DOMAINS.has(domain)) return true;

  // Разрешённые TLD
  for (const tld of ALLOWED_TLDS) {
    if (domain.endsWith(tld)) return true;
  }

  return false;
}

export function getEmailValidationError(email: string): string | null {
  if (isRussianEmail(email)) return null;
  return "Регистрация доступна только с российской почтой (mail.ru, yandex.ru и другие .ru домены)";
}

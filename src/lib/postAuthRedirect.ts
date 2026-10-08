/* Возврат на исходную страницу после входа/регистрации.

   Проблема: гость нажимал на рецепте «Поставить настойку», его кидало на
   /login, а после регистрации — на главную. Он терял и рецепт, и намерение.
   Теперь страница, откуда пришёл гость, передаётся в ?next=…, запоминается
   в localStorage (чтобы пережить переход по ссылке из письма с подтверждением
   email) и используется после успешного входа.

   Безопасность: принимаем только внутренние пути вида "/recipe/x?y=1".
   Всё, что похоже на внешний адрес ("//evil.com", "https://…", "/\evil"),
   отбрасывается — иначе это был бы открытый редирект. */

const KEY = "post-auth-next";
const TTL_MS = 60 * 60 * 1000; // час: дольше «забытая» попытка входа не должна влиять

export function safeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.length > 300) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null;
  for (let i = 0; i < raw.length; i++) {
    if (raw.charCodeAt(i) < 32) return null; // переводы строк и прочие управляющие символы
  }
  return raw;
}

export function rememberNext(raw: string | null | undefined): void {
  const next = safeNext(raw);
  if (!next) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ next, at: Date.now() }));
  } catch {
    // localStorage недоступен — просто вернёмся на главную, как раньше
  }
}

export function clearNext(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** Забирает сохранённый адрес (и стирает его). null — если нет или устарел. */
export function consumeNext(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { next?: string; at?: number };
    if (!parsed.at || Date.now() - parsed.at > TTL_MS) return null;
    return safeNext(parsed.next);
  } catch {
    return null;
  }
}

import { Component, type ReactNode } from "react";

/* Классическая проблема одностраничных приложений с разбиением на чанки
   (code-splitting): у каждой страницы свой JS-файл с хэшем в имени
   (ToolsPage-nSLACCVa.js). После деплоя старые файлы удаляются, новые
   получают новые имена. Если у пользователя вкладка была открыта ДО деплоя,
   а переход на ленивую страницу происходит ПОСЛЕ — браузер пытается
   загрузить уже не существующий файл, получает ошибку, и без перехвата
   React просто показывает пустой экран/ошибку.

   Лечится перезагрузкой страницы (подтянет актуальный index.html с верными
   именами файлов) — но только один раз за сессию, чтобы не зациклиться,
   если проблема на самом деле не в устаревшем чанке. */

const RELOAD_FLAG_KEY = "chunk-error-reloaded-at";
const RELOAD_COOLDOWN_MS = 60_000; // не перезагружать чаще раза в минуту

function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /importing a module script failed/i.test(message) ||
    /Loading chunk [\d\w]+ failed/i.test(message)
  );
}

function canAutoReload(): boolean {
  const last = sessionStorage.getItem(RELOAD_FLAG_KEY);
  if (!last) return true;
  return Date.now() - Number(last) > RELOAD_COOLDOWN_MS;
}

type Props = { children: ReactNode };
type State = { hasError: boolean; isChunkError: boolean };

export default class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, isChunkError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, isChunkError: isChunkLoadError(error) };
  }

  componentDidCatch(error: unknown) {
    if (isChunkLoadError(error) && canAutoReload()) {
      sessionStorage.setItem(RELOAD_FLAG_KEY, String(Date.now()));
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      // Пока идёт автоматическая перезагрузка (для чанк-ошибок) — просто пусто,
      // страница вот-вот перезагрузится сама. Для прочих ошибок — понятный экран.
      if (this.state.isChunkError && canAutoReload()) {
        return null;
      }
      return (
        <div
          className="min-h-screen flex items-center justify-center px-4 text-center"
          style={{ background: "var(--bg-primary, #fff)" }}
        >
          <div>
            <h1 className="text-xl font-bold mb-3" style={{ color: "var(--text-primary, #1a1a1a)" }}>
              Что-то пошло не так
            </h1>
            <p className="text-base mb-5" style={{ color: "var(--text-secondary, #555)" }}>
              Попробуйте обновить страницу — обычно это помогает.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl text-white font-medium"
              style={{ background: "var(--accent, #8B4513)" }}
            >
              Обновить страницу
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

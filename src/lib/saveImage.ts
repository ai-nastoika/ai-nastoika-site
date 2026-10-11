/* Сохранение картинки на устройство. Нужно в первую очередь для телефона:
   «зажмите картинку → Сохранить» часто не срабатывает (большая data:-картинка,
   оверлей поверх страницы, режим Safari), поэтому даём настоящую кнопку.

   Порядок:
   1) телефон/планшет с поддержкой Web Share для файлов — системное меню
      «Поделиться» с пунктом «Сохранить изображение» / «Сохранить в Фото»;
   2) иначе — обычное скачивание файла (<a download>);
   3) если не вышло ни то ни другое — "failed", вызывающий откроет крупный
      просмотр с подсказкой.

   Важно: navigator.share нужно вызвать сразу по нажатию, пока «жив» жест
   пользователя. Поэтому для data:-картинок blob собираем синхронно, без await. */

export type SaveResult = "shared" | "downloaded" | "failed";

function dataUrlToBlob(src: string): Blob | null {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(src);
  if (!m) return null;
  try {
    const mime = m[1] || "image/png";
    if (m[2]) {
      const bin = atob(m[3]);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new Blob([bytes], { type: mime });
    }
    return new Blob([decodeURIComponent(m[3])], { type: mime });
  } catch {
    return null;
  }
}

function isTouchDevice(): boolean {
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function saveImage(src: string, filename: string): Promise<SaveResult> {
  try {
    // data:-картинку разбираем синхронно (см. комментарий выше); внешнюю — скачиваем.
    const blob = src.startsWith("data:") ? dataUrlToBlob(src) : null;
    if (!blob && !src.startsWith("data:")) {
      // Сюда доходим только для внешних ссылок — жест уже может быть потерян,
      // поэтому для них share не пробуем, только обычное скачивание.
      const res = await fetch(src);
      if (!res.ok) return "failed";
      downloadBlob(await res.blob(), filename);
      return "downloaded";
    }
    if (!blob) return "failed";

    const file = new File([blob], filename, { type: blob.type || "image/png" });
    if (isTouchDevice() && typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return "shared";
      } catch (err) {
        // Человек закрыл меню — это не ошибка, повторять не нужно.
        if (err instanceof DOMException && err.name === "AbortError") return "shared";
        // Любая другая причина — пробуем обычное скачивание ниже.
      }
    }
    downloadBlob(blob, filename);
    return "downloaded";
  } catch {
    return "failed";
  }
}

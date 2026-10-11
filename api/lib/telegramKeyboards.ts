import type { InlineKeyboard } from "./telegram";

export const MAX_STAGE_BUTTONS = 8;

/** Строки кнопок «Сделано / На день» для списка этапов. При одном этапе —
 *  подписи без номера; при нескольких — с номером, как в тексте сообщения. */
export function stageActionRows(stageIds: number[]): InlineKeyboard {
  const ids = stageIds.slice(0, MAX_STAGE_BUTTONS);
  const single = ids.length === 1;
  return ids.map((id, i) => [
    { text: single ? "✅ Сделано" : `✅ Сделано ${i + 1}`, callback_data: `d:${id}` },
    { text: single ? "⏰ На день" : `⏰ На день ${i + 1}`, callback_data: `p:${id}` },
  ]);
}

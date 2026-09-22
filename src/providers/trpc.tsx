import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AppRouter } from "../../api/router";
import type { ReactNode } from "react";

export const trpc = createTRPCReact<AppRouter>();

/* Как долго считать загруженные данные свежими.
   Раньше — по умолчанию React Query, 0 секунд: любой переход назад на страницу
   (кабинет → рецепт → снова кабинет) и даже возврат на вкладку браузера заново
   запрашивали у сервера всё, что уже было на экране. Теперь минуту данные берутся
   из памяти, а в фоне не перезапрашиваются.

   Чтобы при этом не показывать устаревшее после действий самого пользователя
   (сохранил рецепт, удалил комментарий, потратил совет — а баланс в кабинете
   старый), после ЛЮБОГО успешного изменения все данные помечаются устаревшими:
   то, что сейчас на экране, тут же тихо обновляется, остальное — при следующем
   открытии. Точечные invalidate в компонентах продолжают работать как раньше.
   Изменение, которое идёт сериями (массовая разметка этапов трекера в админке),
   может отказаться от этого через meta: { skipGlobalInvalidate: true } и само
   обновить данные в конце. */
const STALE_TIME_MS = 60_000;

const queryClient: QueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,
    },
  },
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _context, mutation) => {
      if (mutation.meta?.skipGlobalInvalidate) return;
      void queryClient.invalidateQueries();
    },
  }),
});
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        const token = localStorage.getItem("auth-token");
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}

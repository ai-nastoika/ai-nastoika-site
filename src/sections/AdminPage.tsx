import { trpc } from "@/providers/trpc";

export default function AdminPage() {
  const { data: recipes, isLoading } = trpc.recipe.list.useQuery();

  if (isLoading) return <div style={{ padding: 40, color: "var(--text-primary)" }}>Загрузка...</div>;

  return (
    <div style={{ padding: 40, color: "var(--text-primary)" }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>Админ-панель</h1>
      <p>Всего рецептов: {recipes?.length ?? 0}</p>
      <ul style={{ marginTop: 20 }}>
        {(recipes ?? []).map((r) => (
          <li key={String(r.id)} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
            {r.title} (ID: {String(r.id)})
          </li>
        ))}
      </ul>
    </div>
  );
}

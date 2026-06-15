import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Send, MessageSquare, Mail, User, CheckCircle } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";

export default function FeedbackPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    topic: "general",
    message: "",
  });
  const [error, setError] = useState("");

  const createMutation = trpc.feedback.create.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (err) => setError(err.message),
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    createMutation.mutate({
      name: form.name,
      email: form.email,
      topic: form.topic,
      message: form.message,
      userId: user?.id,
    });
  };

  const topics = [
    { id: "general", label: "Общий вопрос" },
    { id: "recipe", label: "Рецепт / Ошибка в рецепте" },
    { id: "bug", label: "Баг на сайте" },
    { id: "feature", label: "Предложение по улучшению" },
    { id: "place", label: "Добавить заведение" },
    { id: "other", label: "Другое" },
  ];

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-primary)" }}>
        <div className="text-center max-w-md">
          <CheckCircle size={64} style={{ color: "var(--accent)" }} className="mx-auto mb-6" />
          <h1
            className="text-2xl sm:text-3xl font-bold mb-4"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            Спасибо за сообщение!
          </h1>
          <p
            className="text-lg mb-8"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}
          >
            Мы получили ваше письмо и ответим в ближайшее время.
            Обычно это занимает 1–2 рабочих дня.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium transition-transform hover:scale-105"
            style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)" }}
          >
            <ArrowLeft size={22} />
            На главную
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-base font-medium mb-8 transition-opacity hover:opacity-70"
          style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}
        >
          <ArrowLeft size={22} />
          На главную
        </Link>

        <div className="mb-10">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-medium mb-4"
            style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
          >
            <MessageSquare size={22} />
            Обратная связь
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold mb-4"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            Напишите нам
          </h1>
          <p
            className="text-lg"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}
          >
            Заметили ошибку в рецепте? Хотите добавить бар? Есть идея по улучшению?
            Мы читаем каждое письмо.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              className="block text-base font-medium mb-2"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
            >
              <User size={18} className="inline mr-1.5" style={{ color: "var(--accent)" }} />
              Имя
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Как к вам обращаться?"
              className="w-full rounded-xl px-4 py-3 text-base outline-none transition-all"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-body)",
              }}
            />
          </div>

          <div>
            <label
              className="block text-base font-medium mb-2"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
            >
              <Mail size={18} className="inline mr-1.5" style={{ color: "var(--accent)" }} />
              Email
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="your@email.com"
              className="w-full rounded-xl px-4 py-3 text-base outline-none transition-all"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-body)",
              }}
            />
          </div>

          <div>
            <label
              className="block text-base font-medium mb-2"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
            >
              <MessageSquare size={18} className="inline mr-1.5" style={{ color: "var(--accent)" }} />
              Тема
            </label>
            <div className="flex flex-wrap gap-2">
              {topics.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setForm({ ...form, topic: t.id })}
                  className="rounded-full px-4 py-2 text-base transition-all"
                  style={{
                    background: form.topic === t.id ? "var(--accent)" : "var(--bg-card)",
                    color: form.topic === t.id ? "#fff" : "var(--text-secondary)",
                    border: form.topic === t.id ? "1px solid var(--accent)" : "1px solid var(--border)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              className="block text-base font-medium mb-2"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
            >
              Сообщение
            </label>
            <textarea
              required
              rows={6}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Расскажите подробнее..."
              className="w-full rounded-xl px-4 py-3 text-base outline-none transition-all resize-none"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-body)",
              }}
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg text-sm" style={{ background: "#fee2e2", color: "#991b1b" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-medium text-white transition-transform hover:scale-[1.02]"
            style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
          >
            <Send size={22} />
            {createMutation.isPending ? "Отправка..." : "Отправить сообщение"}
          </button>

          <p
            className="text-center text-base"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
          >
            Нажимая кнопку, вы соглашаетесь с{" "}
            <Link to="/rules" style={{ color: "var(--accent)" }}>
              правилами общения
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
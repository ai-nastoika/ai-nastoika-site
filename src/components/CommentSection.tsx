import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircle, Send, AlertTriangle, Pencil, Trash2, Check, X } from "lucide-react";

export default function CommentSection({ recipeId }: { recipeId: number }) {
  const utils = trpc.useUtils();
  const { user, isLoggedIn } = useAuth();

  const { data: commentsData } = trpc.comment.list.useQuery(
    { recipeId },
    { enabled: recipeId > 0 }
  );

  const createComment = trpc.comment.create.useMutation({
    onSuccess: () => {
      utils.comment.list.invalidate({ recipeId });
      setNewComment("");
    },
  });

  const updateComment = trpc.comment.update.useMutation({
    onSuccess: () => {
      utils.comment.list.invalidate({ recipeId });
      setEditingId(null);
    },
    onError: (err) => alert("Не удалось сохранить: " + err.message),
  });

  const deleteComment = trpc.comment.delete.useMutation({
    onSuccess: () => utils.comment.list.invalidate({ recipeId }),
    onError: (err) => alert("Не удалось удалить: " + err.message),
  });

  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  const comments = commentsData ?? [];

  const handleSubmit = () => {
    if (!newComment.trim() || !isLoggedIn) return;
    createComment.mutate({
      recipeId,
      text: newComment.trim(),
    });
  };

  const startEditing = (id: number, text: string) => {
    setEditingId(id);
    setEditText(text);
  };

  const saveEditing = () => {
    if (!editText.trim() || editingId === null) return;
    updateComment.mutate({ id: editingId, text: editText.trim() });
  };

  const handleDelete = (id: number) => {
    if (confirm("Удалить комментарий?")) deleteComment.mutate({ id });
  };

  const getInitial = (name?: string | null) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <section className="mb-14">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle size={22} style={{ color: "var(--accent)" }} />
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
          Комментарии
        </h2>
        <span className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
          ({comments.length})
        </span>
      </div>

      {/* Comment input */}
      {isLoggedIn ? (
        <div className="rounded-xl p-5 mb-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-base font-bold shrink-0" style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-heading)" }}>
              {getInitial(user?.name)}
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Поделитесь своим опытом или задайте вопрос..."
                className="w-full rounded-lg px-4 py-3 text-base outline-none resize-none mb-3"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-body)",
                  minHeight: 80,
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
                }}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                  <AlertTriangle size={14} />
                  <span>Ctrl+Enter для отправки</span>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!newComment.trim() || createComment.isPending}
                  className="flex items-center gap-2 rounded-lg px-5 py-2 text-base font-medium text-white transition-all hover:scale-105 disabled:opacity-50"
                  style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
                >
                  <Send size={16} />
                  {createComment.isPending ? "Отправка..." : "Отправить"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl p-5 mb-6 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <p className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            <a href="#/login" className="underline font-medium" style={{ color: "var(--accent)" }}>Войдите</a>, чтобы оставить комментарий
          </p>
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-4">
        {comments.map((comment) => {
          const isOwn = isLoggedIn && comment.userId === user?.id;
          const isEditing = editingId === comment.id;

          return (
            <div key={comment.id} className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-base font-bold shrink-0" style={{ background: "var(--surface)", color: "var(--accent)", fontFamily: "var(--font-heading)", border: "1px solid var(--border)" }}>
                  {getInitial(comment.authorName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                        {comment.authorName ?? "Аноним"}
                      </span>
                      <span className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                    {isOwn && !isEditing && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEditing(comment.id, comment.text)}
                          title="Редактировать"
                          className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(comment.id)}
                          title="Удалить"
                          className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
                          style={{ color: "#dc2626" }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full rounded-lg px-3 py-2 text-base outline-none resize-none mb-2"
                        style={{
                          background: "var(--bg-primary)",
                          border: "1px solid var(--border)",
                          color: "var(--text-primary)",
                          fontFamily: "var(--font-body)",
                          minHeight: 70,
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={saveEditing}
                          disabled={!editText.trim() || updateComment.isPending}
                          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                          style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
                        >
                          <Check size={14} /> Сохранить
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium"
                          style={{ color: "var(--text-muted)", border: "1px solid var(--border)", fontFamily: "var(--font-body)" }}
                        >
                          <X size={14} /> Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-base" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
                      {comment.text}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {comments.length === 0 && (
        <div className="text-center py-8">
          <MessageCircle size={32} style={{ color: "var(--border)" }} className="mx-auto mb-3" />
          <p className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
            Пока нет комментариев. Будьте первым!
          </p>
        </div>
      )}
    </section>
  );
}

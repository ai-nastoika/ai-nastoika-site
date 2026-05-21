import { useState } from "react";
import { trpc } from "@/providers/trpc";
// CommentSection component
import {
  MessageCircle,
  ThumbsUp,
  Send,
  AlertTriangle,
} from "lucide-react";

export default function CommentSection({ recipeId }: { recipeId: number }) {
  const utils = trpc.useUtils();
  const { data: commentsData } = trpc.comment.byRecipe.useQuery(
    { recipeId },
    { enabled: recipeId > 0 }
  );
  const createComment = trpc.comment.create.useMutation({
    onSuccess: () => {
      utils.comment.byRecipe.invalidate({ recipeId });
      setNewComment("");
    },
  });
  const likeComment = trpc.comment.like.useMutation({
    onSuccess: () => utils.comment.byRecipe.invalidate({ recipeId }),
  });

  const [newComment, setNewComment] = useState("");

  const comments = commentsData ?? [];
  const totalComments = comments.length;

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    createComment.mutate({
      recipeId,
      authorName: "Александр",
      text: newComment.trim(),
    });
  };

  return (
    <section className="mb-14">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle size={22} style={{ color: "var(--accent)" }} />
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
          Комментарии
        </h2>
        <span className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
          ({totalComments})
        </span>
      </div>

      {/* Comment input */}
      <div className="rounded-xl p-5 mb-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-base font-bold shrink-0" style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-heading)" }}>
            А
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
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                <AlertTriangle size={28} />
                <span>Будьте вежливы. Нецензурная лексика и оскорбления удаляются.</span>
              </div>
              <button
                onClick={handleSubmit}
                disabled={!newComment.trim() || createComment.isPending}
                className="flex items-center gap-2 rounded-lg px-5 py-2 text-base font-medium text-white transition-all hover:scale-105 disabled:opacity-50"
                style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
              >
                <Send size={22} />
                Отправить
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments list */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id}>
            <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-base font-bold shrink-0" style={{ background: "var(--surface)", color: "var(--accent)", fontFamily: "var(--font-heading)", border: "1px solid var(--border)" }}>
                  {comment.authorAvatar ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                      {comment.authorName ?? "Аноним"}
                    </span>
                    <span className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                      {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString("ru-RU") : ""}
                    </span>
                  </div>
                  <p className="text-base mb-3" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
                    {comment.text}
                  </p>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => likeComment.mutate({ id: comment.id })}
                      className="flex items-center gap-1.5 text-base transition-colors"
                      style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
                    >
                      <ThumbsUp size={13} />
                      {comment.likes ?? 0}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
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

import { useState } from "react";
import {
  MessageCircle,
  ThumbsUp,
  Send,
  AlertTriangle,
} from "lucide-react";

interface Comment {
  id: number;
  author: string;
  avatar: string;
  date: string;
  text: string;
  likes: number;
  liked: boolean;
  replies?: Comment[];
}

const initialComments: Record<number, Comment[]> = {
  1: [
    {
      id: 1,
      author: "Марина К.",
      avatar: "М",
      date: "2 дня назад",
      text: "Делала по этому рецепту в прошлом году — получилось просто великолепно. Добавила немного мускатного ореха, придало интересную глубину. Всем советую настоять минимум 30 дней, а не 21 — разница ощутима!",
      likes: 12,
      liked: false,
    },
    {
      id: 2,
      author: "Игорь",
      avatar: "И",
      date: "5 дней назад",
      text: "Подскажите, а если косточки не удалять — будет горько? Хочу попробовать версию с миндальной ноткой.",
      likes: 4,
      liked: false,
      replies: [
        {
          id: 21,
          author: "Мария К.",
          avatar: "М",
          date: "4 дня назад",
          text: "Да, косточки дают явный миндальный оттенок, но уходят в горечь если настаивать больше 14 дней. Для лёгкой нотки — 7-10 дней с косточками, потом процедить.",
          likes: 8,
          liked: false,
        },
      ],
    },
    {
      id: 3,
      author: "Светлана",
      avatar: "С",
      date: "1 неделю назад",
      text: "Цвет получился невероятный! Использовала вишню Шпанка — насыщенный рубин. Спасибо за рецепт!",
      likes: 7,
      liked: true,
    },
  ],
  2: [
    {
      id: 4,
      author: "Антон П.",
      avatar: "А",
      date: "3 дня назад",
      text: "Имбирь лучше брать молодой — он мягче и даёт более деликатную пряность. Старый корень может перебить лимон.",
      likes: 9,
      liked: false,
    },
    {
      id: 5,
      author: "Елена В.",
      avatar: "Е",
      date: "1 неделю назад",
      text: "Отличная база для коктейлей! Смешала с просекко 1:3 — летний вариант получился бомбический.",
      likes: 15,
      liked: true,
    },
  ],
  3: [
    {
      id: 6,
      author: "Дмитрий С.",
      avatar: "Д",
      date: "4 дня назад",
      text: "Двойное настаивание мятой — гениально! Первый раз слышу такой приём. Попробовал, действительно выходит гораздо свежее.",
      likes: 6,
      liked: false,
    },
    {
      id: 7,
      author: "Ольга",
      avatar: "О",
      date: "2 недели назад",
      text: "Добавила щепотку мелиссы как советуют — очень интересный слой аромата. Рекомендую экспериментировать с травами.",
      likes: 5,
      liked: false,
    },
  ],
  4: [
    {
      id: 8,
      author: "Никита Р.",
      avatar: "Н",
      date: "1 день назад",
      text: "Внимание: если перчина чили слишком острая, лучше начать с половины стручка. Я переборщил и первую партию пришлось разбавлять водой.",
      likes: 11,
      liked: true,
    },
    {
      id: 9,
      author: "Татьяна М.",
      avatar: "Т",
      date: "6 дней назад",
      text: "Использовала гречишный мёд — насыщенность просто потрясающая. Пряный перец и гречишный мёд — бракье сделанное на небесах.",
      likes: 8,
      liked: false,
    },
  ],
  5: [
    {
      id: 10,
      author: "Виктор",
      avatar: "В",
      date: "3 дня назад",
      text: "Коньяк VSOP обязателен? Можно ли заменить на обычный бренди? Хочу попробовать, но бюджет ограничен.",
      likes: 3,
      liked: false,
      replies: [
        {
          id: 101,
          author: "Дмитрий С.",
          avatar: "Д",
          date: "2 дня назад",
          text: "Можно! Бренди тоже подойдёт, но итоговый вкус будет менее сложным. Главное — качественный напиттв без резких спиртовых нот.",
          likes: 5,
          liked: false,
        },
      ],
    },
    {
      id: 11,
      author: "Анна М.",
      avatar: "А",
      date: "1 неделю назад",
      text: "Шоколад лучше брать 70%+ — при меньшем содержании какао вкус получается приторным. Проверено на опыте 😉",
      likes: 14,
      liked: true,
    },
  ],
  6: [
    {
      id: 12,
      author: "Павел К.",
      avatar: "П",
      date: "5 дней назад",
      text: "Облепиху обязательно размораживать перед использованием! Замороженная сразу в спирт даёт меньше сока и вкуса. Разморозка — ключ к успеху.",
      likes: 7,
      liked: false,
    },
    {
      id: 13,
      author: "Ксения",
      avatar: "К",
      date: "2 недели назад",
      text: "Добавила растительное масло как советуют — действительно, вкус стал более гладким. И ещё: в чай с лимоном просто находка для зимних вечеров.",
      likes: 10,
      liked: true,
    },
  ],
};

export default function CommentSection({ recipeId }: { recipeId: number }) {
  const [comments, setComments] = useState<Comment[]>(initialComments[recipeId] || []);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    const comment: Comment = {
      id: Date.now(),
      author: "Александр",
      avatar: "А",
      date: "только что",
      text: newComment.trim(),
      likes: 0,
      liked: false,
    };
    setComments([comment, ...comments]);
    setNewComment("");
  };

  const handleReply = (parentId: number) => {
    if (!replyText.trim()) return;
    const reply: Comment = {
      id: Date.now(),
      author: "Александр",
      avatar: "А",
      date: "только что",
      text: replyText.trim(),
      likes: 0,
      liked: false,
    };
    setComments(
      comments.map((c) =>
        c.id === parentId
          ? { ...c, replies: [...(c.replies || []), reply] }
          : c
      )
    );
    setReplyTo(null);
    setReplyText("");
  };

  const toggleLike = (id: number) => {
    setComments(
      comments.map((c) => {
        if (c.id === id) return { ...c, liked: !c.liked, likes: c.liked ? c.likes - 1 : c.likes + 1 };
        if (c.replies) {
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.id === id ? { ...r, liked: !r.liked, likes: r.liked ? r.likes - 1 : r.likes + 1 } : r
            ),
          };
        }
        return c;
      })
    );
  };

  const totalComments = comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);

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
      <div
        className="rounded-xl p-5 mb-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-base font-bold shrink-0"
            style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-heading)" }}
          >
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
                disabled={!newComment.trim()}
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
            {/* Main comment */}
            <div
              className="rounded-xl p-5"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-base font-bold shrink-0"
                  style={{ background: "var(--surface)", color: "var(--accent)", fontFamily: "var(--font-heading)", border: "1px solid var(--border)" }}
                >
                  {comment.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                      {comment.author}
                    </span>
                    <span className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                      {comment.date}
                    </span>
                  </div>
                  <p className="text-base mb-3" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
                    {comment.text}
                  </p>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleLike(comment.id)}
                      className="flex items-center gap-1.5 text-base transition-colors"
                      style={{ color: comment.liked ? "var(--accent)" : "var(--text-muted)", fontFamily: "var(--font-body)" }}
                    >
                      <ThumbsUp size={13} fill={comment.liked ? "var(--accent)" : "none"} />
                      {comment.likes}
                    </button>
                    <button
                      onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                      className="text-base transition-colors hover:opacity-70"
                      style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
                    >
                      Ответить
                    </button>
                  </div>

                  {/* Reply input */}
                  {replyTo === comment.id && (
                    <div className="mt-3 flex items-start gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Ваш ответ..."
                        className="flex-1 rounded-lg px-3 py-2 text-base outline-none"
                        style={{
                          background: "var(--bg-primary)",
                          border: "1px solid var(--border)",
                          color: "var(--text-primary)",
                          fontFamily: "var(--font-body)",
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleReply(comment.id)}
                      />
                      <button
                        onClick={() => handleReply(comment.id)}
                        disabled={!replyText.trim()}
                        className="rounded-lg px-3 py-2 text-base text-white transition-all disabled:opacity-50"
                        style={{ background: "var(--accent)", fontFamily: "var(--font-body)" }}
                      >
                        <Send size={22} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="ml-12 mt-2 space-y-2">
                {comment.replies.map((reply) => (
                  <div
                    key={reply.id}
                    className="rounded-xl p-4"
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-base font-bold shrink-0"
                        style={{ background: "var(--surface)", color: "var(--accent)", fontFamily: "var(--font-heading)", border: "1px solid var(--border)" }}
                      >
                        {reply.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>
                            {reply.author}
                          </span>
                          <span className="text-base" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                            {reply.date}
                          </span>
                        </div>
                        <p className="text-base mb-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}>
                          {reply.text}
                        </p>
                        <button
                          onClick={() => toggleLike(reply.id)}
                          className="flex items-center gap-1.5 text-base transition-colors"
                          style={{ color: reply.liked ? "var(--accent)" : "var(--text-muted)", fontFamily: "var(--font-body)" }}
                        >
                          <ThumbsUp size={28} fill={reply.liked ? "var(--accent)" : "none"} />
                          {reply.likes}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

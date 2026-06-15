import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, UserPlus, ArrowLeft, ShieldCheck, CheckCircle2, Mail } from "lucide-react";

export default function LoginPage() {
  const location = useLocation();
  const [mode, setMode] = useState<"login" | "register" | "2fa" | "verify-email">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [tempToken, setTempToken] = useState("");
  const utils = trpc.useUtils();

  // Проверяем email verification из URL
  const hash = location.hash || window.location.hash;
  const fullPath = hash.replace("#", "");
  const isVerifyEmail = fullPath.startsWith("/verify-email");

  const verifyEmailMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: (data) => {
      setMode("verify-email");
      setSuccess(`Email ${data.email} успешно подтверждён!`);
      utils.auth.me.invalidate();
    },
    onError: (err) => {
      setMode("verify-email");
      setError(err.message);
    },
  });

  useEffect(() => {
    if (isVerifyEmail) {
      const params = new URLSearchParams(fullPath.split("?")[1] || "");
      const token = params.get("token");
      if (token) {
        verifyEmailMutation.mutate({ token });
      } else {
        setMode("verify-email");
        setError("Недействительная ссылка");
      }
    }
  }, []);

  const onAuthSuccess = (data: { token: string }) => {
    localStorage.setItem("auth-token", data.token);
    utils.auth.me.invalidate().then(() => {
      window.location.href = "/#/";
    });
  };

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (data.requires2FA) {
        setTempToken(data.tempToken!);
        setMode("2fa");
        setError("");
      } else {
        onAuthSuccess({ token: data.token! });
      }
    },
    onError: (err) => setError(err.message),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => onAuthSuccess({ token: data.token }),
    onError: (err) => setError(err.message),
  });

  const verify2FAMutation = trpc.auth.verifyLoginCode.useMutation({
    onSuccess: (data) => onAuthSuccess({ token: data.token }),
    onError: (err) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (mode === "login") {
      loginMutation.mutate({ email, password });
    } else if (mode === "register") {
      registerMutation.mutate({ email, password, name });
    }
  }

  function handle2FASubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    verify2FAMutation.mutate({ tempToken, code: otpCode });
  }

  const isPending = loginMutation.isPending || registerMutation.isPending || verify2FAMutation.isPending;

  // Email verification result screen
  if (mode === "verify-email") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-primary)" }}>
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6 text-center">
              {success ? (
                <>
                  <CheckCircle2 size={48} className="mx-auto mb-4" style={{ color: "#16a34a" }} />
                  <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                    Email подтверждён!
                  </h2>
                  <p className="text-base mb-6" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                    {success}
                  </p>
                </>
              ) : error ? (
                <>
                  <Mail size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
                  <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                    Ошибка
                  </h2>
                  <p className="text-base mb-6" style={{ color: "#991b1b", fontFamily: "var(--font-body)" }}>
                    {error}
                  </p>
                </>
              ) : (
                <p className="text-base" style={{ color: "var(--text-secondary)" }}>Проверяем...</p>
              )}
              <Link to="/">
                <Button className="w-full">На главную</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-primary)" }}>
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm mb-6 transition-opacity hover:opacity-70"
          style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
        >
          <ArrowLeft size={18} /> На главную
        </Link>

        <Card>
          <CardHeader>
            <CardTitle style={{ fontFamily: "var(--font-heading)" }}>
              {mode === "2fa" ? "Подтверждение входа" : mode === "login" ? "Вход" : "Регистрация"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* ─── 2FA Code Form ─── */}
            {mode === "2fa" ? (
              <form onSubmit={handle2FASubmit} className="space-y-4">
                <div
                  className="flex items-start gap-3 p-3 rounded-lg text-sm"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <ShieldCheck size={20} className="shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
                  <span style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                    Мы отправили SMS-код на ваш телефон. Введите его ниже.
                  </span>
                </div>
                <div>
                  <Label>Код из SMS</Label>
                  <Input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="1234"
                    required
                    maxLength={4}
                    className="mt-1 text-center text-2xl tracking-[0.5em]"
                    autoFocus
                    inputMode="numeric"
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-lg text-sm" style={{ background: "#fee2e2", color: "#991b1b" }}>
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isPending || otpCode.length < 4}>
                  {isPending ? "Проверяем..." : (
                    <><ShieldCheck size={18} className="mr-2" /> Подтвердить</>
                  )}
                </Button>

                <button
                  type="button"
                  className="w-full text-center text-sm underline"
                  style={{ color: "var(--text-muted)" }}
                  onClick={() => { setMode("login"); setOtpCode(""); setError(""); }}
                >
                  Войти другим способом
                </button>
              </form>
            ) : (
              /* ─── Login / Register Form ─── */
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "register" && (
                  <div>
                    <Label>Имя</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ваше имя"
                      required
                      className="mt-1"
                    />
                  </div>
                )}
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={mode === "register" ? "вы@mail.ru" : "you@example.com"}
                    required
                    className="mt-1"
                  />
                  {mode === "register" && (
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
                      Только российская почта (mail.ru, yandex.ru и другие .ru)
                    </p>
                  )}
                </div>
                <div>
                  <Label>Пароль</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                    required
                    minLength={mode === "register" ? 6 : undefined}
                    className="mt-1"
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-lg text-sm" style={{ background: "#fee2e2", color: "#991b1b" }}>
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? "Загрузка..." : mode === "login" ? (
                    <><LogIn size={18} className="mr-2" /> Войти</>
                  ) : (
                    <><UserPlus size={18} className="mr-2" /> Зарегистрироваться</>
                  )}
                </Button>
              </form>
            )}

            {mode !== "2fa" && (
              <div className="mt-4 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                {mode === "login" ? (
                  <>Нет аккаунта? <button className="underline" style={{ color: "var(--accent)" }} onClick={() => { setMode("register"); setError(""); }}>Зарегистрироваться</button></>
                ) : (
                  <>Уже есть аккаунт? <button className="underline" style={{ color: "var(--accent)" }} onClick={() => { setMode("login"); setError(""); }}>Войти</button></>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

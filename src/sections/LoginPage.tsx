import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, UserPlus, ArrowLeft, CheckCircle2, Mail, RefreshCw, Eye, EyeOff, KeyRound } from "lucide-react";

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const verifyToken = searchParams.get("verify");
  const resetToken = searchParams.get("token");

  const [mode, setMode] = useState<"login" | "register" | "verify-email" | "forgot-password" | "reset-password">(
    () => (resetToken ? "reset-password" : "login")
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [resetRequestSent, setResetRequestSent] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  function translateError(msg: string): string {
    const map: Record<string, string> = {
      "Invalid credentials": "Неверный email или пароль",
      "User not found": "Пользователь не найден",
      "Email already exists": "Этот email уже зарегистрирован",
      "Email not verified": "Email не подтверждён. Проверьте почту",
      "EMAIL_NOT_VERIFIED": "Email не подтверждён. Проверьте почту",
      "Invalid OTP": "Неверный код подтверждения",
      "OTP expired": "Код подтверждения истёк. Запросите новый",
      "Too many requests": "Слишком много попыток. Подождите немного",
      "Password too short": "Пароль слишком короткий (минимум 8 символов)",
      "Invalid email": "Неверный формат email",
      "Network error": "Ошибка сети. Проверьте подключение",
      "Ссылка недействительна или уже использована": "Ссылка недействительна или уже использована — запросите новую",
      "Срок действия ссылки истёк, запросите новую": "Срок действия ссылки истёк — запросите новую",
    };
    return map[msg] || msg;
  }
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCheckEmail, setShowCheckEmail] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const utils = trpc.useUtils();

  const verifyEmailMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem("auth-token", data.token);
        utils.auth.me.invalidate().then(() => {
          window.location.href = "/";
        });
      } else {
        setMode("verify-email");
        setSuccess("Email успешно подтверждён!");
      }
    },
    onError: (err) => {
      setMode("verify-email");
      setError(translateError(err.message));
    },
  });

  const resendMutation = trpc.auth.resendVerification.useMutation({
    onSuccess: () => setSuccess("Письмо отправлено повторно — проверьте почту"),
    onError: (err) => setError(translateError(err.message)),
  });

  const requestResetMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => setResetRequestSent(true),
    onError: (err) => setError(translateError(err.message)),
  });

  const resetPasswordMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => setResetDone(true),
    onError: (err) => setError(translateError(err.message)),
  });

  // Только запуск verify-мутации остался в эффекте — переход в reset-password
  // теперь решается сразу при инициализации mode (см. useState выше), без
  // лишнего ре-рендера через setState в эффекте.
  useEffect(() => {
    if (verifyToken) {
      verifyEmailMutation.mutate({ token: verifyToken });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onAuthSuccess = (data: { token: string }) => {
    localStorage.setItem("auth-token", data.token);
    utils.auth.me.invalidate().then(() => {
      window.location.href = "/";
    });
  };

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => onAuthSuccess({ token: data.token }),
    onError: (err) => {
      if (err.message === "EMAIL_NOT_VERIFIED") {
        setEmailNotVerified(true);
        setError("Email не подтверждён. Проверьте почту или запросите новое письмо.");
      } else {
        setError(translateError(err.message));
      }
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => setShowCheckEmail(true),
    onError: (err) => setError(translateError(err.message)),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEmailNotVerified(false);
    if (mode === "login") {
      loginMutation.mutate({ email, password });
    } else {
      if (!agreedToTerms) {
        setError("Нужно согласиться с политикой конфиденциальности и офертой");
        return;
      }
      registerMutation.mutate({ email, password, name });
    }
  }

  function handleForgotPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    requestResetMutation.mutate({ email });
  }

  function handleResetPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== newPasswordConfirm) {
      setError("Пароли не совпадают");
      return;
    }
    if (!resetToken) return;
    resetPasswordMutation.mutate({ token: resetToken, newPassword });
  }

  const isPending = loginMutation.isPending || registerMutation.isPending;

  // Экран верификации (переход по ссылке из письма)
  if (mode === "verify-email") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-primary)" }}>
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6 text-center">
              {verifyEmailMutation.isPending ? (
                <p className="text-base" style={{ color: "var(--text-secondary)" }}>Подтверждаем email...</p>
              ) : success ? (
                <>
                  <CheckCircle2 size={48} className="mx-auto mb-4" style={{ color: "#16a34a" }} />
                  <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                    Email подтверждён!
                  </h2>
                  <p className="text-base mb-6" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                    {success}
                  </p>
                  <Link to="/"><Button className="w-full">На главную</Button></Link>
                </>
              ) : (
                <>
                  <Mail size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
                  <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                    Ошибка подтверждения
                  </h2>
                  <p className="text-base mb-6" style={{ color: "#991b1b", fontFamily: "var(--font-body)" }}>
                    {error}
                  </p>
                  <Link to="/login"><Button className="w-full">Попробовать снова</Button></Link>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // Экран "проверьте почту" после регистрации
  if (showCheckEmail) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-primary)" }}>
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6 text-center">
              <Mail size={48} className="mx-auto mb-4" style={{ color: "var(--accent)" }} />
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                Проверьте почту
              </h2>
              <p className="text-base mb-6" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                Мы отправили письмо на <strong>{email}</strong>.<br/>
                Перейдите по ссылке в письме чтобы подтвердить email и войти.
              </p>
              {success && (
                <p className="text-sm mb-4" style={{ color: "#16a34a" }}>{success}</p>
              )}
              <Button
                variant="outline"
                className="w-full mb-3"
                onClick={() => { setSuccess(""); resendMutation.mutate({ email }); }}
                disabled={resendMutation.isPending}
              >
                <RefreshCw size={16} className="mr-2" />
                {resendMutation.isPending ? "Отправляем..." : "Отправить повторно"}
              </Button>
              <Button className="w-full" variant="ghost" onClick={() => { setShowCheckEmail(false); setMode("login"); }}>
                Перейти ко входу
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // Экран запроса ссылки на восстановление пароля
  if (mode === "forgot-password") {
    if (resetRequestSent) {
      return (
        <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-primary)" }}>
          <div className="w-full max-w-md">
            <Card>
              <CardContent className="pt-6 text-center">
                <Mail size={48} className="mx-auto mb-4" style={{ color: "var(--accent)" }} />
                <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                  Проверьте почту
                </h2>
                <p className="text-base mb-6" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                  Если email <strong>{email}</strong> зарегистрирован — на него отправлена ссылка для восстановления пароля. Ссылка действительна 1 час.
                </p>
                <Button className="w-full" variant="ghost" onClick={() => { setResetRequestSent(false); setMode("login"); }}>
                  Перейти ко входу
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      );
    }
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-primary)" }}>
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle style={{ fontFamily: "var(--font-heading)" }}>Восстановление пароля</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                Укажите email, с которым вы регистрировались — пришлём ссылку для создания нового пароля.
              </p>
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="mt-1"
                  />
                </div>
                {error && (
                  <div className="p-3 rounded-lg text-sm" style={{ background: "#fee2e2", color: "#991b1b" }}>
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={requestResetMutation.isPending}>
                  {requestResetMutation.isPending ? "Отправляем..." : <><KeyRound size={18} className="mr-2" /> Отправить ссылку</>}
                </Button>
              </form>
              <div className="mt-4 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                <button className="underline" style={{ color: "var(--accent)" }} onClick={() => { setMode("login"); setError(""); }}>
                  Вернуться ко входу
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // Экран создания нового пароля (переход по ссылке из письма)
  if (mode === "reset-password") {
    if (resetDone) {
      return (
        <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-primary)" }}>
          <div className="w-full max-w-md">
            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle2 size={48} className="mx-auto mb-4" style={{ color: "#16a34a" }} />
                <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                  Пароль изменён!
                </h2>
                <p className="text-base mb-6" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                  Теперь можно войти с новым паролем.
                </p>
                <Button className="w-full" onClick={() => { window.location.href = "/login"; }}>
                  Войти
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      );
    }
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-primary)" }}>
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle style={{ fontFamily: "var(--font-heading)" }}>Новый пароль</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <Label>Новый пароль</Label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Минимум 8 символов"
                    required
                    minLength={8}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Повторите пароль</Label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    placeholder="Ещё раз тот же пароль"
                    required
                    minLength={8}
                    className="mt-1"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
                  style={{ color: "var(--text-muted)" }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />} {showPassword ? "Скрыть пароль" : "Показать пароль"}
                </button>
                {error && (
                  <div className="p-3 rounded-lg text-sm" style={{ background: "#fee2e2", color: "#991b1b" }}>
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={resetPasswordMutation.isPending}>
                  {resetPasswordMutation.isPending ? "Сохраняем..." : "Сохранить новый пароль"}
                </Button>
              </form>
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
              {mode === "login" ? "Вход" : "Регистрация"}
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                  placeholder="you@example.com"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Пароль</Label>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Минимум 8 символов"
                    required
                    minLength={mode === "register" ? 8 : undefined}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => { setMode("forgot-password"); setError(""); setEmailNotVerified(false); }}
                    className="mt-1.5 text-sm underline transition-opacity hover:opacity-70"
                    style={{ color: "var(--text-muted)", fontFamily: "var(--font-body)" }}
                  >
                    Забыли пароль?
                  </button>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-lg text-sm" style={{ background: "#fee2e2", color: "#991b1b" }}>
                  {error}
                </div>
              )}

              {/* Кнопка повторной отправки при неподтверждённом email */}
              {emailNotVerified && (
                <div className="space-y-2">
                  {success && <p className="text-sm" style={{ color: "#16a34a" }}>{success}</p>}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => { setSuccess(""); resendMutation.mutate({ email }); }}
                    disabled={resendMutation.isPending}
                  >
                    <RefreshCw size={16} className="mr-2" />
                    {resendMutation.isPending ? "Отправляем..." : "Отправить письмо повторно"}
                  </Button>
                </div>
              )}

              {mode === "register" && (
                <label className="flex items-start gap-2 text-sm cursor-pointer" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    required
                    className="mt-0.5"
                  />
                  <span>
                    Я согласен с{" "}
                    <Link to="/privacy" target="_blank" className="underline" style={{ color: "var(--accent)" }}>политикой конфиденциальности</Link>
                    {" "}и{" "}
                    <Link to="/offer" target="_blank" className="underline" style={{ color: "var(--accent)" }}>публичной офертой</Link>
                  </span>
                </label>
              )}

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Загрузка..." : mode === "login" ? (
                  <><LogIn size={18} className="mr-2" /> Войти</>
                ) : (
                  <><UserPlus size={18} className="mr-2" /> Зарегистрироваться</>
                )}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
              {mode === "login" ? (
                <>Нет аккаунта? <button className="underline" style={{ color: "var(--accent)" }} onClick={() => { setMode("register"); setError(""); setEmailNotVerified(false); }}>Зарегистрироваться</button></>
              ) : (
                <>Уже есть аккаунт? <button className="underline" style={{ color: "var(--accent)" }} onClick={() => { setMode("login"); setError(""); }}>Войти</button></>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
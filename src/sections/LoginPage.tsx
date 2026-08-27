import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, UserPlus, ArrowLeft, CheckCircle2, Mail, RefreshCw, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const location = useLocation();
  const [mode, setMode] = useState<"login" | "register" | "verify-email">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

  // Парсим verify токен из URL /#/login?verify=TOKEN
  const hash = location.hash || window.location.hash;
  const fullPath = hash.replace("#", "");
  const queryString = fullPath.split("?")[1] || "";
  const verifyToken = new URLSearchParams(queryString).get("verify");

  const verifyEmailMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem("auth-token", data.token);
        utils.auth.me.invalidate().then(() => {
          window.location.href = "/#/";
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

  useEffect(() => {
    if (verifyToken) {
      verifyEmailMutation.mutate({ token: verifyToken });
    }
  }, []);

  const onAuthSuccess = (data: { token: string }) => {
    localStorage.setItem("auth-token", data.token);
    utils.auth.me.invalidate().then(() => {
      window.location.href = "/#/";
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
      registerMutation.mutate({ email, password, name });
    }
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
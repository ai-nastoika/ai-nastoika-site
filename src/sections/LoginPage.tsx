import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, UserPlus, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const utils = trpc.useUtils();

  const onAuthSuccess = (data: { token: string }) => {
    localStorage.setItem("auth-token", data.token);
    utils.auth.me.invalidate().then(() => {
      window.location.href = "/#/";
    });
  };

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: onAuthSuccess,
    onError: (err) => setError(err.message),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: onAuthSuccess,
    onError: (err) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (mode === "login") {
      loginMutation.mutate({ email, password });
    } else {
      registerMutation.mutate({ email, password, name });
    }
  }

  const isPending = loginMutation.isPending || registerMutation.isPending;

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

            <div className="mt-4 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
              {mode === "login" ? (
                <>Нет аккаунта? <button className="underline" style={{ color: "var(--accent)" }} onClick={() => { setMode("register"); setError(""); }}>Зарегистрироваться</button></>
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

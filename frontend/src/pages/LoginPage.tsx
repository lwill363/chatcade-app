import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useLoginMutation } from "@/features/auth/authApi";
import { useAppDispatch } from "@/app/hooks";
import { setCredentials, setUser } from "@/features/auth/authSlice";
import { setStoredRefreshToken } from "@/services/api";
import { getApiErrorMessage } from "@/types";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [login, { isLoading, error }] = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    const response = await login(data).unwrap();
    dispatch(
      setCredentials({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      }),
    );
    dispatch(
      setUser({
        id: response.user.id,
        username: response.user.username,
        email: response.user.email,
        role: response.user.role,
        displayName: null,
        bio: null,
        createdAt: new Date().toISOString(),
      }),
    );
    setStoredRefreshToken(response.refreshToken);
    void navigate("/", { replace: true });
  };

  const apiError = getApiErrorMessage(error);

  return (
    <div className="min-h-screen min-w-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md">
        <div className="bg-surface border border-white/10 rounded-xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-foreground text-2xl font-extrabold">Welcome back!</h1>
            <p className="text-muted text-sm mt-1">
              Sign in to continue to Chatcade
            </p>

          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
          >
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register("password")}
            />

            {apiError && (
              <p className="text-red-400 text-sm text-center">{apiError}</p>
            )}

            <Button
              type="submit"
              isLoading={isLoading}
              size="lg"
              className="mt-2"
            >
              Log In
            </Button>
          </form>

          <p className="text-center text-dim text-sm mt-6">
            Need an account?{" "}
            <Link
              to="/register"
              className="text-primary hover:underline hover:text-primary-dark"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

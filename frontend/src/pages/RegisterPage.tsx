import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useRegisterMutation, useLoginMutation } from "@/features/auth/authApi";
import { useAppDispatch } from "@/app/hooks";
import { setCredentials, setUser } from "@/features/auth/authSlice";
import { setStoredRefreshToken } from "@/services/api";
import { getApiErrorMessage } from "@/types";
import { useState } from "react";

const schema = z
  .object({
    username: z
      .string()
      .min(3, "At least 3 characters")
      .max(50, "At most 50 characters")
      .regex(/^[a-zA-Z0-9_-]+$/, "Letters, numbers, underscores, hyphens only"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [register_, { isLoading: isRegistering }] = useRegisterMutation();
  const [login, { isLoading: isLoggingIn }] = useLoginMutation();
  const isLoading = isRegistering || isLoggingIn;
  const [registerError, setRegisterError] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setRegisterError(undefined);
    try {
      await register_({
        email: data.email,
        password: data.password,
        username: data.username,
      }).unwrap();
    } catch (err) {
      const msg = getApiErrorMessage(err);
      if (msg?.toLowerCase().includes("username")) {
        setError("username", { message: msg });
      } else if (msg?.toLowerCase().includes("email")) {
        setError("email", { message: msg });
      } else {
        setRegisterError(msg ?? "Registration failed");
      }
      return;
    }

    // Auto-login after successful registration
    const response = await login({
      identifier: data.email,
      password: data.password,
    }).unwrap();

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
    void navigate("/");
  };

  return (
    <div className="min-h-screen min-w-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md">
        <div className="bg-surface border border-white/10 rounded-xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-foreground text-2xl font-extrabold">Create an account</h1>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
          >
            <Input
              label="Username"
              placeholder="cooluser123"
              autoComplete="username"
              error={errors.username?.message}
              {...register("username")}
            />
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
              autoComplete="new-password"
              error={errors.password?.message}
              {...register("password")}
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />

            {registerError && (
              <p className="text-red-400 text-sm text-center">{registerError}</p>
            )}

            <Button
              type="submit"
              isLoading={isLoading}
              size="lg"
              className="mt-2"
            >
              Register
            </Button>
          </form>

          <p className="text-center text-dim text-sm mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary hover:underline hover:text-primary-dark"
            >
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

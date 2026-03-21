import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import {
  useUpdateMyProfileMutation,
  useDeleteAccountMutation,
} from "@/features/users/usersApi";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { setUser, logout } from "@/features/auth/authSlice";
import { useLogoutMutation } from "@/features/auth/authApi";
import { api } from "@/services/api";
import { clearStoredRefreshToken, getStoredRefreshToken } from "@/services/api";
import { getApiErrorMessage } from "@/types";

const schema = z.object({
  username: z
    .string()
    .min(3, "At least 3 characters")
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, "Letters, numbers, underscores, hyphens only")
    .optional()
    .or(z.literal("")),
  displayName: z
    .string()
    .max(100, "At most 100 characters")
    .optional()
    .or(z.literal("")),
  bio: z
    .string()
    .max(500, "At most 500 characters")
    .optional()
    .or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserSettingsModal({ isOpen, onClose }: UserSettingsModalProps) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((s) => s.auth.user);
  const [updateProfile, { isLoading: isUpdating }] =
    useUpdateMyProfileMutation();
  const [logoutApi, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [deleteAccount, { isLoading: isDeleting }] = useDeleteAccountMutation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: currentUser?.username ?? "",
      displayName: currentUser?.displayName ?? "",
      bio: currentUser?.bio ?? "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    const payload: {
      username?: string;
      displayName?: string | null;
      bio?: string | null;
    } = {};
    if (data.username && data.username !== currentUser?.username) {
      payload.username = data.username;
    }
    if (data.displayName !== undefined) {
      payload.displayName = data.displayName || null;
    }
    if (data.bio !== undefined) {
      payload.bio = data.bio || null;
    }
    if (Object.keys(payload).length > 0) {
      try {
        const updated = await updateProfile(payload).unwrap();
        dispatch(setUser(updated));
      } catch (err) {
        const msg = getApiErrorMessage(err);
        if (msg?.toLowerCase().includes("username")) {
          setError("username", { message: msg });
        } else {
          setError("username", { message: msg ?? "Update failed" });
        }
        return;
      }
    }
    onClose();
  };

  const handleLogout = async () => {
    const refreshToken = getStoredRefreshToken();
    if (refreshToken) {
      await logoutApi({ refreshToken })
        .unwrap()
        .catch(() => {});
    }
    clearStoredRefreshToken();
    dispatch(logout());
    dispatch(api.util.resetApiState());
  };

  const handleClose = () => {
    reset({
      username: currentUser?.username ?? "",
      displayName: currentUser?.displayName ?? "",
      bio: currentUser?.bio ?? "",
    });
    setShowDeleteConfirm(false);
    setDeleteConfirmText("");
    onClose();
  };

  const handleDeleteAccount = async () => {
    await deleteAccount().unwrap();
    clearStoredRefreshToken();
    dispatch(logout());
    dispatch(api.util.resetApiState());
  };

  const displayLabel = currentUser?.displayName ?? currentUser?.username ?? "";

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="User Settings">
      <div className="flex flex-col gap-5 mt-4">
        {/* Profile card */}
        {currentUser &&
          (() => {
            const avatarName = currentUser.displayName ?? currentUser.username;
            return (
              <div className="rounded-xl border border-white/8">
                <div className="h-16 rounded-t-xl relative bg-raised">
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                    <Avatar
                      username={avatarName}
                      size="xl"
                      className="ring-4 ring-surface"
                    />
                  </div>
                </div>
                <div className="bg-inset rounded-b-xl px-4 pt-10 pb-4 text-center">
                  <p className="text-foreground font-bold text-base leading-tight">
                    {displayLabel}
                  </p>
                  <p className="text-dim text-sm">@{currentUser.username}</p>
                  <p className="text-dim text-xs mt-0.5">{currentUser.email}</p>
                </div>
              </div>
            );
          })()}

        {/* Edit form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Display Name"
            placeholder={currentUser?.username ?? ""}
            error={errors.displayName?.message}
            {...register("displayName")}
          />
          <Input
            label="Username"
            error={errors.username?.message}
            {...register("username")}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted uppercase tracking-widest">
              Bio
            </label>
            <textarea
              rows={3}
              placeholder="Tell others a little about yourself…"
              className="w-full bg-raised border border-white/10 text-foreground placeholder:text-dim text-sm rounded-lg px-3 py-2 resize-none outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/30"
              {...register("bio")}
            />
            {errors.bio && (
              <p className="text-red-400 text-xs">{errors.bio.message}</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button type="submit" isLoading={isUpdating}>
              Save Changes
            </Button>
          </div>
        </form>

        {/* Logout */}
        <div className="border-t border-white/8 pt-4 flex flex-col gap-3">
          <Button
            variant="danger"
            onClick={() => void handleLogout()}
            isLoading={isLoggingOut}
            className="w-full"
          >
            Log Out
          </Button>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-dim hover:text-red-400 transition-colors cursor-pointer text-center"
            >
              Delete account
            </button>
          ) : (
            <div className="flex flex-col gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/5">
              <p className="text-xs text-red-400 font-medium">
                This will permanently delete your account and all your data.
                Type <span className="font-bold">DELETE</span> to confirm.
              </p>
              <input
                autoFocus
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-raised border border-white/10 text-foreground placeholder:text-dim text-sm rounded-lg px-3 py-2 outline-none focus:border-red-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                  }}
                  className="flex-1 text-sm text-dim hover:text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  variant="danger"
                  onClick={() => void handleDeleteAccount()}
                  isLoading={isDeleting}
                  disabled={deleteConfirmText !== "DELETE"}
                  className="flex-1"
                >
                  Delete Account
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

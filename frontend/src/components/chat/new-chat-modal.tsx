"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { useChats } from "@/context/chats-context";
import { createChat, fetchUsers } from "@/lib/chat-service";
import { User } from "@/types";

interface NewChatModalProps {
  open: boolean;
  onClose: () => void;
}

export function NewChatModal({ open, onClose }: NewChatModalProps) {
  const { token } = useAuth();
  const { addChat } = useChats();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !token) return;
    setSelected([]);
    setGroupName("");
    setError(null);
    setLoadingUsers(true);
    fetchUsers(token)
      .then(setUsers)
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los usuarios",
        ),
      )
      .finally(() => setLoadingUsers(false));
  }, [open, token]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const isGroup = selected.length > 1;

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !token) return;

    if (selected.length === 0) {
      setError("Selecciona al menos un usuario");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const name = groupName.trim();
      const chat = await createChat(token, {
        participantIds: selected,
        ...(isGroup && name ? { name } : {}),
      });
      addChat(chat);
      onClose();
      router.push(`/chat/${chat.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el chat");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={() => !submitting && onClose()}
      />

      <form
        onSubmit={handleSubmit}
        noValidate
        className="glass animate-fade-in-up relative w-full max-w-md space-y-5 rounded-3xl p-7"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Cerrar"
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-100 disabled:opacity-50"
        >
          <X size={18} />
        </button>

        <div className="pr-10">
          <h2 className="text-gradient text-2xl font-bold">Nuevo chat</h2>
          <p className="mt-1 text-sm text-slate-400">
            Selecciona uno o más contactos. Con más de uno se crea un grupo.
          </p>
        </div>

        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {loadingUsers &&
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="skeleton h-16 rounded-xl" />
            ))}

          {!loadingUsers && users.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-500">
              Aún no hay otros usuarios registrados
            </p>
          )}

          {!loadingUsers &&
            users.map((user) => {
              const checked = selected.includes(user.id);
              return (
                <label
                  key={user.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-all duration-300 ${
                    checked
                      ? "border-accent-400/50 bg-accent-500/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  } ${submitting ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(user.id)}
                    disabled={submitting}
                    className="h-4 w-4 accent-accent-500"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-100">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {user.email}
                    </p>
                  </div>
                </label>
              );
            })}
        </div>

        {isGroup && (
          <Input
            label="Nombre del grupo (opcional)"
            name="groupName"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            disabled={submitting}
            maxLength={100}
          />
        )}

        {error && (
          <div
            role="alert"
            className="animate-fade-in-up rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
          >
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            Cancelar
          </button>
          <div className="flex-1">
            <Button
              type="submit"
              loading={submitting}
              disabled={selected.length === 0}
            >
              {submitting ? "Creando…" : "Crear chat"}
            </Button>
          </div>
        </div>
      </form>
    </div>,
    document.body,
  );
}

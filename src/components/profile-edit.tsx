"use client";

import { useRef, useState } from "react";
import { Button, Input, Modal } from "@/components/ui";
import { compressImage } from "@/lib/image";

type Props = {
  open: boolean;
  currentName: string;
  currentEmail: string;
  onClose: () => void;
  onSave: (fullName: string, avatarFile?: File | null) => Promise<void>;
};

export function ProfileEditModal({
  open,
  currentName,
  currentEmail,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState(currentName);
  const [preview, setPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const dataUrl = await compressImage(file);
    setPreview(dataUrl);
    setAvatarFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onSave(name.trim(), avatarFile);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const initial = (name || currentEmail).trim().charAt(0).toUpperCase();

  return (
    <Modal open={open} onClose={onClose} title="Edit Profil">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Ganti foto profil"
            className="group relative h-20 w-20 overflow-hidden rounded-full border-2 border-border transition hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center bg-accent-soft text-2xl font-bold text-accent">
                {initial}
              </span>
            )}
            <span className="absolute inset-0 grid place-items-center bg-black/50 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
              Ganti
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <p className="text-xs text-muted">{currentEmail}</p>
        </div>

        <Input
          label="Nama"
          required
          placeholder="Nama tampilan kamu"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          autoFocus
        />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
            Batal
          </Button>
          <Button type="submit" loading={busy} className="flex-1">
            Simpan
          </Button>
        </div>
      </form>
    </Modal>
  );
}

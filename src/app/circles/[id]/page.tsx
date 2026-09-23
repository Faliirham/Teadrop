"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import CircleManager from "@/components/circle-manager";
import { Button, Card } from "@/components/ui";
import { useSession } from "@/hooks/use-teadrop";
import { isDemoMode } from "@/lib/env";

export default function CircleDetailPage() {
  const params = useParams<{ id?: string }>();
  const id = params?.id ?? "";
  const { data: user, isLoading } = useSession();

  if (isLoading) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </main>
    );
  }

  if (!user && !isDemoMode) {
    return (
      <main className="mx-auto grid min-h-dvh max-w-4xl place-items-center px-4">
        <Card className="w-full max-w-sm text-center">
          <p className="font-bold text-foreground">Masuk dulu untuk mengelola</p>
          <p className="mt-1 text-sm text-muted">
            Circle ini privat. Masuk dulu, kamu akan kembali ke sini otomatis.
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              href={`/login?mode=masuk&next=${encodeURIComponent(`/circles/${id}`)}`}
              className="flex-1"
            >
              <Button className="w-full">Masuk</Button>
            </Link>
            <Link
              href={`/login?mode=magic&next=${encodeURIComponent(`/circles/${id}`)}`}
              className="flex-1"
            >
              <Button variant="outline" className="w-full">Magic Link</Button>
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  return <CircleManager />;
}

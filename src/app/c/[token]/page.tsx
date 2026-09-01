"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge, Card, idr } from "@/components/ui";
import { SpotlightCard } from "@/components/reactbits/SpotlightCard";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSession } from "@/hooks/use-teadrop";
import { getCirclePublic } from "@/lib/api";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CirclePublicPage() {
  const { token } = useParams<{ token: string }>();
  const session = useSession();

  const { data, isLoading } = useQuery({
    queryKey: ["circle-public", token],
    queryFn: () => getCirclePublic(token as string),
    enabled: !!token,
    retry: false,
  });

  return (
    <main className="min-h-dvh">
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-4">
        <div className="mb-4 flex items-center gap-2">
          <Link
            href="/"
            aria-label="Beranda"
            className="grid h-9 w-9 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-lg font-extrabold text-foreground">
            {isLoading ? "Memuat…" : data?.name ?? "Circle"}
          </h1>
          <ThemeToggle />
        </div>

        {isLoading && (
          <div className="space-y-4">
            <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />
            <div className="h-24 animate-pulse rounded-2xl bg-surface/70" />
          </div>
        )}

        {!isLoading && !data && (
          <Card>
            <p className="font-semibold text-foreground">
              Link ini tidak valid atau sudah dinonaktifkan.
            </p>
            <p className="mt-1 text-sm text-muted">
              Minta link lihat terbaru ke bendahara circle kamu.
            </p>
          </Card>
        )}

        {!isLoading && data && (
          <div className="space-y-4">
            {data.description && <p className="text-sm text-muted">{data.description}</p>}

            {/* Saldo */}
            <SpotlightCard className="p-6">
              <p className="text-sm text-muted">Dana terkumpul saat ini</p>
              <p className="mt-2 text-4xl font-extrabold tracking-tight text-accent">
                {data.latest_balance ? idr(Number(data.latest_balance.new_amount)) : idr(0)}
              </p>
              {data.latest_balance && (
                <p className="mt-1 text-xs text-muted">
                  diperbarui {fmtDate(data.latest_balance.created_at)}
                </p>
              )}
            </SpotlightCard>

            {/* Periode aktif */}
            {data.active_period ? (
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-foreground">{data.active_period.name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      Iuran {idr(Number(data.active_period.amount_per_member))}/org · tempo{" "}
                      {fmtDate(data.active_period.due_date)}
                    </p>
                  </div>
                  <Badge tone="indigo">Aktif</Badge>
                </div>
                <div className="mt-3 text-xs text-muted">
                  Terkumpul {idr(Number(data.active_period.collected))}
                </div>
              </Card>
            ) : (
              <Card>
                <p className="text-sm text-muted">Belum ada periode iuran aktif.</p>
              </Card>
            )}

            {/* Anggota */}
            <Card>
              <h3 className="mb-3 font-bold text-foreground">
                Anggota ({data.members.length})
              </h3>
              <ul className="divide-y divide-border">
                {data.members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-2.5">
                    <span className="text-sm font-medium text-foreground">
                      {m.full_name ?? "Anggota"}
                    </span>
                    <Badge tone={m.role === "admin" ? "indigo" : "slate"}>
                      {m.role === "admin" ? "Bendahara" : "Anggota"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Meetup mendatang */}
            {data.meetups.length > 0 && (
              <Card>
                <h3 className="mb-3 font-bold text-foreground">
                  Meetup ({data.meetups.length})
                </h3>
                <ul className="space-y-3">
                  {data.meetups.map((m) => (
                    <li key={m.id} className="rounded-xl border border-border bg-surface/40 p-3">
                      <p className="font-semibold text-foreground">{m.title}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {new Date(m.start_at).toLocaleDateString("id-ID", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {m.location && ` · ${m.location}`}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                        {m.rsvp_going > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            {m.rsvp_going} hadir
                          </span>
                        )}
                        {m.rsvp_maybe > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                            {m.rsvp_maybe} mungkin
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Momen terbaru */}
            {data.moments.length > 0 && (
              <Card>
                <h3 className="mb-3 font-bold text-foreground">
                  Momen ({data.moments.length})
                </h3>
                <ul className="space-y-3">
                  {data.moments.map((m) => (
                    <li key={m.id} className="rounded-xl border border-border bg-surface/40 p-3">
                      <p className="text-sm text-foreground">{m.content}</p>
                      {m.photos.length > 0 && (
                        <div className="mt-2 flex gap-2 overflow-x-auto">
                          {m.photos.map((p, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={i}
                              src={p.url}
                              alt=""
                              className="h-16 w-16 shrink-0 rounded-lg object-cover"
                            />
                          ))}
                        </div>
                      )}
                      <p className="mt-1.5 text-xs text-muted">
                        {m.author_name ?? "Anggota"} · {fmtDate(m.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* CTA */}
            <Link
              href="/login"
              className="block rounded-xl bg-accent-strong px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#4f46e5] active:scale-[0.99]"
            >
              {session.data ? "Kelola circle ini" : "Masuk untuk mengelola"}
            </Link>
            <p className="text-center text-xs text-muted">
              Halaman ini hanya untuk melihat. Login untuk mencatat iuran dan edit data.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

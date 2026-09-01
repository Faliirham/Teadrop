"use client";

import { useState } from "react";
import { Button, Modal } from "@/components/ui";

type Photo = {
  url: string;
  id: string;
};

type GalleryProps = {
  photos: Photo[];
  onClose: () => void;
};

const MAX_GRID = 6;

export function Gallery({ photos, onClose }: GalleryProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const handleOpen = (i: number) => {
    setActive(i);
    setOpen(true);
  };

  const images = photos.map((p) => p.url);

  const prev = () => {
    setActive((a) => Math.max(0, a - 1));
  };
  const next = () => {
    setActive((a) => Math.min(images.length - 1, a + 1));
  };

  return (
    <>
      <GridGallery photos={photos} onImageClick={handleOpen} />

      <Modal open={open} onClose={() => { setOpen(false); onClose(); }} title="Foto Momen">
        <div className="flex flex-col">
          <div className="grid h-72 place-items-center overflow-hidden">
            {images[active] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={images[active]}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            )}
          </div>
          <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={prev}
              disabled={active === 0}
              className="flex-1"
            >
              Sebelumnya
            </Button>
            <span className="text-sm text-muted">
              {active + 1} / {images.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={next}
              disabled={active >= images.length - 1}
              className="flex-1"
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function GridGallery({
  photos,
  onImageClick,
}: {
  photos: Photo[];
  onImageClick: (i: number) => void;
}) {
  const visible = photos.slice(0, MAX_GRID);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {visible.map((p, i) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onImageClick(i)}
          className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface-2 transition-all hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </button>
      ))}
      {photos.length > MAX_GRID && (
        <button
          type="button"
          onClick={() => onImageClick(MAX_GRID)}
          className="grid aspect-square place-items-center rounded-2xl border border-dashed border-border bg-surface/60 text-sm font-semibold text-muted"
        >
          +{photos.length - MAX_GRID} foto
        </button>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import { Button, Card } from "@/components/ui";
import { idr } from "@/components/ui";

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
    setActive((active) => Math.max(0, active - 1));
  };
  const next = () => {
    setActive((active) => Math.min(images.length - 1, active + 1));
  };

  return (
    <>
      <GridGallery photos={photos} onImageClick={handleOpen} />

      <Modal
        open={open}
        onClose={onClose}
        title="Foto Momen"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-end justify-center h-64 overflow-hidden">
            <img
              src={images[active]}
              alt=""
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="flex gap-3 p-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="ghost"
              size="sm"
              onClick={prev}
              disabled={active === 0}
              className="flex-1"
            >
              ← Sebelum
            </Button>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              { `${active + 1} / ${images.length} ` }
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={next}
              disabled={active >= images.length - 1}
              className="flex-1"
            >
              Selanjutnya →
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function GridGallery({ photos, onImageClick }: { photos: Photo[]; onImageClick: (i: number) => void }) {
  const visible = photos.slice(0, MAX_GRID);
  return (
    <div className="grid grid-cols-2 gap-3">
      {visible.map((p, i) => (
        <Card
          key={p.id}
          className="p-3 hover:opacity-80 transition-opacity cursor-pointer"
          onClick={() => onImageClick(i)}
        >
          <img
            src={p.url}
            alt=""
            className="h-24 w-24 object-cover rounded-lg"
          />
        </Card>
      ))}
      {photos.length > MAX_GRID && (
        <Card className="p-3 text-slate-400 dark:text-slate-500 text-sm">
          +{photos.length - MAX_GRID} foto lainnya
        </Card>
      )}
    </div>
  );
}
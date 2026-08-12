"use client";

import { useEffect, useState } from "react";
import { X, ZoomIn } from "lucide-react";
import { ProductImage } from "@/components/catalog/ProductImage";
import { cn } from "@/lib/utils";

interface GalleryImage {
  basePath: string;
  alt: string;
}

/** Ürün galerisi: küçük görseller + tıklayınca tam ekran lightbox (zoom). */
export function ImageGallery({ images }: { images: GalleryImage[] }) {
  const [selected, setSelected] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-steel-100 text-sm text-steel-400">
        Görsel hazırlanıyor
      </div>
    );
  }

  const current = images[Math.min(selected, images.length - 1)];

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setLightbox(true);
          setZoomed(false);
        }}
        className="group relative block w-full cursor-zoom-in overflow-hidden rounded-lg border border-steel-200 bg-white"
        aria-label="Görseli büyüt"
      >
        <ProductImage
          basePath={current.basePath}
          alt={current.alt}
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          className="aspect-[4/3] w-full object-cover"
        />
        <span className="absolute right-3 bottom-3 flex size-10 items-center justify-center rounded-full bg-steel-950/70 text-steel-50 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
          <ZoomIn className="size-5" />
        </span>
      </button>

      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.basePath}
              type="button"
              onClick={() => setSelected(i)}
              className={cn(
                "w-20 shrink-0 overflow-hidden rounded-md border-2",
                i === selected ? "border-steel-950" : "border-transparent opacity-70",
              )}
              aria-label={`Görsel ${i + 1}`}
            >
              <ProductImage
                basePath={img.basePath}
                alt=""
                sizes="80px"
                className="aspect-[4/3] w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-steel-950/95 p-4"
          onClick={() => setLightbox(false)}
          role="dialog"
          aria-modal="true"
          aria-label={current.alt}
        >
          <button
            type="button"
            className="absolute top-4 right-4 flex size-11 items-center justify-center rounded-full border border-steel-700 text-steel-200 hover:bg-steel-800"
            onClick={() => setLightbox(false)}
            aria-label="Kapat"
          >
            <X className="size-6" />
          </button>
          <img
            src={`/${current.basePath}-lg.webp`}
            alt={current.alt}
            onClick={(e) => {
              e.stopPropagation();
              setZoomed((z) => !z);
            }}
            className={cn(
              "max-h-full max-w-full rounded-md object-contain transition-transform duration-300",
              zoomed ? "scale-150 cursor-zoom-out" : "cursor-zoom-in",
            )}
          />
        </div>
      )}
    </div>
  );
}

"use client";

import { BookOpen, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { generateCatalog } from "@/server/actions/catalog";

export function CatalogGenerator({ running }: { running: boolean }) {
  const [pending, startTransition] = useTransition();
  const busy = pending || running;

  return (
    <Button
      type="button"
      variant="dark"
      size="md"
      disabled={busy}
      onClick={() => startTransition(() => generateCatalog())}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <BookOpen className="size-4" />}
      {busy ? "Üretiliyor…" : "Katalog Üret"}
    </Button>
  );
}

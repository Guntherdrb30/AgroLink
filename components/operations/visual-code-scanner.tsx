"use client";

import { useState, useTransition } from "react";
import { Camera, ScanSearch } from "lucide-react";
import { useRouter } from "next/navigation";

import { normalizeAnimalCode } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type VisualCodeScannerProps = {
  operationId: string;
  initialCode?: string;
};

export function VisualCodeScanner({
  operationId,
  initialCode = "",
}: VisualCodeScannerProps) {
  const router = useRouter();
  const [manualCode, setManualCode] = useState(initialCode);
  const [rawText, setRawText] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleFile(file: File) {
    startTransition(async () => {
      const Tesseract = await import("tesseract.js");
      const result = await Tesseract.recognize(file, "eng");
      const normalized = normalizeAnimalCode(result.data.text);

      setRawText(result.data.text);
      setManualCode(normalized);
    });
  }

  return (
    <div className="space-y-4 rounded-[28px] border border-border/70 bg-white p-5">
      <div className="flex items-center gap-3">
        <ScanSearch className="size-5 text-primary" />
        <div>
          <p className="font-medium">Reconocimiento por imagen</p>
          <p className="text-sm text-muted-foreground">
            Usa foto o camara, revisa el codigo detectado y corrige si hace falta.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <Input
          value={manualCode}
          onChange={(event) => setManualCode(event.target.value)}
          placeholder="Codigo visual o interno"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            router.push(
              `/operations/${operationId}?lookup=${encodeURIComponent(manualCode)}`,
            )
          }
          disabled={!manualCode.trim()}
        >
          Buscar codigo
        </Button>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-[24px] border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
        <Camera className="size-4" />
        {isPending ? "Procesando imagen..." : "Tomar foto o subir imagen"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              void handleFile(file);
            }
          }}
        />
      </label>

      {rawText ? (
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          OCR bruto: {rawText.trim() || "sin texto"}
        </p>
      ) : null}
    </div>
  );
}

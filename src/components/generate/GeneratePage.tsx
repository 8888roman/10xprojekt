import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { generateFlashcardsSchema } from "@/lib/schemas/flashcards";
import type {
  CreateFlashcardCommand,
  CreateGenerationCommand,
  GenerateFlashcardsCommand,
  GenerateFlashcardsResponseDto,
} from "@/types";

type ProposalStatus = "pending" | "accepted" | "rejected" | "edited";
type DecisionFilter = "all" | ProposalStatus;

interface FlashcardProposalViewModel {
  id: string;
  front: string;
  back: string;
  status: ProposalStatus;
}

interface ProposalEditPayload {
  front: string;
  back: string;
}

interface FormErrorViewModel {
  message: string;
  code?: string;
  field?: "text";
}

const sha256Hex = async (value: string) => {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const createLocalId = (index: number) =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `proposal-${Date.now()}-${index}`;

const mapStatusLabel: Record<ProposalStatus, string> = {
  pending: "Do decyzji",
  accepted: "Zaakceptowana",
  rejected: "Odrzucona",
  edited: "Edytowana",
};

const mapStatusClass: Record<ProposalStatus, string> = {
  pending: "bg-secondary text-secondary-foreground",
  accepted: "bg-green-100 text-green-900",
  rejected: "bg-red-100 text-red-900",
  edited: "bg-amber-100 text-amber-900",
};

export const GeneratePage = () => {
  const [text, setText] = useState("");
  const [proposals, setProposals] = useState<FlashcardProposalViewModel[]>([]);
  const [filter, setFilter] = useState<DecisionFilter>("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<FormErrorViewModel | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [editing, setEditing] = useState<FlashcardProposalViewModel | null>(null);

  const trimmedText = text.trim();
  const length = trimmedText.length;
  const lengthValid = length >= 1000 && length <= 10000;

  const selectedCount = useMemo(
    () => proposals.filter((proposal) => proposal.status === "accepted" || proposal.status === "edited").length,
    [proposals]
  );

  const filteredProposals = useMemo(() => {
    if (filter === "all") {
      return proposals;
    }
    return proposals.filter((proposal) => proposal.status === filter);
  }, [filter, proposals]);

  const handleChange = (value: string) => {
    setText(value);
    if (error?.field === "text") {
      setError(null);
    }
  };

  const handleGenerate = async () => {
    setSuccess(false);
    setSaveError(null);
    const parsed = generateFlashcardsSchema.safeParse({ text });
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Nieprawidłowy tekst.";
      setError({ message, field: "text", code: "VALIDATION_ERROR" });
      return;
    }

    const payload: GenerateFlashcardsCommand = { text: parsed.data.text };
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/flashcards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        let message = "Nie udało się wygenerować fiszek.";
        let code = "INTERNAL_ERROR";
        try {
          const errorPayload = (await response.json()) as { message?: string; code?: string };
          if (errorPayload?.message) {
            message = errorPayload.message;
          }
          if (errorPayload?.code) {
            code = errorPayload.code;
          }
        } catch {
          // ignore parsing errors
        }
        setError({ message, code });
        return;
      }

      const data = (await response.json()) as GenerateFlashcardsResponseDto;
      const nextProposals = data.proposals.map((proposal, index) => ({
        ...proposal,
        id: createLocalId(index),
        status: "pending" as const,
      }));
      setProposals(nextProposals);
    } catch {
      setError({ message: "Brak połączenia z serwerem. Spróbuj ponownie." });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = (id: string) => {
    setProposals((items) => items.map((item) => (item.id === id ? { ...item, status: "accepted" } : item)));
  };

  const handleReject = (id: string) => {
    setProposals((items) => items.map((item) => (item.id === id ? { ...item, status: "rejected" } : item)));
  };

  const handleEdit = (payload: ProposalEditPayload) => {
    if (!editing) {
      return;
    }

    setProposals((items) =>
      items.map((item) =>
        item.id === editing.id ? { ...item, front: payload.front, back: payload.back, status: "edited" } : item
      )
    );
    setEditing(null);
  };

  const handleSaveAccepted = async () => {
    if (selectedCount === 0) {
      return;
    }
    setIsSaving(true);
    setSuccess(false);
    setSaveError(null);

    const accepted = proposals.filter((proposal) => proposal.status === "accepted" || proposal.status === "edited");
    const editedCount = accepted.filter((proposal) => proposal.status === "edited").length;
    const uneditedCount = accepted.length - editedCount;

    try {
      const generationPayload: CreateGenerationCommand = {
        model: "ui",
        generated_count: proposals.length,
        accepted_unedited_count: uneditedCount,
        accepted_edited_count: editedCount,
        source_text_hash: await sha256Hex(trimmedText),
        source_text_length: trimmedText.length,
        generation_duration: 0,
      };

      const generationResponse = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generationPayload),
      });

      if (generationResponse.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!generationResponse.ok) {
        setSaveError("Nie udało się zapisać sesji generowania.");
        return;
      }

      const generation = (await generationResponse.json()) as { id: number };

      for (const proposal of accepted) {
        const payload: CreateFlashcardCommand = {
          front: proposal.front,
          back: proposal.back,
          source: proposal.status === "edited" ? "ai-edited" : "ai-full",
          generation_id: generation.id,
        };

        const flashcardResponse = await fetch("/api/flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (flashcardResponse.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (!flashcardResponse.ok) {
          setSaveError("Nie udało się zapisać wszystkich fiszek.");
          return;
        }
      }

      setSuccess(true);
    } catch {
      setSaveError("Brak połączenia z serwerem. Spróbuj ponownie.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Generowanie fiszek</h1>
        <p className="text-sm text-muted-foreground">
          Wklej tekst (1000–10000 znaków), aby wygenerować propozycje fiszek.
        </p>
      </header>

      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium" htmlFor="source-text">
            Tekst źródłowy
          </label>
          <textarea
            id="source-text"
            className="min-h-[180px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={text}
            onChange={(event) => handleChange(event.target.value)}
            aria-invalid={!lengthValid}
            aria-describedby="text-help"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground" id="text-help">
            <span>Licznik znaków: {length}</span>
            <span>{lengthValid ? "Zakres poprawny" : "Wymagane 1000–10000 znaków"}</span>
          </div>
          {error && <ErrorBanner message={error.message} />}
          <div className="flex items-center gap-2">
            <Button onClick={handleGenerate} disabled={!lengthValid || isGenerating}>
              {isGenerating ? "Generowanie..." : "Generuj"}
            </Button>
            {error?.code === "RATE_LIMITED" && (
              <Button variant="outline" size="sm" onClick={handleGenerate}>
                Spróbuj ponownie
              </Button>
            )}
            {error?.code && !lengthValid && (
              <span className="text-xs text-muted-foreground">Sprawdź długość tekstu.</span>
            )}
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {(["all", "pending", "accepted", "rejected", "edited"] as const).map((value) => (
            <Button
              key={value}
              variant={filter === value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(value)}
            >
              {value === "all" ? "Wszystkie" : mapStatusLabel[value]}
            </Button>
          ))}
        </div>
        <div className="text-sm text-muted-foreground">
          Wybrane: {selectedCount} / {proposals.length}
        </div>
      </section>

      <section className="space-y-3">
        {filteredProposals.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Brak propozycji do wyświetlenia.
          </div>
        ) : (
          filteredProposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              item={proposal}
              onAccept={() => handleAccept(proposal.id)}
              onReject={() => handleReject(proposal.id)}
              onEdit={() => setEditing(proposal)}
            />
          ))
        )}
      </section>

      <SaveAcceptedBar
        acceptedCount={selectedCount}
        isSaving={isSaving}
        success={success}
        error={saveError}
        onSave={handleSaveAccepted}
      />

      {editing && <ProposalEditSheet proposal={editing} onClose={() => setEditing(null)} onSave={handleEdit} />}
    </main>
  );
};

const ErrorBanner = ({ message }: { message: string }) => (
  <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
    {message}
  </div>
);

const ProposalCard = ({
  item,
  onAccept,
  onReject,
  onEdit,
}: {
  item: FlashcardProposalViewModel;
  onAccept: () => void;
  onReject: () => void;
  onEdit: () => void;
}) => (
  <div className="rounded-lg border bg-card p-4 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Przód</div>
        <p className="text-sm">{item.front}</p>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tył</div>
        <p className="text-sm">{item.back}</p>
      </div>
      <span className={`rounded-full px-2 py-1 text-xs ${mapStatusClass[item.status]}`}>
        {mapStatusLabel[item.status]}
      </span>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      <Button size="sm" onClick={onAccept}>
        Akceptuj
      </Button>
      <Button size="sm" variant="outline" onClick={onEdit}>
        Edytuj
      </Button>
      <Button size="sm" variant="destructive" onClick={onReject}>
        Odrzuć
      </Button>
    </div>
  </div>
);

const ProposalEditSheet = ({
  proposal,
  onClose,
  onSave,
}: {
  proposal: FlashcardProposalViewModel;
  onClose: () => void;
  onSave: (payload: ProposalEditPayload) => void;
}) => {
  const [front, setFront] = useState(proposal.front);
  const [back, setBack] = useState(proposal.back);

  const frontValid = front.trim().length > 0 && front.length <= 200;
  const backValid = back.trim().length > 0 && back.length <= 500;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-lg">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Edytuj fiszkę</h2>
          <p className="text-xs text-muted-foreground">Limit: 200 znaków (przód), 500 znaków (tył).</p>
        </div>
        <div className="mt-4 space-y-3">
          <label className="text-sm font-medium" htmlFor="edit-front">
            Przód
          </label>
          <textarea
            id="edit-front"
            className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={front}
            onChange={(event) => setFront(event.target.value)}
          />
          <label className="text-sm font-medium" htmlFor="edit-back">
            Tył
          </label>
          <textarea
            id="edit-back"
            className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={back}
            onChange={(event) => setBack(event.target.value)}
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Anuluj
          </Button>
          <Button
            onClick={() => onSave({ front: front.trim(), back: back.trim() })}
            disabled={!frontValid || !backValid}
          >
            Zapisz
          </Button>
        </div>
      </div>
    </div>
  );
};

const SaveAcceptedBar = ({
  acceptedCount,
  isSaving,
  success,
  onSave,
  error,
}: {
  acceptedCount: number;
  isSaving: boolean;
  success?: boolean;
  error?: string | null;
  onSave: () => void;
}) => (
  <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
    <div className="text-sm">
      {acceptedCount > 0 ? `Gotowe do zapisu: ${acceptedCount}` : "Zaakceptuj propozycje, aby je zapisać."}
    </div>
    <div className="flex items-center gap-3">
      {success && (
        <span className="text-sm text-green-700">
          Zapisano.{" "}
          <a className="underline" href="/flashcards">
            Przejdź do Moich fiszek
          </a>
        </span>
      )}
      {error && <span className="text-sm text-destructive">{error}</span>}
      <Button onClick={onSave} disabled={acceptedCount === 0 || isSaving}>
        {isSaving ? "Zapisywanie..." : "Zapisz zaakceptowane"}
      </Button>
    </div>
  </section>
);

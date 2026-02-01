import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  useFlashcards,
  type FlashcardListItemViewModel,
  type FlashcardsSortOption,
  type FormErrorViewModel,
} from '@/components/hooks/useFlashcards';
import type { CreateFlashcardCommand, FlashcardSource, UpdateFlashcardCommand } from '@/types';

const sourceLabels: Record<FlashcardSource, string> = {
  'ai-full': 'AI (pełne)',
  'ai-edited': 'AI (edytowane)',
  manual: 'Manualne',
};

const sortOptions: { label: string; value: FlashcardsSortOption }[] = [
  { label: 'Utworzone: od najnowszych', value: { field: 'created_at', order: 'desc' } },
  { label: 'Utworzone: od najstarszych', value: { field: 'created_at', order: 'asc' } },
  { label: 'Zaktualizowane: od najnowszych', value: { field: 'updated_at', order: 'desc' } },
  { label: 'Zaktualizowane: od najstarszych', value: { field: 'updated_at', order: 'asc' } },
];

export const FlashcardsPage = () => {
  const { state, totalPages, setSource, setSort, setPage, refresh, createFlashcard, updateFlashcard, deleteFlashcard } =
    useFlashcards();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FlashcardListItemViewModel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FlashcardListItemViewModel | null>(null);
  const [isCreateSaving, setIsCreateSaving] = useState(false);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [isDeleteSaving, setIsDeleteSaving] = useState(false);

  const selectedSort = useMemo(
    () =>
      sortOptions.find(
        (option) =>
          option.value.field === state.query.sort && option.value.order === state.query.order,
      ) ?? sortOptions[0],
    [state.query.order, state.query.sort],
  );

  const handleCreate = useCallback(
    async (payload: CreateFlashcardCommand, keepOpen?: boolean) => {
      setIsCreateSaving(true);
      const result = await createFlashcard(payload, keepOpen);
      setIsCreateSaving(false);
      if (result.ok && !result.keepOpen) {
        setIsCreateOpen(false);
      }
      return result.ok;
    },
    [createFlashcard],
  );

  const handleEdit = useCallback(
    async (id: number, payload: UpdateFlashcardCommand) => {
      setIsEditSaving(true);
      const ok = await updateFlashcard(id, payload);
      setIsEditSaving(false);
      if (ok) {
        setEditTarget(null);
      }
    },
    [updateFlashcard],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) {
      return;
    }
    setIsDeleteSaving(true);
    const ok = await deleteFlashcard(deleteTarget.id);
    setIsDeleteSaving(false);
    if (ok) {
      setDeleteTarget(null);
    }
  }, [deleteFlashcard, deleteTarget]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Moje fiszki</h1>
        <p className="text-sm text-muted-foreground">
          Zarządzaj zapisanymi fiszkami, filtruj źródła i sortuj listę.
        </p>
      </header>

      <FlashcardsToolbar
        source={state.query.source}
        sort={selectedSort.value}
        onSourceChange={setSource}
        onSortChange={setSort}
        onAddManual={() => setIsCreateOpen(true)}
      />

      {state.error && <ErrorBanner error={state.error} onRetry={refresh} />}

      {state.isLoading ? (
        <LoadingSkeleton />
      ) : (
        <FlashcardsList
          items={state.items}
          onEdit={setEditTarget}
          onDelete={setDeleteTarget}
          onAddManual={() => setIsCreateOpen(true)}
        />
      )}

      <Pagination
        page={state.meta.page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {isCreateOpen && (
        <FlashcardCreateSheet
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSave={handleCreate}
          isSaving={isCreateSaving}
          error={state.error}
        />
      )}

      {editTarget && (
        <FlashcardEditSheet
          open={Boolean(editTarget)}
          initialValue={editTarget}
          onOpenChange={(open) => {
            if (!open) {
              setEditTarget(null);
            }
          }}
          onSave={(payload) => handleEdit(editTarget.id, payload)}
          isSaving={isEditSaving}
          error={state.error}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          open={Boolean(deleteTarget)}
          isDeleting={isDeleteSaving}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTarget(null);
            }
          }}
          onConfirm={handleDelete}
        />
      )}
    </main>
  );
};

const FlashcardsToolbar = ({
  source,
  sort,
  onSourceChange,
  onSortChange,
  onAddManual,
}: {
  source?: FlashcardSource;
  sort: FlashcardsSortOption;
  onSourceChange: (source?: FlashcardSource) => void;
  onSortChange: (sort: FlashcardsSortOption) => void;
  onAddManual: () => void;
}) => {
  const sortId = useId();
  const sourceId = useId();

  return (
    <section className="flex flex-wrap items-end justify-between gap-4 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={sourceId}>
            Źródło
          </label>
          <select
            id={sourceId}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={source ?? 'all'}
            onChange={(event) =>
              onSourceChange(event.target.value === 'all' ? undefined : (event.target.value as FlashcardSource))
            }
          >
            <option value="all">Wszystkie</option>
            <option value="ai-full">AI (pełne)</option>
            <option value="ai-edited">AI (edytowane)</option>
            <option value="manual">Manualne</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={sortId}>
            Sortowanie
          </label>
          <select
            id={sortId}
            className="h-9 min-w-[220px] rounded-md border border-input bg-background px-3 text-sm"
            value={`${sort.field}-${sort.order}`}
            onChange={(event) => {
              const [field, order] = event.target.value.split('-') as [
                FlashcardsSortOption['field'],
                FlashcardsSortOption['order'],
              ];
              onSortChange({ field, order });
            }}
          >
            {sortOptions.map((option) => (
              <option key={option.label} value={`${option.value.field}-${option.value.order}`}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Button onClick={onAddManual}>Dodaj ręcznie</Button>
    </section>
  );
};

const FlashcardsList = ({
  items,
  onEdit,
  onDelete,
  onAddManual,
}: {
  items: FlashcardListItemViewModel[];
  onEdit: (item: FlashcardListItemViewModel) => void;
  onDelete: (item: FlashcardListItemViewModel) => void;
  onAddManual: () => void;
}) => {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        <p>Brak fiszek do wyświetlenia.</p>
        <Button variant="outline" size="sm" onClick={onAddManual}>
          Dodaj pierwszą fiszkę
        </Button>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      {items.map((item) => (
        <FlashcardCard
          key={item.id}
          item={item}
          onEdit={() => onEdit(item)}
          onDelete={() => onDelete(item)}
        />
      ))}
    </section>
  );
};

const FlashcardCard = ({
  item,
  onEdit,
  onDelete,
}: {
  item: FlashcardListItemViewModel;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <article className="rounded-lg border bg-card p-4 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Przód</div>
        <p className="text-sm">{item.front}</p>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tył</div>
        <p className="text-sm">{item.back}</p>
      </div>
      <span className="rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">
        {sourceLabels[item.source]}
      </span>
    </div>
    <div className="mt-3 text-xs text-muted-foreground">
      Utworzono: {item.createdAt} · Zaktualizowano: {item.updatedAt}
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      <Button size="sm" onClick={onEdit} disabled={item.isUpdating}>
        {item.isUpdating ? 'Zapisywanie...' : 'Edytuj'}
      </Button>
      <Button size="sm" variant="destructive" onClick={onDelete} disabled={item.isDeleting}>
        {item.isDeleting ? 'Usuwanie...' : 'Usuń'}
      </Button>
    </div>
  </article>
);

const Pagination = ({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">
        Strona {page} z {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          Poprzednia
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
        >
          Następna
        </Button>
      </div>
    </nav>
  );
};

const ErrorBanner = ({
  error,
  onRetry,
}: {
  error: FormErrorViewModel;
  onRetry?: () => void;
}) => (
  <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span>{error.message}</span>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Spróbuj ponownie
        </Button>
      )}
    </div>
  </div>
);

const LoadingSkeleton = () => (
  <div className="space-y-3">
    {[0, 1, 2].map((item) => (
      <div key={item} className="h-24 rounded-lg border bg-muted/30" />
    ))}
  </div>
);

const FlashcardCreateSheet = ({
  open,
  onOpenChange,
  onSave,
  isSaving,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: CreateFlashcardCommand, keepOpen?: boolean) => Promise<boolean>;
  isSaving: boolean;
  error?: FormErrorViewModel;
}) => {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  useEffect(() => {
    if (open) {
      setFront('');
      setBack('');
    }
  }, [open]);

  const frontValid = front.trim().length > 0 && front.length <= 200;
  const backValid = back.trim().length > 0 && back.length <= 500;

  const handleSave = async (keepOpen?: boolean) => {
    if (!frontValid || !backValid) {
      return;
    }
    const ok = await onSave(
      { front: front.trim(), back: back.trim(), source: 'manual', generation_id: null },
      keepOpen,
    );
    if (ok && keepOpen) {
      setFront('');
      setBack('');
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Dodaj fiszkę ręcznie"
    >
      <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-lg">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Dodaj fiszkę ręcznie</h2>
          <p className="text-xs text-muted-foreground">Limit: 200 znaków (przód), 500 znaków (tył).</p>
        </div>
        <div className="mt-4 space-y-3">
          <label className="text-sm font-medium" htmlFor="create-front">
            Przód
          </label>
          <textarea
            id="create-front"
            className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={front}
            onChange={(event) => setFront(event.target.value)}
          />
          <label className="text-sm font-medium" htmlFor="create-back">
            Tył
          </label>
          <textarea
            id="create-back"
            className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={back}
            onChange={(event) => setBack(event.target.value)}
          />
        </div>
        {error && <div className="mt-3 text-xs text-destructive">{error.message}</div>}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button variant="outline" onClick={() => handleSave(true)} disabled={!frontValid || !backValid || isSaving}>
            Zapisz i dodaj kolejną
          </Button>
          <Button onClick={() => handleSave(false)} disabled={!frontValid || !backValid || isSaving}>
            {isSaving ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const FlashcardEditSheet = ({
  open,
  initialValue,
  onOpenChange,
  onSave,
  isSaving,
  error,
}: {
  open: boolean;
  initialValue: FlashcardListItemViewModel;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: UpdateFlashcardCommand) => void;
  isSaving: boolean;
  error?: FormErrorViewModel;
}) => {
  const [front, setFront] = useState(initialValue.front);
  const [back, setBack] = useState(initialValue.back);

  useEffect(() => {
    if (open) {
      setFront(initialValue.front);
      setBack(initialValue.back);
    }
  }, [initialValue.back, initialValue.front, open]);

  const frontValid = front.trim().length > 0 && front.length <= 200;
  const backValid = back.trim().length > 0 && back.length <= 500;

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Edytuj fiszkę"
    >
      <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-lg">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Edytuj fiszkę</h2>
          <p className="text-xs text-muted-foreground">Źródło: {sourceLabels[initialValue.source]}</p>
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
        {error && <div className="mt-3 text-xs text-destructive">{error.message}</div>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button
            onClick={() => onSave({ front: front.trim(), back: back.trim() })}
            disabled={!frontValid || !backValid || isSaving}
          >
            {isSaving ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmDialog = ({
  open,
  isDeleting,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) => {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Potwierdzenie usunięcia"
    >
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Potwierdź usunięcie</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Usunięcie fiszki jest trwałe i nie można go cofnąć.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Usuwanie...' : 'Usuń'}
          </Button>
        </div>
      </div>
    </div>
  );
};

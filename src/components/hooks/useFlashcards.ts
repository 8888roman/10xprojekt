import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  CreateFlashcardCommand,
  ErrorResponseDto,
  FlashcardDto,
  FlashcardListQueryDto,
  FlashcardListResponseDto,
  FlashcardSource,
  PaginationMeta,
  UpdateFlashcardCommand,
} from '@/types';

export type FlashcardListItemViewModel = {
  id: number;
  front: string;
  back: string;
  source: FlashcardSource;
  createdAt: string;
  updatedAt: string;
  isDeleting?: boolean;
  isUpdating?: boolean;
};

export type FlashcardsSortOption = {
  field: 'created_at' | 'updated_at';
  order: 'asc' | 'desc';
};

export type FormErrorViewModel = {
  message: string;
  code?: string;
  field?: 'front' | 'back';
};

export type FlashcardsViewState = {
  items: FlashcardListItemViewModel[];
  meta: PaginationMeta;
  query: FlashcardListQueryDto;
  isLoading: boolean;
  error?: FormErrorViewModel;
};

const defaultMeta: PaginationMeta = {
  page: 1,
  limit: 20,
  total: 0,
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' });
};

const mapFlashcard = (item: FlashcardDto): FlashcardListItemViewModel => ({
  id: item.id,
  front: item.front,
  back: item.back,
  source: item.source,
  createdAt: formatDateTime(item.created_at),
  updatedAt: formatDateTime(item.updated_at),
});

const buildQueryString = (query: FlashcardListQueryDto) => {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.source) params.set('source', query.source);
  if (query.sort) params.set('sort', query.sort);
  if (query.order) params.set('order', query.order);
  if (query.generation_id) params.set('generation_id', String(query.generation_id));
  return params.toString();
};

const parseError = async (response: Response) => {
  let message = 'Wystąpił błąd. Spróbuj ponownie.';
  let code: FormErrorViewModel['code'];
  try {
    const payload = (await response.json()) as Partial<ErrorResponseDto>;
    if (payload?.message) {
      message = payload.message;
    }
    if (payload?.code) {
      code = payload.code;
    }
  } catch {
    // ignore parsing errors
  }
  return { message, code };
};

export const useFlashcards = () => {
  const [items, setItems] = useState<FlashcardListItemViewModel[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(defaultMeta);
  const [query, setQuery] = useState<FlashcardListQueryDto>({
    page: 1,
    limit: 20,
    sort: 'created_at',
    order: 'desc',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<FormErrorViewModel | undefined>();

  const totalPages = useMemo(() => Math.max(1, Math.ceil(meta.total / meta.limit)), [meta]);

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    const queryString = buildQueryString(query);

    try {
      const response = await fetch(`/api/flashcards?${queryString}`);
      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!response.ok) {
        setError(await parseError(response));
        return;
      }
      const data = (await response.json()) as FlashcardListResponseDto;
      setItems(data.data.map(mapFlashcard));
      setMeta(data.meta);
    } catch {
      setError({ message: 'Brak połączenia z serwerem. Spróbuj ponownie.' });
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const updateQuery = useCallback((next: Partial<FlashcardListQueryDto>) => {
    setQuery((current) => ({ ...current, ...next }));
  }, []);

  const setSource = useCallback(
    (source?: FlashcardSource) => updateQuery({ source, page: 1 }),
    [updateQuery],
  );

  const setSort = useCallback(
    (sort: FlashcardsSortOption) =>
      updateQuery({ sort: sort.field, order: sort.order, page: 1 }),
    [updateQuery],
  );

  const setPage = useCallback((page: number) => updateQuery({ page }), [updateQuery]);

  const createFlashcard = useCallback(
    async (payload: CreateFlashcardCommand, keepOpen?: boolean) => {
      setError(undefined);
      try {
        const response = await fetch('/api/flashcards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.status === 401) {
          window.location.href = '/login';
          return { ok: false, keepOpen };
        }

        if (!response.ok) {
          setError(await parseError(response));
          return { ok: false, keepOpen };
        }

        const data = (await response.json()) as FlashcardDto;
        setItems((current) => (query.page === 1 ? [mapFlashcard(data), ...current] : current));
        setMeta((current) => ({ ...current, total: current.total + 1 }));
        if (query.page !== 1) {
          fetchList();
        }
        return { ok: true, keepOpen };
      } catch {
        setError({ message: 'Brak połączenia z serwerem. Spróbuj ponownie.' });
        return { ok: false, keepOpen };
      }
    },
    [fetchList, query.page],
  );

  const updateFlashcard = useCallback(async (id: number, payload: UpdateFlashcardCommand) => {
    setError(undefined);
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, isUpdating: true } : item)),
    );
    try {
      const response = await fetch(`/api/flashcards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        window.location.href = '/login';
        return false;
      }

      if (!response.ok) {
        setError(await parseError(response));
        return false;
      }

      const data = (await response.json()) as FlashcardDto;
      setItems((current) =>
        current.map((item) => (item.id === id ? mapFlashcard(data) : item)),
      );
      return true;
    } catch {
      setError({ message: 'Brak połączenia z serwerem. Spróbuj ponownie.' });
      return false;
    } finally {
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, isUpdating: false } : item)),
      );
    }
  }, []);

  const deleteFlashcard = useCallback(async (id: number) => {
    setError(undefined);
    const previous = items;
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, isDeleting: true } : item)),
    );

    try {
      const response = await fetch(`/api/flashcards/${id}`, { method: 'DELETE' });
      if (response.status === 401) {
        window.location.href = '/login';
        return false;
      }
      if (!response.ok) {
        setError(await parseError(response));
        setItems(previous);
        return false;
      }
      setItems((current) => current.filter((item) => item.id !== id));
      setMeta((current) => {
        const nextTotal = Math.max(0, current.total - 1);
        return { ...current, total: nextTotal };
      });
      if (items.length === 1 && meta.page > 1) {
        setQuery((current) => ({ ...current, page: current.page ? current.page - 1 : 1 }));
      }
      return true;
    } catch {
      setError({ message: 'Brak połączenia z serwerem. Spróbuj ponownie.' });
      setItems(previous);
      return false;
    }
  }, [items, meta.page]);

  return {
    state: { items, meta, query, isLoading, error } satisfies FlashcardsViewState,
    totalPages,
    setSource,
    setSort,
    setPage,
    refresh: fetchList,
    createFlashcard,
    updateFlashcard,
    deleteFlashcard,
  };
};

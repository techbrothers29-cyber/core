import { useState, useEffect, useCallback, useRef } from 'react';

interface UseDraftAutosaveOptions<T> {
  initialData: T;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}

interface UseDraftAutosaveReturn<T> {
  draft: T;
  updateDraft: (field: keyof T, value: any) => void;
  setDraft: (data: T) => void;
  isTyping: boolean;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  flushDraft: () => Promise<void>;
  resetDraft: () => void;
}

export function useDraftAutosave<T extends Record<string, any>>({
  initialData,
  onSave,
  debounceMs = 1200,
  enabled = true,
}: UseDraftAutosaveOptions<T>): UseDraftAutosaveReturn<T> {
  const [draft, setDraft] = useState<T>(initialData);
  const [isTyping, setIsTyping] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isComposingRef = useRef(false);
  const initialDataRef = useRef(initialData);
  const prevInitialDataIdRef = useRef<string | undefined>(undefined);

  // Update initial data ref and reset draft when initialData changes (different record)
  useEffect(() => {
    const currentId = (initialData as any)?.id;
    const prevId = prevInitialDataIdRef.current;

    // If initialData has an ID and it's different from the previous one, reset draft
    if (currentId !== undefined && currentId !== prevId) {
      setDraft(initialData);
      setIsDirty(false);
      setIsTyping(false);
      setLastSavedAt(null);
      prevInitialDataIdRef.current = currentId;
    }

    initialDataRef.current = initialData;
  }, [initialData]);

  // Flush (save immediately)
  const flushDraft = useCallback(async () => {
    if (!isDirty || !enabled || isComposingRef.current) return;

    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    setIsSaving(true);
    setIsTyping(false);

    try {
      await onSave(draft);
      setIsDirty(false);
      setLastSavedAt(new Date());
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setIsSaving(false);
    }
  }, [isDirty, enabled, draft, onSave]);

  // Update draft field
  const updateDraft = useCallback((field: keyof T, value: any) => {
    setDraft(prev => ({ ...prev, [field]: value }));
    setIsTyping(true);
    setIsDirty(true);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer for autosave
    if (enabled && !isComposingRef.current) {
      debounceTimerRef.current = setTimeout(() => {
        setIsTyping(false);
        // Trigger save via effect
      }, debounceMs);
    }
  }, [enabled, debounceMs]);

  // Auto-save when typing stops
  useEffect(() => {
    if (!isTyping && isDirty && enabled && !isComposingRef.current) {
      flushDraft();
    }
  }, [isTyping, isDirty, enabled, flushDraft]);

  // Reset draft to initial
  const resetDraft = useCallback(() => {
    setDraft(initialDataRef.current);
    setIsDirty(false);
    setIsTyping(false);
    setLastSavedAt(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle composition events (IME)
  useEffect(() => {
    const handleCompositionStart = () => {
      isComposingRef.current = true;
    };

    const handleCompositionEnd = () => {
      isComposingRef.current = false;
    };

    document.addEventListener('compositionstart', handleCompositionStart);
    document.addEventListener('compositionend', handleCompositionEnd);

    return () => {
      document.removeEventListener('compositionstart', handleCompositionStart);
      document.removeEventListener('compositionend', handleCompositionEnd);
    };
  }, []);

  // Flush on visibility change and beforeunload
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isDirty) {
        flushDraft();
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        flushDraft();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, flushDraft]);

  return {
    draft,
    updateDraft,
    setDraft,
    isTyping,
    isDirty,
    isSaving,
    lastSavedAt,
    flushDraft,
    resetDraft,
  };
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ExportRecipe, WorkspaceStatus } from '@moduprompt/types';
import {
  normalizeStatusSchema,
  type WorkspaceSettingsRecord,
  type WorkspaceStore,
} from '@moduprompt/snippet-store';
import { useGovernanceStore } from '../provider';

const DEFAULT_STATUSES: WorkspaceStatus[] = [
  { key: 'draft', name: 'Draft', color: '#475569', order: 1 },
  { key: 'review', name: 'In Review', color: '#f59e0b', order: 2 },
  { key: 'approved', name: 'Approved', color: '#10b981', order: 3, isFinal: true },
];

const DEFAULT_SCHEMA_VERSION = 1;

const createDefaultSettings = (): WorkspaceSettingsRecord => ({
  id: 'workspace',
  statuses: normalizeStatusSchema(DEFAULT_STATUSES),
  exportRecipes: [],
  schemaVersion: DEFAULT_SCHEMA_VERSION,
  updatedAt: Date.now(),
});

interface GovernanceState {
  loading: boolean;
  saving: boolean;
  dirty: boolean;
  error?: string;
  persisted: WorkspaceSettingsRecord | null;
  draftStatuses: WorkspaceStatus[];
  exportRecipes: ExportRecipe[];
}

interface UseWorkspaceGovernanceOptions {
  store?: WorkspaceStore;
}

export const useWorkspaceGovernance = ({ store: override }: UseWorkspaceGovernanceOptions = {}) => {
  const contextStore = useGovernanceStore();
  const store = override ?? contextStore;

  const [state, setState] = useState<GovernanceState>(() => {
    const defaults = createDefaultSettings();
    return {
      loading: true,
      saving: false,
      dirty: false,
      error: undefined,
      persisted: null,
      draftStatuses: defaults.statuses,
      exportRecipes: defaults.exportRecipes,
    } satisfies GovernanceState;
  });

  const draftRef = useRef<WorkspaceStatus[]>(state.draftStatuses);


  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: undefined }));
    try {
      const settings = await store.getWorkspaceSettings();
      if (settings) {
        const normalized = normalizeStatusSchema(settings.statuses);
        draftRef.current = normalized;
        setState({
          loading: false,
          saving: false,
          dirty: false,
          error: undefined,
          persisted: { ...settings, statuses: normalized },
          draftStatuses: normalized,
          exportRecipes: [...settings.exportRecipes],
        });
      } else {
        const defaults = createDefaultSettings();
        draftRef.current = defaults.statuses;
        setState({
          loading: false,
          saving: false,
          dirty: false,
          error: undefined,
          persisted: null,
          draftStatuses: defaults.statuses,
          exportRecipes: defaults.exportRecipes,
        });
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unable to load governance settings.',
      }));
    }
  }, [store]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setDraftStatuses = useCallback((next: WorkspaceStatus[] | ((current: WorkspaceStatus[]) => WorkspaceStatus[])) => {
    setState((prev) => {
      const value = typeof next === 'function' ? next(prev.draftStatuses) : next;
      draftRef.current = value;
      return {
        ...prev,
        draftStatuses: value,
        dirty: true,
        error: undefined,
      } satisfies GovernanceState;
    });
  }, []);

  const resetDraft = useCallback(() => {
    setState((prev) => {
      const source = prev.persisted?.statuses ?? createDefaultSettings().statuses;
      draftRef.current = [...source];
      return {
        ...prev,
        draftStatuses: [...source],
        dirty: false,
        error: undefined,
      } satisfies GovernanceState;
    });
  }, []);

  const saveDraft = useCallback(async () => {
    const snapshot = state;
    setState((prev) => ({ ...prev, saving: true, error: undefined }));

    const normalized = normalizeStatusSchema(draftRef.current);
    if (!normalized.length) {
      const error = 'At least one status is required.';
      setState((prev) => ({ ...prev, saving: false, error }));
      throw new Error(error);
    }

    const record: WorkspaceSettingsRecord = {
      id: 'workspace',
      schemaVersion: snapshot.persisted?.schemaVersion ?? DEFAULT_SCHEMA_VERSION,
      exportRecipes: snapshot.persisted?.exportRecipes ?? snapshot.exportRecipes ?? [],
      lastExportedAt: snapshot.persisted?.lastExportedAt,
      statuses: normalized,
      updatedAt: Date.now(),
    };

    try {
      await store.saveWorkspaceSettings(record);
      draftRef.current = normalized;
      setState({
        loading: false,
        saving: false,
        dirty: false,
        error: undefined,
        persisted: record,
        draftStatuses: normalized,
        exportRecipes: [...record.exportRecipes],
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        saving: false,
        error: error instanceof Error ? error.message : 'Unable to save governance settings.',
      }));
      throw error;
    }
  }, [state, store]);

  const effectiveStatuses = useMemo(() => {
    if (state.persisted) {
      return normalizeStatusSchema(state.persisted.statuses);
    }
    return normalizeStatusSchema(state.draftStatuses);
  }, [state.persisted, state.draftStatuses]);

  return {
    loading: state.loading,
    saving: state.saving,
    dirty: state.dirty,
    error: state.error,
    statuses: effectiveStatuses,
    draftStatuses: state.draftStatuses,
    exportRecipes: state.exportRecipes,
    setDraftStatuses,
    resetDraft,
    saveDraft,
    refresh,
  } as const;
};

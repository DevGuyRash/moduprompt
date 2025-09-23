import { createContext, useContext, useMemo, type ReactNode, type FC } from 'react';
import { createStore, type StoreApi, type StateCreator } from 'zustand/vanilla';
import { useStore } from 'zustand';

export interface ScopedStore<TState extends object> {
  /**
   * Factory creating a new isolated Zustand store instance.
   */
  create: () => StoreApi<TState>;
  /**
   * React provider exposing the store via context to avoid prop drilling.
   */
  Provider: FC<{ store?: StoreApi<TState>; children: ReactNode }>;
  /**
   * Hook selecting state slices from the scoped store.
   */
  useStore: <TSelection>(
    selector: (state: TState) => TSelection,
    equalityFn?: (a: TSelection, b: TSelection) => boolean,
  ) => TSelection;
  /**
   * Accessor returning the underlying store API.
   */
  useStoreApi: () => StoreApi<TState>;
}

export const createScopedStore = <TState extends object>(
  initializer: StateCreator<TState>,
): ScopedStore<TState> => {
  const Context = createContext<StoreApi<TState> | null>(null);

  const Provider: ScopedStore<TState>['Provider'] = ({ store, children }) => {
    const value = useMemo(() => store ?? createStore(initializer), [store]);
    return <Context.Provider value={value}>{children}</Context.Provider>;
  };

  const useScopedStore: ScopedStore<TState>['useStore'] = (selector, equalityFn) => {
    const store = useContext(Context);
    if (!store) {
      throw new Error('Scoped store provider is missing in the component hierarchy.');
    }
    return useStore(store, selector, equalityFn);
  };

  const useStoreApi: ScopedStore<TState>['useStoreApi'] = () => {
    const store = useContext(Context);
    if (!store) {
      throw new Error('Scoped store provider is missing in the component hierarchy.');
    }
    return store;
  };

  return {
    create: () => createStore(initializer),
    Provider,
    useStore: useScopedStore,
    useStoreApi,
  };
};

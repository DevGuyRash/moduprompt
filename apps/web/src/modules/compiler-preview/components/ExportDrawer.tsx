import { useId, useMemo } from 'react';
import type { ExportRecipe } from '@moduprompt/types';

export interface ExportDrawerProps {
  recipes: ExportRecipe[];
  selectedRecipeId?: string;
  onSelect?: (recipeId: string) => void;
  onExport?: () => void;
  disabled?: boolean;
  busy?: boolean;
  blocked?: boolean;
}

const containerClasses =
  'flex flex-col gap-3 rounded-lg border border-surface bg-surface-subtle p-4 text-sm shadow-sm';
const labelClasses = 'flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-foreground-muted';
const selectClasses =
  'mt-1 w-full rounded-md border border-surface bg-surface px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30';
const buttonPrimaryClasses =
  'inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition enabled:hover:bg-brand/90 enabled:focus-visible:outline enabled:focus-visible:outline-2 enabled:focus-visible:outline-offset-2 enabled:focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60';
const mutedTextClasses = 'text-xs text-foreground-muted';

export const ExportDrawer = ({
  recipes,
  selectedRecipeId,
  onSelect,
  onExport,
  disabled,
  busy,
  blocked,
}: ExportDrawerProps): JSX.Element => {
  const selectId = useId();
  const sortedRecipes = useMemo(() => [...recipes].sort((a, b) => a.name.localeCompare(b.name)), [recipes]);
  const effectiveSelected = useMemo(() => {
    if (!selectedRecipeId && sortedRecipes.length) {
      return sortedRecipes[0]!.id;
    }
    return selectedRecipeId;
  }, [selectedRecipeId, sortedRecipes]);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onSelect?.(event.target.value);
  };

  return (
    <section aria-label="Export controls" className={containerClasses}>
      <div>
        <label className={labelClasses} htmlFor={selectId}>
          <span>Export Recipe</span>
          {busy ? <span className="text-[10px] uppercase text-foreground-muted">Preparing…</span> : null}
        </label>
        {sortedRecipes.length ? (
          <select
            id={selectId}
            value={effectiveSelected ?? ''}
            onChange={handleChange}
            className={selectClasses}
            disabled={disabled || busy}
          >
            {sortedRecipes.map((recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.name}
              </option>
            ))}
          </select>
        ) : (
          <p className={mutedTextClasses} role="note">
            No export recipes configured. Configure recipes in governance settings to enable exports.
          </p>
        )}
      </div>
      <button
        type="button"
        className={buttonPrimaryClasses}
        onClick={onExport}
        disabled={disabled || busy || blocked || !sortedRecipes.length || !effectiveSelected}
      >
        {blocked ? 'Resolve Preflight Issues' : 'Export'}
      </button>
      {blocked ? (
        <p className={`${mutedTextClasses} text-danger`} role="alert">
          Preflight detected blocking issues. Resolve them before exporting.
        </p>
      ) : null}
    </section>
  );
};

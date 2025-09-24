import type { HexColor, WorkspaceStatus } from '@moduprompt/types';

export const DEFAULT_STATUS_COLOR: HexColor = '#475569';

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

const expandShortHex = (value: string): HexColor => {
  if (value.length === 4) {
    const [, r, g, b] = value;
    return `#${r}${r}${g}${g}${b}${b}` as HexColor;
  }
  return value as HexColor;
};

export const normalizeStatusColor = (value?: string | null): HexColor => {
  if (!value) {
    return DEFAULT_STATUS_COLOR;
  }
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return DEFAULT_STATUS_COLOR;
  }
  const candidate = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (!HEX_PATTERN.test(candidate)) {
    return DEFAULT_STATUS_COLOR;
  }
  return expandShortHex(candidate);
};

const trimDescription = (description?: string | null): string | undefined => {
  if (typeof description !== 'string') {
    return undefined;
  }
  const trimmed = description.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const normalizeStatusSchema = (statuses: WorkspaceStatus[]): WorkspaceStatus[] => {
  const seen = new Set<string>();
  const normalized: WorkspaceStatus[] = [];

  statuses.forEach((status, index) => {
    const key = (status.key ?? '').trim().toLowerCase();
    const name = (status.name ?? '').trim();
    if (!key || !name) {
      return;
    }
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    normalized.push({
      key,
      name,
      color: normalizeStatusColor(status.color),
      description: trimDescription(status.description),
      isFinal: status.isFinal ?? false,
      order: status.order ?? index + 1,
    });
  });

  normalized.sort((a, b) => {
    const orderDiff = (a.order ?? 0) - (b.order ?? 0);
    if (orderDiff !== 0) {
      return orderDiff;
    }
    return a.name.localeCompare(b.name);
  });

  let lastOrder = Number.NEGATIVE_INFINITY;
  return normalized.map((status) => {
    let order = status.order ?? 0;
    if (order <= lastOrder) {
      order = lastOrder + 1;
    }
    lastOrder = order;
    return {
      ...status,
      order,
    } satisfies WorkspaceStatus;
  });
};

export interface StatusIndex {
  ordered: WorkspaceStatus[];
  byKey: Map<string, WorkspaceStatus>;
  finalKeys: Set<string>;
}

export const buildStatusIndex = (statuses: WorkspaceStatus[]): StatusIndex => {
  const ordered = normalizeStatusSchema(statuses);
  const byKey = new Map<string, WorkspaceStatus>();
  const finalKeys = new Set<string>();

  for (const status of ordered) {
    byKey.set(status.key, status);
    if (status.isFinal) {
      finalKeys.add(status.key);
    }
  }

  return { ordered, byKey, finalKeys } satisfies StatusIndex;
};

export const findStatus = (
  source: StatusIndex | WorkspaceStatus[],
  key: string | null | undefined,
): WorkspaceStatus | undefined => {
  if (!key) {
    return undefined;
  }
  const normalizedKey = key.trim().toLowerCase();
  if (!normalizedKey) {
    return undefined;
  }

  if (Array.isArray(source)) {
    const index = buildStatusIndex(source);
    return index.byKey.get(normalizedKey);
  }

  return source.byKey.get(normalizedKey);
};

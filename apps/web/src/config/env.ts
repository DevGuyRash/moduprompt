export interface RuntimeEnv {
  /** Base URL for Fastify API requests; defaults to same-origin /api. */
  apiBaseUrl: string;
  /** Base URL for websocket sync services when enabled. */
  websocketUrl: string;
  /** Semantic version of the client build injected at compile time. */
  releaseVersion: string;
  /** Feature flags toggled at build/runtime. */
  featureFlags: {
    offlinePersistence: boolean;
    snippetAuditing: boolean;
    governanceRules: boolean;
  };
}

type RawValue = string | boolean | undefined;

const toBool = (value: RawValue, fallback = false): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const rawEnv = import.meta.env;

export const runtimeEnv: RuntimeEnv = Object.freeze({
  apiBaseUrl: rawEnv.MODUPROMPT_API_BASE_URL ?? '/api',
  websocketUrl: rawEnv.MODUPROMPT_WS_URL ?? '',
  releaseVersion: rawEnv.MODUPROMPT_RELEASE ?? 'dev',
  featureFlags: {
    offlinePersistence: toBool(rawEnv.MODUPROMPT_FLAG_OFFLINE ?? 'true', true),
    snippetAuditing: toBool(rawEnv.MODUPROMPT_FLAG_SNIPPET_AUDIT),
    governanceRules: toBool(rawEnv.MODUPROMPT_FLAG_GOVERNANCE),
  },
});

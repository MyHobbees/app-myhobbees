import posthog from 'posthog-js';

let initialized = false;

export function initPostHog(key: string, host: string) {
  if (initialized || typeof document === 'undefined' || !key) return;
  initialized = true;

  posthog.init(key, {
    api_host: host,
    person_profiles: 'identified_only',
    capture_pageview: 'history_change',
  });
}

export function capture(event: string, properties?: Record<string, unknown>) {
  if (!initialized || typeof window === 'undefined') return;
  posthog.capture(event, properties);
}

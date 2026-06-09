import type { WebhookRegistration } from './types.js';

/**
 * In-memory store for webhook registrations.
 *
 * Manages the lifecycle of webhook endpoint registrations, including
 * lookup by event, version, or ID. In production, this would be backed
 * by a database or persistent store.
 *
 * @example
 * ```ts
 * const store = new RegistrationStore();
 * store.register('reg-1', { url: 'https://example.com/hook', events: ['user.created'], version: 'v1' });
 * const reg = store.get('reg-1');
 * const forEvent = store.findByEvent('user.created');
 * ```
 */
export class RegistrationStore {
  private registrations: Map<string, WebhookRegistration>;

  constructor() {
    this.registrations = new Map();
  }

  /**
   * Register a webhook endpoint with its version.
   *
   * @param id - Unique identifier for this registration
   * @param registration - The webhook registration details
   */
  register(id: string, registration: WebhookRegistration): void {
    this.registrations.set(id, { ...registration });
  }

  /**
   * Unregister a webhook endpoint.
   *
   * @param id - The registration ID to remove
   * @returns `true` if the registration existed and was removed, `false` otherwise
   */
  unregister(id: string): boolean {
    return this.registrations.delete(id);
  }

  /**
   * Get a registration by its ID.
   *
   * @param id - The registration ID to look up
   * @returns The registration, or `undefined` if not found
   */
  get(id: string): WebhookRegistration | undefined {
    return this.registrations.get(id);
  }

  /**
   * Find all registrations that subscribe to a specific event.
   *
   * @param event - The event name to search for
   * @returns Array of matching registrations with their IDs
   */
  findByEvent(event: string): Array<{ id: string; registration: WebhookRegistration }> {
    const results: Array<{ id: string; registration: WebhookRegistration }> = [];

    for (const [id, registration] of this.registrations) {
      if (registration.events.includes(event)) {
        results.push({ id, registration });
      }
    }

    return results;
  }

  /**
   * Find all registrations targeting a specific API version.
   *
   * @param version - The version string to search for (e.g. `"v1"`, `"v2"`)
   * @returns Array of matching registrations with their IDs
   */
  findByVersion(version: string): Array<{ id: string; registration: WebhookRegistration }> {
    const results: Array<{ id: string; registration: WebhookRegistration }> = [];

    for (const [id, registration] of this.registrations) {
      if (registration.version === version) {
        results.push({ id, registration });
      }
    }

    return results;
  }

  /**
   * List all registered webhook endpoints.
   *
   * @returns Array of all registrations with their IDs
   */
  listAll(): Array<{ id: string; registration: WebhookRegistration }> {
    const results: Array<{ id: string; registration: WebhookRegistration }> = [];

    for (const [id, registration] of this.registrations) {
      results.push({ id, registration });
    }

    return results;
  }
}

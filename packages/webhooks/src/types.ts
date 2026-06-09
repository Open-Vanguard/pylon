/**
 * Registration for a webhook endpoint.
 *
 * Associates a webhook callback URL with a set of events and a specific
 * API version so that payloads can be automatically transformed.
 */
export interface WebhookRegistration {
  /** The URL to receive webhook POST requests. */
  url: string;
  /** List of event names this endpoint subscribes to (e.g. `["user.created", "user.updated"]`). */
  events: string[];
  /** The API version the consumer expects (e.g. `"v1"`, `"v2"`). */
  version: string;
  /** Optional shared secret for signing webhook payloads. */
  secret?: string;
  /** Optional additional headers to include in the webhook request. */
  headers?: Record<string, string>;
}

/**
 * Options for sending a webhook event.
 */
export interface WebhookSendOptions {
  /** The event name (e.g. `"user.created"`). */
  event: string;
  /** The event payload in the current (canonical) API version. Will be transformed per registration. */
  payload: Record<string, any>;
  /** The target webhook registration. */
  registration: WebhookRegistration;
  /**
   * Optional idempotency key for the delivery.
   * Auto-generated if not provided.
   */
  idempotencyKey?: string;
}

/**
 * Result of a single webhook delivery attempt.
 */
export interface WebhookResult {
  /**
   * HTTP status code returned by the webhook endpoint.
   * `0` indicates a delivery failure (network error or transform error).
   */
  status: number;
  /** The idempotency key used for the delivery. */
  idempotencyKey: string;
  /** Timestamp of when the webhook was sent. */
  timestamp: Date;
  /** Duration of the delivery attempt in milliseconds. */
  durationMs: number;
}

/**
 * Record of a webhook event that was sent.
 * Stored in the history log for replay and debugging.
 */
export interface WebhookEvent {
  /** Unique identifier for this event record. */
  id: string;
  /** The event name. */
  event: string;
  /** The API version the payload was transformed to for delivery. */
  version: string;
  /** The payload that was sent (transformed to the target version). */
  payload: any;
  /** Timestamp of when the event was sent. */
  timestamp: Date;
  /** The registration ID this event was delivered to. */
  registrationId: string;
}

/**
 * Options for replaying a historical webhook event.
 */
export interface ReplayOptions {
  /** The ID of the historical event to replay. */
  eventId: string;
  /** The target API version to transform the payload into for the replay. */
  targetVersion: string;
}

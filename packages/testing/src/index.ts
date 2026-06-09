/**
 * @pylon/testing - Testing utilities for Pylon API versioning.
 *
 * Features:
 * - timeTravel: run tests against every historical version automatically
 * - snapshotVersion: snapshot testing per version
 * - testTransform: unit test a single transform
 * - assertContract: verify transform properties (no data loss, reversibility)
 */

export { timeTravel } from './time-travel.js';
export type { VersionedRequest, TimeTravelOptions } from './time-travel.js';
export { snapshotVersion, type SnapshotResult } from './snapshot.js';
export { testTransform } from './test-transform.js';
export { assertContract, type ContractAssertion } from './assert-contract.js';

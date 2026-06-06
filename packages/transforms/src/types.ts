/** Input for rename utility: maps old key to new key */
export interface RenameMap {
  [oldKey: string]: string;
}

/** Options for defaults utility */
export interface DefaultsOptions {
  /** Max depth for deep merge. Default: Infinity */
  maxDepth?: number;
  /** Don't override existing values (only fill undefined/null) */
  deepFill?: boolean;
}

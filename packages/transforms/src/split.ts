/**
 * Split a string value at an index, returning the part.
 * Like String.split() but returns the segment.
 *
 * @example
 * split('John Doe', 0) // => 'John'
 * split('John Doe', 1) // => 'Doe'
 * split('John', 0)     // => 'John' (no separator found)
 *
 * Handles: null/undefined input (returns ''), empty string, missing separator
 */
export function split(
  value: string | null | undefined,
  index: number,
  separator: string = ' ',
): string {
  if (value == null) return '';
  const parts = value.split(separator);
  return parts[index] ?? '';
}

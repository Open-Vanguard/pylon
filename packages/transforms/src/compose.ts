/**
 * Compose multiple transform functions into one.
 * Functions are applied left-to-right.
 *
 * @example
 * const addName = (r) => ({ ...r, name: r.firstName });
 * const addEmail = (r) => ({ ...r, email: r.name + '@test.com' });
 * const transform = compose(addName, addEmail);
 * transform({ firstName: 'John' }) // => { firstName: 'John', name: 'John', email: 'John@test.com' }
 *
 * Supports both sync and async functions.
 * If any function returns a Promise, the composed function returns a Promise.
 */
export function compose<T>(
  ...fns: Array<(input: T) => T | Promise<T>>
): (input: T) => T | Promise<T> {
  return (input: T) => {
    let acc: T | Promise<T> = input;
    for (const fn of fns) {
      if (acc instanceof Promise) {
        acc = acc.then(fn);
      } else {
        acc = fn(acc);
      }
    }
    return acc;
  };
}

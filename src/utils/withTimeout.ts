/** Rejects with an error after `ms` if `promise` hasn't settled yet — GPS
 * fixes can hang indefinitely (e.g. no clear sky view), and this keeps the
 * UI from getting stuck waiting on it forever. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

interface Deferrable<T> {
  timeout: boolean;
  result?: T;
}

export class Deferred<T> {
  public promise: Promise<Deferrable<T>>;

  public resolve: (_: Deferrable<T>) => void;

  public reject: (_: Error) => void;

  constructor({
    onResolve,
    timeout,
  }: {
    onResolve?: () => void;
    timeout: number;
  }) {
    this.resolve = (_: Deferrable<T>): void => {};
    this.reject = (_: Error): void => {};

    const race = new Promise<Deferrable<T>>((resolve) => {
      setTimeout(() => resolve({ timeout: true }), timeout * 1000);
    });

    this.promise = Promise.race([
      new Promise<Deferrable<T>>((resolve, reject) => {
        this.reject = reject;
        this.resolve = resolve;
      }),
      race,
    ]);

    if (onResolve) {
      this.promise.then(onResolve);
    }
  }
}

export type { Deferrable };
export default { Deferred };

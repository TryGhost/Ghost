declare module '@tryghost/promise' {
  interface PromiseUtils {
    sequence(tasks: Array<() => unknown>): Promise<unknown>;
  }
  const promiseUtils: PromiseUtils;
  export default promiseUtils;
}

declare module '@tryghost/validator' {
  interface Validator {
    validate(value: unknown, key: string, options: Record<string, unknown>): Error[];
  }
  const validator: Validator;
  export default validator;
}

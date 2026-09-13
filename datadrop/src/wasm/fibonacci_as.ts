// @ts-nocheck

/** Calculates the n-th Fibonacci number. */
export function fib(n: i64): i64 {
  var a = 0,
    b = 1;
  if (n > 0) {
    while (--n) {
      const t = a + b;
      a = b;
      b = t;
    }
    return b;
  }
  return a;
}

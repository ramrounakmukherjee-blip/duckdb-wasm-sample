// function to generate the n-th Fibonacci number

export function fib(n: number): number {
  let a = 0,
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

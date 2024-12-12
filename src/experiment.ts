import { runTest } from "./shopping-cart.test"

const deliveryOrderBias: number[] = [1, 1.5, 2, 2.5, 3];
const deliveryLikehood: number[] = [30, 40, 50, 60, 70];
const iterations = 1000;
const tests: object[] = [];

for (let i of deliveryOrderBias) {
  for (let j of deliveryLikehood) {
    let numTrue = 0
    const durations: number[] = [];
    for (let k = 0; k < iterations; k++) {
      const start = Date.now();
      const result = runTest({deliveryOrderBias: i, deliveryLikehood: j});
      durations.push(Date.now() - start);
      if (result) numTrue++;
    }
    tests.push({
      "iterations": iterations,
      "deliveryOrderBias": i,
      "deliveryLikehood": j,
      "durations": durations,
      "numTrue": numTrue,
      "numFalse": iterations - numTrue,
    });
  }
}

console.log(JSON.stringify(tests))
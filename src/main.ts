import { runTest } from "./shopping-cart.test"

console.log("RESULTADOS EXPERIMENTO DE PRUEBAS ALEATORIZADAS EN COLLABS")
console.log("PARA VERIFICAR CONSITENCIA EVENTUAL DE PROGRAMAS")
console.log("============================================================")
console.log("Resultado correcto: false")
const iterations = 1000;
const networkOrderBias: number[] = [0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5]
const likehoodOfNetworkTick: number[] = [10, 20, 30, 40, 50, 60, 70, 80, 90]
let bestNetworkOrderBias = 0;
let bestLikehoodOfNetworkTick = 0;
let bestNumOfFalses = 0;
for (let i = 1; i < networkOrderBias.length; i++) {
  for (let j = 1; j < likehoodOfNetworkTick.length; j++) {
    // La razón de que i >= 1 y j >= 2 es que otras combinaciones
    // demoran demasiado
    if (i == 1 && j <= 2)
      continue;
    const freq = new Map<boolean, number>();
    freq.set(false, 0);
    freq.set(true, 0);
    let total = 0
    for (let k = 0; k < iterations; k++) {
      const start = Date.now();
      const result = runTest(networkOrderBias[i], likehoodOfNetworkTick[j]);
      total += Date.now() - start;
      freq.set(result, freq.get(result)! + 1);
    }
    total /= iterations;
    if (freq.get(false)! > bestNumOfFalses) {
      bestNumOfFalses = freq.get(false)!;
      bestNetworkOrderBias = networkOrderBias[i];
      bestLikehoodOfNetworkTick= likehoodOfNetworkTick[i];
    }
    console.log(`networkOrderBias: ${networkOrderBias[i]}`);
    console.log(`likehoodOfNetworkTick: ${likehoodOfNetworkTick[j]}`);
    console.log(`duración promedio: ${total} ms`)
    console.log(`true: ${freq.get(true)}`);
    console.log(`false: ${freq.get(false)}`);
  }
}
console.log(`Mejor networkOrderBias: ${bestNetworkOrderBias}`);
console.log(`Mejor likehoodOfNetworkTick: ${bestLikehoodOfNetworkTick}`);
console.log(`Mejor número de falsos: ${bestNumOfFalses}`);
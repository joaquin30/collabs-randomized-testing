import { ShoppingCart } from "./shopping-cart";
import { RandomizedTestingNetwork } from "./randomized-testing-provider";

function runTest(networkOrderBias: number, likehoodOfNetworkTick: number): boolean {
  const test = new RandomizedTestingNetwork({networkOrderBias,
    likehoodOfNetworkTick,showNetworkLog: false, showCommandLog: false});

  const client1Cart = new ShoppingCart();//{autoTransactions: "debugOp"});
  const client2Cart = new ShoppingCart();//{autoTransactions: "debugOp"});
  const paymentSystemCart = new ShoppingCart();//{autoTransactions: "debugOp"});

  test.subscribe(client1Cart, (chance) => {
    if (client1Cart.isClosed())
      return [true, ""];
    const num = chance.natural({min: 0, max: 10});
    if (num < 5) {
      const item = chance.string({length: 1});
      client1Cart.add(item);
      return [false, `add("${item}")`];
    }
    if (num < 10) {
      const item = chance.string({length: 1});
      client1Cart.delete(chance.string({length: 1}));
      return [false, `delete("${item}")`];
    }
    if (client1Cart.close())
      return [true, "close()"];
    return [false, ""];
  });

  test.subscribe(client2Cart, (chance) => {
    if (client2Cart.isClosed())
      return [true, ''];
    if (chance.bool()) {
      const item = chance.string({length: 1});
      client2Cart.add(item);
      return [false, `add("${item}")`];
    } else {
      const item = chance.string({length: 1});
      client2Cart.delete(chance.string({length: 1}));
      return [false, `delete("${item}")`];
    }
  });

  test.subscribe(paymentSystemCart, (_) => {
    if (paymentSystemCart.isClosed())
      return [true, ''];
    return [false, ''];
  });

  test.run();
  return JSON.stringify(client1Cart.getList()) === JSON.stringify(paymentSystemCart.getList());
}

console.log("RESULTADOS EXPERIMENTO DE PRUEBAS ALEATORIZADAS EN COLLABS")
console.log("PARA VERIFICAR CONSITENCIA EVENTUAL DE PROGRAMAS")
console.log("============================================================")
console.log("Resultado correcto: false")
const networkOrderBias: number[] = [0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5]
const likehoodOfNetworkTick: number[] = [10, 20, 30, 40, 50, 60, 70, 80, 90]
let bestNetworkOrderBias = 0;
let bestLikehoodOfNetworkTick = 0;
let bestNumOfFalses = 0;
for (let i = 2; i < networkOrderBias.length; i++) {
  for (let j = 2; j < likehoodOfNetworkTick.length; j++) {
    const freq = new Map<boolean, number>();
    freq.set(false, 0);
    freq.set(true, 0);
    for (let k = 0; k < 1000; k++) {
      const result = runTest(networkOrderBias[i], likehoodOfNetworkTick[j]);
      freq.set(result, freq.get(result)! + 1);
    }
    if (freq.get(false)! > bestNumOfFalses) {
      bestNumOfFalses = freq.get(false)!;
      bestNetworkOrderBias = networkOrderBias[i];
      bestLikehoodOfNetworkTick= likehoodOfNetworkTick[i];
    }
    console.log(`networkOrderBias: ${networkOrderBias[i]}`);
    console.log(`likehoodOfNetworkTick: ${likehoodOfNetworkTick[j]}`);
    console.log(`true: ${freq.get(true)}`);
    console.log(`false: ${freq.get(false)}`);
  }
}
console.log(`Mejor networkOrderBias: ${bestNetworkOrderBias}`);
console.log(`Mejor likehoodOfNetworkTick: ${bestLikehoodOfNetworkTick}`);
console.log(`Mejor número de falsos: ${bestNumOfFalses}`);
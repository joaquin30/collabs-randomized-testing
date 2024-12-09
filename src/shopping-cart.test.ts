import { ShoppingCart } from "./shopping-cart";
import { RandomizedTestingNetwork } from "./randomized-testing-provider";

export function runTest(networkOrderBias: number, likehoodOfNetworkTick: number): boolean {
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
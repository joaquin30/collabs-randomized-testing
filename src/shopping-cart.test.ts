import { ShoppingCart } from "./shopping-cart";
import { RandomTestNetwork, RandomTestStateMachine, RandomTestOptions } from "./random-test-provider";

class Client1SM extends RandomTestStateMachine<ShoppingCart> {
  private count = 0;

  constructor(doc: ShoppingCart) {
    super(doc);
  }

  run(chance: Chance.Chance): string | undefined {
    this.count++;
    if (this.count == 1)
      return this.add(chance);
    const num = chance.natural({min: 0, max: 10});
    if (num < 5)
      return this.add(chance);
    if (num < 10)
      return this.remove(chance);
    this.doc.close()
    this.running = false
  }

  add(chance: Chance.Chance): string {
    const item = chance.string({length: 1});
    this.doc.add(item);
    return `add("${item}")`;
  }

  remove(chance: Chance.Chance): string | undefined {
    const items = this.doc.getList()
    if (items.length === 0)
      return;
    const item = chance.pickone(items);
    this.doc.remove(item);
    return `remove("${item}")`;
  }
}

class Client2SM extends RandomTestStateMachine<ShoppingCart> {
  private count = 0;

  constructor(doc: ShoppingCart) {
    super(doc);
  }
  
  run(chance: Chance.Chance): string | undefined {
    if (this.doc.isClosed()) {
      this.running = false;
      return;
    }
    this.count++;
    if (this.count == 1)
      return this.add(chance);
    if (chance.bool())
      return this.add(chance);
    return this.remove(chance);
  }

  add(chance: Chance.Chance): string {
    const item = chance.string({length: 1});
    this.doc.add(item);
    return `add("${item}")`;
  }

  remove(chance: Chance.Chance): string | undefined {
    const items = this.doc.getList()
    if (items.length === 0)
      return;
    const item = chance.pickone(items);
    this.doc.remove(item);
    return `remove("${item}")`;
  }
}

class PaymentSystemSM extends RandomTestStateMachine<ShoppingCart> {
  constructor(doc: ShoppingCart) {
    super(doc);
  }
  
  run(_: Chance.Chance): undefined {
    if (this.doc.isClosed())
      this.running = false;
    return;
  }
}

export function runTest(options?: RandomTestOptions): boolean {
  const test = new RandomTestNetwork(options);
  const client1Cart = new ShoppingCart();
  const client2Cart = new ShoppingCart();
  const paymentSystemCart = new ShoppingCart();
  test.subscribe(client1Cart, new Client1SM(client1Cart));
  test.subscribe(client2Cart, new Client2SM(client2Cart));
  test.subscribe(paymentSystemCart, new PaymentSystemSM(paymentSystemCart));
  test.run();
  return JSON.stringify(client1Cart.getList()) === JSON.stringify(paymentSystemCart.getList());
}
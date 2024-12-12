import { runTest } from "./shopping-cart.test"

console.log("ShoppingCart is correct? " +
  runTest({showCommandLog: true, showDeliveryLog: true, seed: 42}));
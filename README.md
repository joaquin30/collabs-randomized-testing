# Collabs provider for random testing

This is a demo of a provider for random testing Collabs documents in one machine.
The test propagates local updates to all suscribed documents in random order,
to test eventual consistency of actions, events and queries in the documents.

An example for its use is in the file `src/shopping-cart.test.ts`. The program consist
on a shopping cart that two users update concurrently, and a third node should get the
final shopping list for payment processing. The test checks whether the list of items of the
client who closes the shopping is the same of the payment system.

To run the example:
```
npm install
npx tsc
node dist/main.js
```
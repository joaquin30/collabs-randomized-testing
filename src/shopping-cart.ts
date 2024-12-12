import { AbstractDoc, CCounter, CValueSet, CVar, DocOptions} from "@collabs/collabs"

export class ShoppingCart extends AbstractDoc {
  readonly items: CValueSet<string>;
  readonly count: CCounter;
  readonly numOps: CVar<number>;

  constructor(options?: DocOptions) {
    super(options);
    this.items = this.runtime.registerCollab("items", (init) => new CValueSet(init));
    this.count = this.runtime.registerCollab("count", (init) => new CCounter(init));
    this.numOps = this.runtime.registerCollab("numOps", (init) => new CVar(init, -1));
  }

  add(item: string) {
    if (this.isClosed())
      throw new Error("ShoppingCart is closed");
    this.runtime.transact(() => {
      this.items.add(item);
      this.count.add(1);
    });
  }

  remove(item: string) {
    if (this.isClosed())
      return;
    this.runtime.transact(() => {
      this.items.delete(item);
      this.count.add(1);
    });
  }

  close(): void {
    if (this.isClosed())
      throw new Error("ShoppingCart is closed");
    this.runtime.transact(() => {
      this.numOps.set(this.count.value);
    });
  }

  isClosed(): boolean {
    return this.numOps.value >= 0 && this.count.value >= this.numOps.value;
  }

  getList(): string[] {
    let list: string[] = [];
    this.items.forEach((item) => list.push(item));
    list.sort();
    return list;
  }
}
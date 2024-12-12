import { AbstractDoc, CRuntime } from "@collabs/collabs";
import { EventEmitter } from "@collabs/core";
import Chance from "chance";

type Doc = AbstractDoc | CRuntime;

type Message = {
  id: number,
  sender: Doc,
  recipient: Doc,
  updateType: "message" | "savedState",
  update: Uint8Array,
};

export type RandomTestOptions = {
  seed?: string | number,
  deliveryOrderBias?: number,
  deliveryLikehood?: number,
  showCommandLog?: boolean,
  showDeliveryLog?: boolean,
};

export abstract class RandomTestStateMachine<T extends Doc> {
  protected running = true;
  protected readonly doc: T;
  constructor(doc: T) {
    this.doc = doc;
  }
  isRunning(): boolean {
    return this.running;
  }
  abstract run(chance: Chance.Chance): string | undefined;
}

/** Events record for [[RandomTestNetwork]]. */
export interface RandomTestNetworkEventsRecord {
  /**
   * Emitted when there is an error, e.g., we fail to parse a message.
   */
  Error: { err: unknown };
}

/**
 * Syncs updates to Collabs documents across other documents in the same replica.
 * Used for testing. This only forwards *local* operations to other documents.
 */
export class RandomTestNetwork<T extends Doc> extends EventEmitter<RandomTestNetworkEventsRecord> {
  private readonly chance: Chance.Chance;
  private readonly deliveryOrderBias: number; 
  private readonly deliveryLikehood: number; 
  private readonly showCommandLog: boolean; 
  private readonly showDeliveryLog: boolean; 
  private readonly docs: Doc[] = [];
  private readonly docsWithCommands: Doc[] = [];
  private readonly network: Message[] = [];
  private readonly stateMachineByDoc = new Map<Doc, RandomTestStateMachine<T>>();
  private closed = false;
  private updateCounter = 0;

  /**
   * Constructs a RandomTestNetwork.
   *
   * You only need one TabSyncNetwork per test, since it
   * can [[subscribe]] multiple documents.
   *
   * @param options.seed The seed of Chance generator for deterministic test
   * Default: undefined.
   * @param options.deliveryOrderBias A number for controlling how "unordered" is  the delivery of updates.
   * It' i's the exponent of a random number between 0 and 1. Increasing this reduces the "unorderness" of the network.
   * Default: 1.5.
   * @param options.deliveryLikehood A number between 0 and 10 for controlling how "slow" is the network.
   * It is the likehood of delivering an update versus executing a command.
   * Default: 30.
   * @param options.showCommandLog To display the commands that are executed in the console
   * Default: false
   * @param options.showDeliveryLog To display the delivery of updates in the console
   * Default: false
   */
  constructor(options: RandomTestOptions = {}) {
    super();
    if (options.seed !== undefined)
      this.chance = new Chance.Chance(options.seed);
    else
      this.chance = new Chance.Chance();
    this.deliveryOrderBias = options.deliveryOrderBias ?? 1.5;
    this.deliveryLikehood = options.deliveryLikehood ?? 30;
    this.showCommandLog = options.showCommandLog ?? false;
    this.showDeliveryLog = options.showDeliveryLog ?? false;
  }

  /**
   * Subscribes `doc` to send and receive updates for all other documents
   * in the RandomTestNetwork. It will also sync initial states with
   * other documents, to ensure that they start up-to-date.
   *
   * @param doc The document to subscribe.
   * @param stateMachine A RandomTestStateMachine instance of `doc`, or undefined if `doc` will not run commands.
   * @throws If `doc` is already subscribed to the network.
   */
  subscribe(doc: Doc, stateMachine?: RandomTestStateMachine<T>): void {
    if (this.closed)
      throw new Error("Already closed");
    if (this.docs.indexOf(doc) !== -1)
      throw new Error("doc is already subscribed");
    this.docs.push(doc);
    if (stateMachine !== undefined) {
      this.docsWithCommands.push(doc);
      this.stateMachineByDoc.set(doc, stateMachine);
    }
    doc.on("Update", (event) => {
      if (!event.isLocalOp)
        return;
      for (let recipient of this.docs) {
        if (recipient !== doc) {
          this.network.push({id: this.updateCounter, sender: doc, recipient,
            updateType: event.updateType, update: event.update})
          this.updateCounter++;
        }
      }
    });
  }

  private runCommand() {
    const index = this.chance.natural({min: 0, max: this.docsWithCommands.length-1});
    const doc = this.docsWithCommands[index];
    const stateMachine = this.stateMachineByDoc.get(doc)!;
    const result = stateMachine.run(this.chance);
    if (this.showCommandLog && result !== undefined)
      console.log(`Replica ${doc.replicaID}: ${result}`);
    if (!stateMachine.isRunning())
      this.docsWithCommands.splice(index, 1);
  }

  private logMessage(message: Message) {
    console.log(`Network: deliver({id: ${message.id}, sender: ${message.sender.replicaID}, recipient: ${message.recipient.replicaID})`)
  }

  private deliverUpdate() {
    const length = this.network.length;
    if (length === 0)
      return;
    const rand = Math.pow(this.chance.floating({min: 0, max: 1}), this.deliveryOrderBias);
    const index = Math.max(0, Math.min(Math.floor(rand * length), length - 1))
    const message = this.network[index];
    if (message.updateType === "savedState")
      message.recipient.load(message.update);
    else
      message.recipient.receive(message.update);
    if (this.showDeliveryLog)
      this.logMessage(message);
    this.network.splice(index, 1);
  }

  run(): void {
    if (this.closed)
      throw new Error("Test already closed");
    while (this.docsWithCommands.length > 0) {
      if (this.chance.bool({likelihood: this.deliveryLikehood}))
        this.deliverUpdate();
      else
        this.runCommand();
    }
    this.closed = true;
  }
}

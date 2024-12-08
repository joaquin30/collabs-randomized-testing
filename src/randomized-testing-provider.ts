import { AbstractDoc, CRuntime } from "@collabs/collabs";
import { EventEmitter } from "@collabs/core";
import { Chance } from "chance";

type Command = (chance: Chance.Chance) => [boolean, string];
type Doc = AbstractDoc | CRuntime;
type Message = {
  from: Doc,
  to: Doc,
  updateID: number,
  updateType: "message" | "savedState",
  update: Uint8Array,
};
type Options = {
  seed?: string,
  networkOrderBias?: number,
  likehoodOfNetworkTick?: number,
  showCommandLog?: boolean,
  showNetworkLog?: boolean,
};

function printMessage(message: Message) {
  console.log(`Network: deliver({from: ${message.from.replicaID}, to: ${message.to.replicaID}, updateID: ${message.updateID}})`)
}

/** Events record for [[TabSyncNetwork]]. */
export interface RandomizedTestingNetworkEventsRecord {
  /**
   * Emitted when there is an error, e.g., we fail to parse a message.
   */
  Error: { err: unknown };
}

/**
 * Syncs updates to Collabs documents across different tabs for the same origin,
 * using BroadcastChannel.
 *
 * By default, this only forwards *local* operations to other tabs. Updates from other sources (e.g., a remote server via
 * [@collabs/ws-client](https://www.npmjs.com/package/@collabs/ws-client))
 * are not sent over the BroadcastChannel, since we expect that other tabs will
 * get a copy from their own sources. You can override this with the `allUpdates`
 * constructor option.
 *
 * Likewise, our other providers do not forward or store
 * operations from TabSyncNetwork. Instead, it is expected that
 * each tab sets up its own providers to forward/store updates.
 */
export class RandomizedTestingNetwork extends EventEmitter<RandomizedTestingNetworkEventsRecord> {
  private readonly docs: Doc[] = [];
  private readonly docsWithCommands: Doc[] = [];
  private readonly commandByDocs = new Map<Doc, Command | undefined>();
  private readonly messages: Message[] = [];
  private closed = false;
  private updateID = 0;
  private readonly chance: Chance.Chance;
  private readonly networkOrderBias: number; 
  private readonly likehoodOfNetworkTick: number; 
  private readonly showCommandLog: boolean; 
  private readonly showNetworkLog: boolean; 

  /**
   * Constructs a TabSyncNetwork.
   *
   * You typically only need one TabSyncNetwork per app, since it
   * can [[subscribe]] multiple documents.
   *
   * @param options.bcName The name of the BroadcastChannel to use.
   * Default: "@collabs/tab-sync".
   * @param options.allUpdates Set to true to forward all doc updates over
   * the BroadcastChannel, not just local operations.
   */
  constructor(options: Options = {}) {
    super();
    if (options.seed !== undefined)
      this.chance = new Chance.Chance(options.seed);
    else
      this.chance = new Chance.Chance();
    this.networkOrderBias = options.networkOrderBias ?? 1.5;
    this.likehoodOfNetworkTick = options.likehoodOfNetworkTick ?? 30;
    this.showCommandLog = options.showCommandLog ?? true;
    this.showNetworkLog = options.showNetworkLog ?? true;
  }

  /**
   * Subscribes `doc` to updates for `docID`.
   *
   * `doc` will send and receive updates with other tabs
   * that are subscribed to `docID`. It will also sync initial states with
   * other tabs, to ensure that they start up-to-date.
   *
   * @param doc The document to subscribe.
   * @param docID An arbitrary string that identifies the document.
   * @throws If `doc` is already subscribed to a docID.
   * @throws If another doc is subscribed to `docID`.
   */
  subscribe(doc: Doc, command?: Command) {
    if (this.closed)
      throw new Error("Already closed");
    if (this.commandByDocs.has(doc))
      throw new Error("doc is already subscribed");
    this.commandByDocs.set(doc, command);
    this.docs.push(doc);
    if (command)
      this.docsWithCommands.push(doc);
    doc.on("Update", (event) => {
      if (!event.isLocalOp)
        return;
      for (let to of this.docs) {
        if (to !== doc) {
          this.messages.push({from: doc, to, updateID: this.updateID,
            updateType: event.updateType, update: event.update})
          this.updateID++;
        }
      }
    });
  }

  private runCommand(chance: Chance.Chance) {
    const i = chance.natural({min: 0, max: this.docsWithCommands.length-1});
    const doc = this.docsWithCommands[i];
    const command = this.commandByDocs.get(doc)!;
    const result = command(chance);
    if (result[0])
      this.docsWithCommands.splice(i, 1);
    if (this.showCommandLog && result[1].length > 0)
      console.log(`Replica ${doc.replicaID}: ${result[1]}`);
  }

  private networkTick(chance: Chance.Chance) {
    const n = this.messages.length;
    if (n === 0)
      return;
    const x = Math.pow(chance.floating({min: 0, max: 1}), this.networkOrderBias);
    const i = Math.max(0, Math.min(Math.floor(x*n), n-1));
    if (this.messages[i].updateType === 'savedState')
      this.messages[i].to.load(this.messages[i].update);
    else
      this.messages[i].to.receive(this.messages[i].update);
    if (this.showNetworkLog)
      printMessage(this.messages[i]);
    this.messages.splice(i, 1);
  }

  run() {
    if (this.closed)
      throw new Error("Test already closed");
    this.closed = true;
    while (this.docsWithCommands.length > 0) {
      if (this.chance.bool({likelihood: this.likehoodOfNetworkTick}))
        this.networkTick(this.chance);
      else
        this.runCommand(this.chance);
    }
  }
}

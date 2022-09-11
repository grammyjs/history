import {
  type Chat,
  type Context,
  type Message,
  type MiddlewareFn,
  type Update,
  type User,
} from "./deps.deno.ts";

const skip = Symbol("skip this update");

interface Storage {
  write(update: Update): Promise<void>;
}

const dummyStorage: Storage = {
  write(update) {
    console.log("writing update", update.update_id);
    return Promise.resolve();
  },
};

export interface HistoryFlavor {
  history: HistoryControls;
}
interface HistoryControls {
  select: BotHistory;
  ignore(): void;
}
interface BotHistory {
  updates: RootSelector<Update>;
  chats: RootSelector<Chat>;
  users: RootSelector<User>;
  messages: RootSelector<Message>;
}

interface RootSelector<T> {
  where: SubSelector<T, T>;
}
type SubSelector<R, T> = {
  [P in keyof T]-?: PropertySelector<R, T[P]>;
};
type PropertySelector<R, T> = T extends number ? NumberSelector<R>
  : T extends string ? StringSelector<R>
  : ObjectSelector<R, T>;

interface Getter<R> {
  skip(count?: number): Getter<R>;
  get(count: 1): Promise<R>;
  get(count?: number): Promise<R[]>;
  count(): Promise<number>;
  project<P extends keyof R>(property: P): Getter<R[P]>;
}

interface NumberSelector<R> extends Getter<R> {
  where: RootSelector<R>["where"];
  and: NumberSelector<R>;
  or: NumberSelector<R>;
  is: NumberSelector<R> & { (value: number): NumberSelector<R> };
  greaterThan(value: number): NumberSelector<R>;
  lessThan(value: number): NumberSelector<R>;
  exists: NumberSelector<R>;
}
interface StringSelector<R> extends Getter<R> {
  where: RootSelector<R>["where"];
  and: StringSelector<R>;
  or: StringSelector<R>;
  is: StringSelector<R> & { (value: string): StringSelector<R> };
  startsWith(value: number): StringSelector<R>;
  exists: StringSelector<R>;
}
type ObjectSelector<R, T> = SubSelector<R, T> & {
  where: RootSelector<R>["where"];
  and: ObjectSelector<R, T>;
  or: ObjectSelector<R, T>;
  exists: ObjectSelector<R, T>;
};

export interface HistoryOptions {
  storage: any; // TODO integrate with storages
}

export function history<C extends Context>(): MiddlewareFn<C & HistoryFlavor> {
  return async (ctx, next) => {
    ctx.api.config.use((prev, method, payload, signal) => {
      return prev(method, payload, signal); // TODO store outgoing messages
    });
    const controls: HistoryControls = {
      ignore: () => Object.assign(ctx, { [skip]: true }),
      select: queryBuilder(),
    };
    Object.assign(ctx, controls);
    try {
      await next();
    } finally {
      if (!(skip in ctx)) await dummyStorage.write(ctx.update);
    }
  };
}

function queryBuilder(): BotHistory {
  return undefined as any; // TODO proxy magic
}

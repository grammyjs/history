import {
  type Chat,
  type Context,
  type Message,
  type MiddlewareFn,
  type Update,
  type User,
} from "./deps.deno.ts";

const skip = Symbol("skip this update");

// deno-lint-ignore ban-types
type ResponseObject = string | number | boolean | object;
interface Storage {
  write(update: Update): Promise<void>;
  read(query: Query, projection: string[]): Promise<ResponseObject[]>;
  count(query: Query): Promise<number>;
}
interface Query {
  disjunct: Conjunction[];
  offset: number;
  limit: number;
}
type Conjunction = Literal[];
interface Literal {
  path: string[];
  operator: Operator;
}
type Operator = NumberOperator | StringOperator | { op: "exists" };
type NumberOperator =
  | { op: "eq"; val: number }
  | { op: "lt"; val: number }
  | { op: "gt"; val: number };
type StringOperator =
  | { op: "eq-str"; val: string }
  | { op: "sw"; val: string };

const data: Update[] = [];
const dummyStorage: Storage = {
  write(update) {
    console.log("writing update", update.update_id);
    return Promise.resolve();
  },
  read(query, projection) {
    return Promise.resolve(
      data.filter((update) =>
        query.disjunct.some((conj) =>
          conj.every((lit) => {
            let obj: any = update;
            for (const p of lit.path) {
              obj = obj[p];
              if (obj == null) return false;
            }
            switch (lit.operator.op) {
              case "eq":
              case "eq-str":
                return obj === lit.operator.val;
              case "exists":
                return !!obj;
              case "gt":
                return obj > lit.operator.val;
              case "lt":
                return obj < lit.operator.val;
              case "sw":
                return String(obj).startsWith(lit.operator.val);
            }
          })
        )
      ).map((update) => {
        let res: any = update;
        for (const p of projection) res = res[p] ?? {};
        return res;
      }),
    );
  },
  async count(query: Query) {
    return (await this.read(query, [])).length;
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
  storage: Storage;
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

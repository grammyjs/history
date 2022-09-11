import { Bot, type Context } from "https://deno.land/x/grammy@v1.11.0/mod.ts";
import { history, type HistoryFlavor } from "./src/mod.ts";

type MyContext = Context & HistoryFlavor;

const bot = new Bot<MyContext>("token");

bot.use(history());

bot.chatType("private")
  .command("count_my_messages", async (ctx) => {
    const count = await ctx.history
      .select.messages
      .where.chat.id.is(ctx.chat.id)
      .and.where.from.id.is(ctx.from.id)
      .and.where.text.exists
      .count();
    await ctx.reply(`Found ${count} text messages from you!`);
  });

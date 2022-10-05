# History Plugin

> MVP. EXPERIMENTAL. DO NOT USE. Does not work. Will never work.

Telegram does not store the chat history for your bot.
This plugin does.

If you install this plugin, it will essentially store all incoming updates in a database.
In turn, it lets you derive insights:

- read the chat history
- count users
- see common groups with you users
- track usernames
- get message edit history
- see virtually anything else that Telegram ever told you

See `example.ts` for a short example code snippet of how this plugin will work.

**NOTE:** This plugin won't be completed because storing all updates in a database will not work for large-scale bots.
We aim to spend our time on plugins that work at any scale.

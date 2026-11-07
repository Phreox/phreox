# phreox-bot-sdk

Write a bot for Phreox in Java 25.

1. In the app open Settings → Account → Bots, give the bot a name and press **Create bot**. The token is shown once.
2. Add the bot to a space like a member (the owner of the space does it; the bot is the account `bot.<name>`).
3. Run your program:

```java
var bot = PhreoxBot.builder()
        .token(System.getenv("PHREOX_BOT_TOKEN"))
        .onMessage(message -> {
            if (message.content().equals("!ping")) message.reply("pong");
        })
        .build();

bot.start().join();
```

The bot listens to the event stream of the service (`/api/v1/events`), loads the new messages of the channel an event names and hands them
to `onMessage`. It never gets its own messages or the lines a space writes itself, and not the messages from before it started.
`bot.send(spaceId, channelId, text)` writes a message anywhere the bot is a member. The connection is made again after a failure.

`service(...)` points the bot at another service than `https://service.phreox.talk`.

What a bot cannot do yet: join spaces by itself, edit or delete messages, react, take part in voice channels. They are on the list.

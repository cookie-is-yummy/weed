import dayjs = require("dayjs");
import prisma from "../../init/database";
import { CustomEmbed } from "../../models/EmbedBuilders";
import { Job } from "../../types/Jobs";
import { NotificationPayload } from "../../types/Notification";
import Constants from "../../utils/Constants";
import { setInventoryItem } from "../../utils/functions/economy/inventory";
import { percentChance } from "../../utils/functions/random";
import { addNotificationToQueue } from "../../utils/functions/users/notifications";

export default {
  name: "daily streak",
  cron: "0 0 * * *",
  async run(log) {
    const limit = dayjs().subtract(1, "day").subtract(2, "hours").toDate();

    const users = await prisma.economy.findMany({
      where: {
        AND: [{ lastDaily: { lte: limit } }, { dailyStreak: { gt: 1 } }],
      },
      select: {
        userId: true,
        user: {
          select: {
            DMSettings: {
              select: {
                other: true,
              },
            },
          },
        },
        Inventory: {
          where: {
            OR: [{ item: "calendar" }, { item: { contains: "gem" } }],
          },
        },
      },
    });

    const calendarSavedEmbed = new CustomEmbed()
      .setColor(Constants.TRANSPARENT_EMBED_COLOR)
      .setTitle("your daily streak has been saved by a calendar!")
      .setDescription(
        "calendars in your inventory protect your daily streak, make sure to do `/daily` to continue your streak",
      );

    const gemSavedEmbed = new CustomEmbed()
      .setColor(Constants.TRANSPARENT_EMBED_COLOR)
      .setTitle("your daily streak was saved by your white gem!")
      .setDescription(
        "<:nypsi_gem_white:1046933670436552725> white gems have a chance to protect your daily streak. make sure to do /daily to continue your streak",
      );

    const whiteGemBrokeEmbed = new CustomEmbed()
      .setColor(Constants.TRANSPARENT_EMBED_COLOR)
      .setTitle("your white gem has shattered")
      .setDescription(
        "<:nypsi_gem_white:1046933670436552725> the power exerted by your white gem to save your streak has unfortunately caused it to shatter...",
      );

    const resetEmbed = new CustomEmbed()
      .setColor(Constants.TRANSPARENT_EMBED_COLOR)
      .setTitle("you have lost your daily streak!")
      .setDescription(
        "you have lost your daily streak by not doing `/daily`. calendars can be used to protect your daily streak from being reset",
      );

    const notifications: NotificationPayload[] = [];

    for (const user of users) {
      if (user.Inventory.find((i) => i.item == "calendar")?.amount > 0) {
        if (user.user.DMSettings.other)
          notifications.push({ memberId: user.userId, payload: { embed: calendarSavedEmbed } });

        setInventoryItem(
          user.userId,
          "calendar",
          Number(user.Inventory.find((i) => i.item === "calendar").amount) - 1,
        );

        continue;
      } else if (user.Inventory.find((i) => i.item == "white_gem")?.amount > 0n) {
        const gemSaveChance = Math.floor(Math.random() * 10);

        if (gemSaveChance < 5) {
          notifications.push({ memberId: user.userId, payload: { embed: gemSavedEmbed } });

          if (percentChance(7)) {
            setInventoryItem(
              user.userId,
              "calendar",
              Number(user.Inventory.find((i) => i.item === "white_gem").amount) - 1,
            );

            notifications.push({ memberId: user.userId, payload: { embed: whiteGemBrokeEmbed } });
          }
          continue;
        }
      }

      if (user.user.DMSettings.other)
        notifications.push({ memberId: user.userId, payload: { embed: resetEmbed } });

      prisma.economy.update({
        where: {
          userId: user.userId,
        },
        data: {
          dailyStreak: 0,
        },
      });
    }

    for (const notif of notifications) {
      addNotificationToQueue(notif);
    }

    log(`${notifications.length} streak notifications sent`);
  },
} satisfies Job;

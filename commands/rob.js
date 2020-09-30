const { getMember } = require("../utils/utils")
const { userExists, updateBalance, createUser, getBalance, hasPadlock, setPadlock, getVoteMulti, getXp, updateXp } = require("../economy/utils.js")
const { Message } = require("discord.js");
const { list } = require("../optout.json");
const { Command, categories } = require("../utils/classes/Command");
const { ErrorEmbed, CustomEmbed } = require("../utils/classes/EmbedBuilders.js")

const cooldown = new Map();
const playerCooldown = new Set()

const cmd = new Command("rob", "rob other server members", categories.MONEY).setAliases(["steal"])

/**
 * @param {Message} message 
 * @param {Array<String>} args 
 */
async function run(message, args) {

    if (cooldown.has(message.member.user.id)) {
        const init = cooldown.get(message.member.user.id)
        const curr = new Date()
        const diff = Math.round((curr - init) / 1000)
        const time = 600 - diff

        const minutes = Math.floor(time / 60)
        const seconds = time - minutes * 60

        let remaining

        if (minutes != 0) {
            remaining = `${minutes}m${seconds}s`
        } else {
            remaining = `${seconds}s`
        }
        return message.channel.send(new ErrorEmbed(`still on cooldown for \`${remaining}\``));
    }

    if (args.length == 0) {
        const embed = new CustomEmbed(message.member)
            .setTitle("rob help")
            .addField("usage", "$rob <@user>")
            .addField("help", "robbing a user is a useful way for you to make money\nyou can steal a maximum of **40**% of their balance\n" +
                "but there is also a chance that you get caught by the police or just flat out failing the robbery\n" +
                "you can lose up to **25**% of your balance by failing a robbery")

        return message.channel.send(embed)
    }

    if (!userExists(message.member)) createUser(message.member)

    let target = message.mentions.members.first()

    if (!target) {
        target = getMember(message, args[0])
    }

    if (!target) {
        return message.channel.send(new ErrorEmbed("invalid user"))
    }

    if (target.user.bot) {
        return message.channel.send(new ErrorEmbed("invalid user"))
    }

    if (message.member == target) {
        return message.channel.send(new ErrorEmbed("you cant rob yourself"))
    }

    if (!userExists(target) || getBalance(target) <= 500) {
        return message.channel.send(new ErrorEmbed("this user doesnt have sufficient funds"))
    }

    if (getBalance(message.member) < 750) {
        return message.channel.send(new ErrorEmbed("you need $750 in your wallet to rob someone"))
    }

    cooldown.set(message.member.user.id, new Date());

    setTimeout(() => {
        cooldown.delete(message.author.id);
    }, 600000);

    const embed = new CustomEmbed(message.member, true, "robbing " + target.user.toString() + "..")
        .setTitle("robbery | " + message.member.user.username)

    const embed2 = new CustomEmbed(message.member, true, "robbing " + target.user.toString() + "..")
        .setTitle("robbery | " + message.member.user.username)
    
    const embed3 = new CustomEmbed()
        .setFooter("use $optout to optout of bot dms")

    let robberySuccess = false

    if (playerCooldown.has(target.user.id)) {
        const amount = Math.floor(Math.random() * 9) + 1
        const amountMoney = Math.round(getBalance(message.member) * (amount / 100))

        updateBalance(target, getBalance(target) + amountMoney)
        updateBalance(message.member, getBalance(message.member) - amountMoney)

        embed2.setColor("#e4334f")
        embed2.addField("**fail!!**", "**" + target.user.tag + "** has been robbed recently and is protected by a private security team\n" +
            "you were caught and paid $" + amountMoney.toLocaleString() + " (" + amount + "%)")

        embed3.setTitle("you were nearly robbed")
        embed3.setColor("#5efb8f")
        embed3.setDescription("**" + message.member.user.tag + "** tried to rob you in **" + message.guild.name + "**\n" +
                "since you have been robbed recently, you are protected by a private security team.\nyou have been given $**" + amountMoney.toLocaleString() + "**")
    } else if (hasPadlock(target)) {
        setPadlock(target, false)

        const amount = (Math.floor(Math.random() * 35) + 5)
        const amountMoney = Math.round(getBalance(message.member) * (amount / 100))

        embed2.setColor("#e4334f")
        embed2.addField("fail!!", "**" + target.user.tag + "** had a padlock, which has now been broken")

        embed3.setTitle("you were nearly robbed")
        embed3.setColor("#5efb8f")
        embed3.setDescription("**" + message.member.user.tag + "** tried to rob you in **" + message.guild.name + "**\n" +
            "your padlock has saved you from a robbery, but it has been broken\nthey would have stolen $**" + amountMoney.toLocaleString() + "**")
    } else {
        const chance = Math.floor(Math.random() * 20)

        if (chance > 8) {
            robberySuccess = true

            const amount = (Math.floor(Math.random() * 35) + 5)
            const amountMoney = Math.round(getBalance(target) * (amount / 100))

            updateBalance(target, getBalance(target) - amountMoney)
            updateBalance(message.member, getBalance(message.member) + amountMoney)

            embed2.setColor("#5efb8f")
            embed2.addField("success!!", "you stole $**" + amountMoney.toLocaleString() + "**" + " (" + amount + "%)")

            const voted = await getVoteMulti(message.member)

            if (voted > 0) {
                updateXp(message.member, getXp(message.member) + 1)
                embed2.setFooter("+1xp")
            }

            embed3.setTitle("you have been robbed")
            embed3.setColor("#e4334f")
            embed3.setDescription("**" + message.member.user.tag + "** has robbed you in **" + message.guild.name + "**\n" +
                "they stole a total of $**" + amountMoney.toLocaleString() + "**")
            
            playerCooldown.add(target.user.id)

            const length = Math.floor(Math.random() * 8) + 2
    
            setTimeout(() => {
                playerCooldown.delete(target.user.id)
            }, length * 60 * 1000)
        } else {
            const amount = (Math.floor(Math.random() * 20) + 5)
            const amountMoney = Math.round(getBalance(message.member) * (amount / 100))

            updateBalance(target, getBalance(target) + amountMoney)
            updateBalance(message.member, getBalance(message.member) - amountMoney)

            embed2.setColor("#e4334f")
            embed2.addField("fail!!", "you lost $**" + amountMoney.toLocaleString() + "**" + " (" + amount + "%)")

            embed3.setTitle("you were nearly robbed")
            embed3.setColor("#5efb8f")
            embed3.setDescription("**" + message.member.user.tag + "** tried to rob you in **" + message.guild.name + "**\n" +
                "they were caught by the police and you received $**" + amountMoney.toLocaleString() + "**")
        }
    }

    message.channel.send(embed).then(async (m) => {
        setTimeout(async () => {
            await m.edit(embed2)

            if (!list.includes(target.user.id)) {
                if (robberySuccess) {
                    target.send("you have been robbed!!", embed3).catch(() => {})
                } else {
                    target.send("you were nearly robbed!!", embed3).catch(() => {})
                }
            }
        }, 1500)
    })

}

cmd.setRun(run)

module.exports = cmd
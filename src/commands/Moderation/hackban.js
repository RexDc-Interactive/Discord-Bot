// Dependencies
const { Embed } = require('../../utils'),
	{ timeEventSchema } = require('../../database/models'),
	{ time: { getTotalTime } } = require('../../utils'),
	Command = require('../../structures/Command.js');

/**
 * Ban command
 * @extends {Command}
*/
class HackBan extends Command {
	/**
 	 * @param {Client} client The instantiating client
 	 * @param {CommandData} data The data for the command
	*/
	constructor(bot) {
		super(bot, {
			name: 'hackban',
			guildOnly: true,
			dirname: __dirname,
			userPermissions: ['BAN_MEMBERS'],
			botPermissions: [ 'SEND_MESSAGES', 'EMBED_LINKS', 'BAN_MEMBERS'],
			description: 'Ban a user not in a server.',
			usage: 'hackban <user> [reason] [time]',
			cooldown: 5000,
			examples: ['hackban username spamming chat 4d', 'hackban username raiding'],
		});
	}

	/**
 	 * Function for recieving message.
 	 * @param {bot} bot The instantiating client
 	 * @param {message} message The message that ran the command
 	 * @param {settings} settings The settings of the channel the command ran in
 	 * @readonly
	*/
	async run(bot, message, settings) {
		// Delete message
		if (settings.ModerationClearToggle && message.deletable) message.delete();

		// check if a user was entered
		if (!message.args[0]) return message.channel.error('misc:INCORRECT_FORMAT', { EXAMPLE: settings.prefix.concat(message.translate('moderation/hackban:USAGE')) }).then(m => m.timedDelete({ timeout: 10000 }));

		// Get user and reason
		const reason = message.args[1] ? message.args.splice(1, message.args.length).join(' ') : message.translate('misc:NO_REASON');

		// Get members mentioned in message
		const user = await message.client.users.fetch(args[0], true, true);

		// Make sure user isn't trying to punish themselves
		if (user == message.author) return message.channel.error('misc:SELF_PUNISH').then(m => m.timedDelete({ timeout: 10000 }));

		// Ban user with reason and check if timed ban
		try {
			// send DM to user
			try {
				const embed = new Embed(bot, message.guild)
					.setTitle('moderation/hackban:TITLE')
					.setColor(15158332)
					.setThumbnail(message.guild.iconURL())
					.setDescription(message.translate('moderation/hackban:DESC', { NAME: message.guild.name }))
					.addField(message.translate('moderation/hackban:BAN_BY'), message.author.tag, true)
					.addField(message.translate('misc:REASON'), reason, true);
				await members[0].send({ embeds: [embed] });
				// eslint-disable-next-line no-empty
			} catch (e) {}

			// Ban user from guild
			await message.guild.members.ban(user, { reason: reason });
			message.channel.success('moderation/hackban:SUCCESS', { USER: members[0].user }).then(m => m.timedDelete({ timeout: 8000 }));

			// Check to see if this ban is a tempban
			const possibleTime = message.args[message.args.length - 1];
			if (possibleTime.endsWith('d') || possibleTime.endsWith('h') || possibleTime.endsWith('m') || possibleTime.endsWith('s')) {
				const time = getTotalTime(possibleTime, message);
				if (!time) return;

				// connect to database
				const newEvent = await new timeEventSchema({
					userID: members[0].user.id,
					guildID: message.guild.id,
					time: new Date(new Date().getTime() + time),
					channelID: message.channel.id,
					type: 'ban',
				});
				await newEvent.save();

				// unban user
				setTimeout(async () => {
					message.args[0] = members[0].user.id;
					await bot.commands.get('unban').run(bot, message, settings);

					// Delete item from database as bot didn't crash
					await timeEventSchema.findByIdAndRemove(newEvent._id, (err) => {
						if (err) console.log(err);
					});
				}, time);
			}
		} catch (err) {
			if (message.deletable) message.delete();
			bot.logger.error(`Command: '${this.help.name}' has error: ${err.message}.`);
			message.channel.error('misc:ERROR_MESSAGE', { ERROR: err.message }).then(m => m.timedDelete({ timeout: 5000 }));
		}
	}
}

module.exports = HackBan;

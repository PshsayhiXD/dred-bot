export default {
    name: 'say',
    description: 'Make the bot say something.',
    aliases: ['speak', 'talk'],
    usage: '<message>',
    category: 'moderation',
    perm: 4,
    cooldown: 1,
    globalCooldown: 1,
    id: 5,
    dependencies: ``,
    execute: async (message, args, user, command, dep) => {
        const content = args.join(' ');
        return await message.channel.send(content);
    }
}
const { SlashCommandBuilder } = require('discord.js');
const { config } = require('../config/config');
const { getUser, saveUser } = require('../database');
const { formatMoney } = require('../config/currency');
const commands=[]; const cmd=(name,description,execute)=>commands.push({data:new SlashCommandBuilder().setName(name).setDescription(description),execute});
cmd('balance','View your Peso balance',async i=>{const u=await getUser(i.user.id);await i.reply(`💰 Wallet: **${formatMoney(u.balance)}**\n🏦 Bank: **${formatMoney(u.bank)}**`)});
cmd('daily','Claim your daily Peso',async i=>{const u=await getUser(i.user.id);if(u.lastDailyAt&&Date.now()-u.lastDailyAt.getTime()<86400000)return i.reply({content:'Daily reward is on cooldown.',ephemeral:true});u.balance+=config.dailyReward;u.lifetimeEarned+=config.dailyReward;u.lastDailyAt=new Date();await saveUser(u);await i.reply(`🎁 You received **${formatMoney(config.dailyReward)}**.`)});
module.exports=commands;

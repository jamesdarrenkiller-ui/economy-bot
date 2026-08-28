const mongoose = require('mongoose');
const { config } = require('./config/config');
const userSchema = new mongoose.Schema({ userId:{type:String,unique:true,index:true}, balance:{type:Number,default:config.startingBalance}, bank:{type:Number,default:0}, inventory:{type:Map,of:Number,default:{}}, lastDailyAt:Date, job:String, lastWorkAt:Date, lifetimeEarned:{type:Number,default:0}, workCount:{type:Number,default:0}, achievements:{type:[String],default:[]} },{timestamps:true});
const guildSchema = new mongoose.Schema({guildId:{type:String,unique:true,index:true},disabledChannels:{type:[String],default:[]}},{timestamps:true});
const User = mongoose.models.EconomyUser || mongoose.model('EconomyUser',userSchema); const Guild = mongoose.models.EconomyGuild || mongoose.model('EconomyGuild',guildSchema);
async function connectDatabase(){await mongoose.connect(config.mongoUri,{dbName:config.mongoDbName});console.log(`MongoDB connected: ${config.mongoDbName}`);}
async function getUser(userId){return User.findOneAndUpdate({userId},{$setOnInsert:{userId,balance:config.startingBalance}},{upsert:true,new:true});}
async function saveUser(user){return User.findOneAndUpdate({userId:user.userId},user,{new:true});}
async function getGuild(guildId){return Guild.findOneAndUpdate({guildId},{$setOnInsert:{guildId,disabledChannels:[]}},{upsert:true,new:true});}
async function getLeaderboard(limit=10){return User.find().sort({balance:-1,bank:-1}).limit(limit).lean();}
module.exports={connectDatabase,getUser,saveUser,getGuild,getLeaderboard,User,Guild};

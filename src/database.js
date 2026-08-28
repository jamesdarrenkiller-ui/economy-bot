const mongoose = require('mongoose');
const { config } = require('./config/config');
const userSchema = new mongoose.Schema({userId:{type:String,unique:true,index:true},balance:{type:Number,default:config.startingBalance},bank:{type:Number,default:0},inventory:{type:Map,of:Number,default:{}},lastDailyAt:Date,job:String,lastWorkAt:Date,lifetimeEarned:{type:Number,default:0},workCount:{type:Number,default:0},achievements:{type:[String],default:[]}},{timestamps:true});
const guildSchema = new mongoose.Schema({guildId:{type:String,unique:true,index:true},disabledChannels:{type:[String],default:[]}},{timestamps:true});
const User=mongoose.models.EconomyUser||mongoose.model('EconomyUser',userSchema);const Guild=mongoose.models.EconomyGuild||mongoose.model('EconomyGuild',guildSchema);
const connectDatabase=()=>mongoose.connect(config.mongoUri,{dbName:config.mongoDbName}).then(()=>console.log(`MongoDB connected: ${config.mongoDbName}`));
const getUser=id=>User.findOneAndUpdate({userId:id},{$setOnInsert:{userId:id,balance:config.startingBalance}},{upsert:true,new:true});
const saveUser=u=>User.findOneAndUpdate({userId:u.userId},u,{new:true}); const getGuild=id=>Guild.findOneAndUpdate({guildId:id},{$setOnInsert:{guildId:id,disabledChannels:[]}},{upsert:true,new:true}); const getLeaderboard=n=>User.find().sort({balance:-1,bank:-1}).limit(n).lean();
module.exports={connectDatabase,getUser,saveUser,getGuild,getLeaderboard,User,Guild};

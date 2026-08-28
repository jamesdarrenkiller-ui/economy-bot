const { getUser, saveUser } = require('../database');
async function transfer(fromId,toId,amount){const from=await getUser(fromId);if(from.balance<amount)return false;const to=await getUser(toId);from.balance-=amount;to.balance+=amount;await saveUser(from);await saveUser(to);return true;}
module.exports={transfer};

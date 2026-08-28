const { getUser, saveUser } = require('../database');
const add = async (id, amount) => { const u=await getUser(id); u.balance+=amount; await saveUser(u); return u; };
module.exports={add};

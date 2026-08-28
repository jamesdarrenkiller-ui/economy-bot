function remaining(last,ms){return Math.max(0,ms-(Date.now()-new Date(last||0).getTime()));} module.exports={remaining};

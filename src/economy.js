const { config } = require('./config');
const { getUser, saveDatabase } = require('./database');

const JOBS = {
  worker: { name: 'Worker', min: 80, max: 140, cooldown: 45 * 60 * 1000 },
  developer: { name: 'Developer', min: 120, max: 220, cooldown: 60 * 60 * 1000 },
  designer: { name: 'Designer', min: 100, max: 190, cooldown: 50 * 60 * 1000 },
  trader: { name: 'Trader', min: 90, max: 260, cooldown: 55 * 60 * 1000 },
};

const ITEMS = {
  laptop: { name: 'Laptop', price: 2500, description: 'A useful work laptop.' },
  coffee: { name: 'Coffee', price: 80, description: 'A small energy boost.' },
  backpack: { name: 'Backpack', price: 650, description: 'Carry your essentials.' },
  trophy: { name: 'Trophy', price: 5000, description: 'A prestigious collectible.' },
};

const ACHIEVEMENTS = [
  { id: 'first-coins', name: 'First Coins', description: 'Earn your first 1,000 coins.', test: (u) => u.lifetimeEarned >= 1000 },
  { id: 'hard-worker', name: 'Hard Worker', description: 'Work 10 times.', test: (u) => u.workCount >= 10 },
  { id: 'wealthy', name: 'Wealthy', description: 'Reach 10,000 coins across wallet and bank.', test: (u) => u.balance + u.bank >= 10000 },
  { id: 'collector', name: 'Collector', description: 'Own at least 3 different items.', test: (u) => Object.keys(u.inventory).length >= 3 },
];

function ensureStats(user) {
  user.lifetimeEarned ??= 0;
  user.workCount ??= 0;
  user.job ??= null;
  user.lastWorkAt ??= null;
  user.achievements ??= [];
}

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function totalWealth(user) { return user.balance + user.bank; }

async function work(userId, jobId) {
  const job = JOBS[jobId];
  if (!job) throw new Error('INVALID_JOB');
  const user = getUser(userId); ensureStats(user);
  const last = user.lastWorkAt ? Date.parse(user.lastWorkAt) : 0;
  const remaining = job.cooldown - (Date.now() - last);
  if (remaining > 0) return { ok: false, remaining, job };
  const earned = randomInt(job.min, job.max);
  user.balance += earned; user.lifetimeEarned += earned; user.workCount += 1;
  user.job = jobId; user.lastWorkAt = new Date().toISOString();
  const unlocked = unlockAchievements(user);
  await saveDatabase();
  return { ok: true, earned, job, unlocked };
}

function buy(userId, itemId, quantity) {
  const item = ITEMS[itemId];
  if (!item) throw new Error('INVALID_ITEM');
  const user = getUser(userId); ensureStats(user);
  const total = item.price * quantity;
  if (user.balance < total) return { ok: false, total };
  user.balance -= total; user.inventory[itemId] = (user.inventory[itemId] || 0) + quantity;
  return { ok: true, total, item };
}

function sell(userId, itemId, quantity) {
  const item = ITEMS[itemId];
  if (!item) throw new Error('INVALID_ITEM');
  const user = getUser(userId); ensureStats(user);
  const owned = user.inventory[itemId] || 0;
  if (owned < quantity) return { ok: false, owned };
  const total = Math.floor(item.price * quantity * 0.6);
  user.inventory[itemId] -= quantity;
  if (user.inventory[itemId] <= 0) delete user.inventory[itemId];
  user.balance += total;
  return { ok: true, total, item };
}

function unlockAchievements(user) {
  ensureStats(user);
  const unlocked = [];
  for (const achievement of ACHIEVEMENTS) {
    if (!user.achievements.includes(achievement.id) && achievement.test(user)) {
      user.achievements.push(achievement.id); unlocked.push(achievement);
    }
  }
  return unlocked;
}

module.exports = { JOBS, ITEMS, ACHIEVEMENTS, ensureStats, totalWealth, work, buy, sell, unlockAchievements };

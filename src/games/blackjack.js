const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })));
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function handValue(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.rank === 'A') { total += 11; aces++; }
    else if (['K', 'Q', 'J'].includes(card.rank)) total += 10;
    else total += Number(card.rank);
  }
  while (total > 21 && aces) { total -= 10; aces--; }
  return total;
}

function startGame() {
  const deck = shuffle(createDeck());
  return { deck, player: [deck.pop(), deck.pop()], dealer: [deck.pop(), deck.pop()], finished: false };
}

function hit(game) {
  if (game.finished) return game;
  game.player.push(game.deck.pop());
  if (handValue(game.player) >= 21) game.finished = true;
  return game;
}

function stand(game) {
  while (handValue(game.dealer) < 17) game.dealer.push(game.deck.pop());
  game.finished = true;
  return game;
}

module.exports = { startGame, hit, stand, handValue };

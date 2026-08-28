const CURRENCY_NAME = 'Peso';
const CURRENCY_SYMBOL = '¥';

function formatMoney(amount) {
  return `${CURRENCY_SYMBOL} ${Number(amount).toLocaleString('en-IN')} ${CURRENCY_NAME}`;
}

module.exports = { CURRENCY_NAME, CURRENCY_SYMBOL, formatMoney };

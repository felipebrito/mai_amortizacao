
import { calculateAmortization } from './src/lib/financeUtils';

const val = 200000;
const loan = 100000;
const rate = 10;
const term = 120; // 10 years

const sac = calculateAmortization(val, loan, rate, term, 'SAC');
const price = calculateAmortization(val, loan, rate, term, 'PRICE');

console.log("SAC Total Interest:", sac.totalInterest);
console.log("PRICE Total Interest:", price.totalInterest);
console.log("SAC Total Paid:", sac.totalPaid);
console.log("PRICE Total Paid:", price.totalPaid);

console.log("Are they equal?", Math.abs(sac.totalInterest - price.totalInterest) < 0.01);

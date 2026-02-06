
const calculateAmortization = (
    propertyValue,
    loanAmount,
    annualInterestRate,
    termMonths,
    type,
    monthlyExtra = 0,
    oneTimeExtras = {},
    appreciationRate = 5
) => {
    const monthlyInterestRate = annualInterestRate / 100 / 12;
    const monthlyAppreciationRate = (1 + appreciationRate / 100) ** (1 / 12) - 1;
    const installments = [];
    let currentBalance = loanAmount;
    let currentPropertyValue = propertyValue;
    let totalPaid = 0;
    let totalInterest = 0;

    const n = termMonths;
    const i = monthlyInterestRate;
    // PRICE Fixed Payment Formula
    const fixedPricePayment = loanAmount * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);

    for (let month = 1; month <= termMonths; month++) {
        if (currentBalance <= 0.01) break;

        const interest = currentBalance * monthlyInterestRate;
        let amortization = 0;
        let payment = 0;

        if (type === 'SAC') {
            amortization = loanAmount / termMonths;
            payment = amortization + interest;
        } else {
            payment = fixedPricePayment;
            amortization = payment - interest;
        }

        if (amortization > currentBalance) {
            amortization = currentBalance;
            payment = amortization + interest;
        }

        const extra = monthlyExtra + (oneTimeExtras[month] || 0);
        const actualExtra = Math.min(extra, currentBalance - amortization);

        const currentBalanceBefore = currentBalance;
        currentBalance -= (amortization + actualExtra);
        currentPropertyValue *= (1 + monthlyAppreciationRate);
        totalPaid += (payment + actualExtra);
        totalInterest += interest;

        installments.push({
            month,
            initialBalance: currentBalanceBefore,
            payment: payment + actualExtra,
            interest,
            amortization,
            extraAmortization: actualExtra,
            balance: Math.max(0, currentBalance),
        });
    }

    return {
        totalPaid,
        totalInterest,
        installments
    };
};

console.log("\n--- VERIFICATION 1: PRICE (Doc 222) ---");
const loanPrice = 240000.00;
const ratePrice = 10.9259;
const termPrice = 360;
const resPrice = calculateAmortization(loanPrice, loanPrice, ratePrice, termPrice, 'PRICE');

const p1 = resPrice.installments[0];
console.log(`Loan: ${loanPrice}, Rate: ${ratePrice}%, Term: ${termPrice}m`);
console.log(`Month 1 Payment (Amort + Int): ${p1.payment.toFixed(2)} (Expected 2272.14)`);
console.log(`Month 1 Interest: ${p1.interest.toFixed(2)}`);
console.log(`Month 1 Amortization: ${p1.amortization.toFixed(2)}`);


console.log("\n--- VERIFICATION 2: SAC (Doc 333) ---");
const loanSac = 270000.00;
const rateSac = 10.9259;
const termSac = 420;
const resSac = calculateAmortization(loanSac, loanSac, rateSac, termSac, 'SAC');

const s1 = resSac.installments[0];
console.log(`Loan: ${loanSac}, Rate: ${rateSac}%, Term: ${termSac}m`);
console.log(`Month 1 Payment (Amort + Int): ${s1.payment.toFixed(2)} (Expected 3101.18)`);
console.log(`Month 1 Interest: ${s1.interest.toFixed(2)}`);
console.log(`Month 1 Amortization: ${s1.amortization.toFixed(2)}`);

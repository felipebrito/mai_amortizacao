export type AmortizationSystem = 'SAC' | 'PRICE';

export interface SimulationParams {
    propertyValue: number;
    downPayment: number;
    originalTermYears: number;
    interestRateAnnual: number; // Nominal Interest (e.g., 9.50 for 9.5%)
    amortizationSystem: AmortizationSystem;

    // Costs & Fees
    insuranceRateMIP: number; // % of Balance (Method usually varies, simplified as % of balance)
    insuranceRateDFI: number; // % of Property Value
    adminFeeMonthly: number; // Fixed monthly fee (e.g., R$ 25.00)

    // Market Variables
    propertyAppreciationAnnual: number; // %
    inflationAnnual: number; // % (for generic real return calc)
    investmentBenchmarkAnnual: number; // % (SELIC/CDI for opportunity cost)
    rentEstimateMonthly: number; // Value of rent for comparison

    // Strategy
    extraAmortizationMonthly: number;
    extraAmortizationLumpSums: Record<number, number>; // Month -> Value
    strategyType: 'REDUCE_TERM' | 'REDUCE_INSTALLMENT';
}

export interface MonthlyInstallment {
    month: number;
    year: number;

    // Debt State
    initialBalance: number;
    finalBalance: number;

    // Components
    interest: number;
    amortization: number;
    extraAmortization: number;

    // Fees & Insurance
    insuranceMIP: number;
    insuranceDFI: number;
    adminFee: number;

    // Totals
    totalPayment: number; // Ordinary Payment (Interest + Amort + Fees)
    totalCashFlow: number; // Payment + Extra Amortization

    // Asset State
    propertyValue: number;
    netEquity: number; // PropertyValue - FinalBalance
}

export interface ComparisonResult {
    buyScenario: {
        totalPaid: number;
        finalNetEquity: number;
        installments: MonthlyInstallment[];
    };
    investScenario: {
        totalRentPaid: number;
        finalInvestedAmount: number; // The "Pot" after years
        netEquity: number; // finalInvestedAmount
    };
    decision: {
        financiallyBetter: 'BUY' | 'RENT_INVEST';
        difference: number; // How much richer in the better scenario
        breakEvenMonth: number | null; // When Buying overtakes Renting (if ever)
    };
}

export class FinanceEngine {

    static calculateAmortizationSchedule(params: SimulationParams): MonthlyInstallment[] {
        const installments: MonthlyInstallment[] = [];

        // Initial State
        let balance = params.propertyValue - params.downPayment;
        let propertyValue = params.propertyValue;
        const loanAmount = balance;

        // Rate Conversions
        const monthlyRate = Math.pow(1 + params.interestRateAnnual / 100, 1 / 12) - 1;
        const monthlyAppreciation = Math.pow(1 + params.propertyAppreciationAnnual / 100, 1 / 12) - 1;
        const totalMonths = params.originalTermYears * 12;

        // Pre-calculation for PRICE fixed installment (PMT)
        // Note: In Brazil, PRICE usually recalculates PMT every year or maintains factor. 
        // We will use standard fixed PMT for simplicity, but re-checked against balance implies we might need dynamic recalculation if balance changes due to extras.
        // For proper PRICE with Extra Amortization: If you reduce term, PMT stays same. If you reduce installment, PMT lowers.
        // Let's calculate initial PMT.
        let initialPricePMT = 0;
        if (params.amortizationSystem === 'PRICE') {
            initialPricePMT = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
        }

        for (let month = 1; month <= totalMonths; month++) {
            if (balance <= 0.01) break; // Paid off

            const year = Math.ceil(month / 12);
            const initialBalance = balance;

            // 1. Calculate Interest
            const interest = initialBalance * monthlyRate;

            // 2. Calculate Amortization & Payment based on System
            let amortization = 0;
            let regularPayment = 0; // Excludes fees for now

            if (params.amortizationSystem === 'SAC') {
                amortization = loanAmount / totalMonths; // Standard SAC: Fixed Amortization
                // With extra amortization (reduce term), standard SAC usually keeps amortization constant but stops early.
                // If reduce installment, amortization re-calcs: Balance / RemainingMonths.
                // Let's implement the dynamic SAC (recalc based on remaining term) which handles both naturally?
                // Actually, standard SAC is Fixed Amort = OriginalPrincipal / OriginalTerm. 
                // If we amortize extra, we usually just cut off the end.
                // Let's stick to: Amort = Principal_Start / Term_Total.
                amortization = loanAmount / totalMonths;
                regularPayment = amortization + interest;
            } else {
                // PRICE
                // If strategy is reduce term, keep PMT constant. 
                // If strategy is reduce installment, recalc PMT based on current balance and remaining term.
                // For now, let's assume "Reduce Term" behavior for PRICE as default (keep PMT high to kill debt).

                let pmt = initialPricePMT;
                if (params.strategyType === 'REDUCE_INSTALLMENT') {
                    const remainingMonths = totalMonths - month + 1;
                    pmt = initialBalance * (monthlyRate * Math.pow(1 + monthlyRate, remainingMonths)) / (Math.pow(1 + monthlyRate, remainingMonths) - 1);
                }

                regularPayment = pmt;
                amortization = pmt - interest;
                if (amortization < 0) amortization = 0; // Negative amortization protection
            }

            // Check if amortization > balance
            if (amortization > balance) {
                amortization = balance;
                regularPayment = amortization + interest;
            }

            // 3. Fees
            // MIP: Morte e Invalidez Permanente - often % of Balance
            const mip = initialBalance * (params.insuranceRateMIP || 0);
            // DFI: Danos Físicos ao Imóvel - often % of Property Value
            // Note: Property Value for insurance often usually is strictly Construction Value or Purchase Value, not Market Value. 
            // We will use Purchase Value (loanAmount + downPayment) fixed or updated? Usually fixed or updated by TR.
            // Let's use the current appreciated value to be conservative on cost (higher cost), 
            // OR use the original value. Let's use Original Value for DFI base to avoid explosion.
            const dfi = (params.propertyValue) * (params.insuranceRateDFI || 0);
            const adminFee = params.adminFeeMonthly;

            const fullPayment = regularPayment + mip + dfi + adminFee;

            // 4. Extra Amortization
            const monthlyExtra = params.extraAmortizationMonthly;
            const oneTimeExtra = params.extraAmortizationLumpSums?.[month] || 0;
            let extraAmort = monthlyExtra + oneTimeExtra;

            // Cap extra at remaining balance
            if (extraAmort > (balance - amortization)) {
                extraAmort = balance - amortization;
            }

            // 5. Update State
            balance -= (amortization + extraAmort);
            if (balance < 0) balance = 0;

            propertyValue = propertyValue * (1 + monthlyAppreciation);

            installments.push({
                month,
                year,
                initialBalance,
                finalBalance: balance,
                interest,
                amortization,
                extraAmortization: extraAmort,
                insuranceMIP: mip,
                insuranceDFI: dfi,
                adminFee,
                totalPayment: fullPayment,
                totalCashFlow: fullPayment + extraAmort,
                propertyValue,
                netEquity: propertyValue - balance
            });
        }

        return installments;
    }

    static compareScenarios(params: SimulationParams, buySchedule: MonthlyInstallment[]): ComparisonResult {
        // Investment Scenario:
        // "Instead of putting DownPayment on house, I invest it."
        // "Instead of paying (Mortgage + Extra), I pay Rent and invest the difference."
        // If Mortgage > Rent, I invest (Mortgage - Rent).
        // If Mortgage < Rent, I withdraw from investment to pay Rent (disinvestment).

        const monthlyInvRate = Math.pow(1 + params.investmentBenchmarkAnnual / 100, 1 / 12) - 1;
        const monthlyRentAdj = Math.pow(1 + params.inflationAnnual / 100, 1 / 12) - 1; // Rent follows inflation usually


        let currentRent = params.rentEstimateMonthly;
        let totalRentPaid = 0;

        // We run the investment loop for the same duration as the Buy Schedule
        // OR the original term? usually comparison logic goes up to the end of the loan term.
        const maxMonths = params.originalTermYears * 12;
        // However, if the mortgage is paid off early (e.g. 10 years), the "Buy" scenario has CashFlow = 0 for the remaining years.
        // The "Invest" scenario still pays rent.
        // To be fair, we must simulate BOTH until the end of the Original Term, 
        // assuming that after mortgage is paid, the "Buyer" also invests the money they used to pay for mortgage!
        // This is the "Opportunity Cost" of the cash flow.

        // Let's normalize: Comparison is strictly "Net Worth at Month X". 
        // We will simulate the Investment Path Month-by-Month alongside the Buy Path.
        // But Buy Path might end early.



        // Detailed Calc:
        // We need a timeline of Cash Flows from the BUY scenario to match in the INVEST scenario.
        // Buyer Cash Flow at Month M = Installment + Extra.
        // Investor Cash Flow at Month M = Rent.
        // Difference = (Installment + Extra) - Rent.
        // If Dist > 0 (Mortgage expensive), Investor invests that difference.
        // If Diff < 0 (Rent expensive), Investor withdraws difference to pay rent.

        // Wait! That's "Invest the Difference".
        // Correct logic:
        // Planner says: "I have X amount of money available monthly".
        // Scenario Buy: Uses X to pay Mortgage. If X > Mortgage, pays Extra. (Already simulated in buySchedule.totalCashFlow).
        // Scenario Invest: Uses X to pay Rent. Remainder goes to Investment.

        // So, let's assume the "Available Budget" is exactly equal to the "Buy Scenario Cash Flow".
        // Because that's what the user *committed* to spending in the Buy Scenario.

        let investedEquity = params.downPayment;

        for (let i = 0; i < maxMonths; i++) {
            // Advance Investment with Interest
            investedEquity = investedEquity * (1 + monthlyInvRate);

            // Get Cost from Buy Scenario
            const buyCost = i < buySchedule.length ? buySchedule[i].totalCashFlow : 0;
            // If Buy Scenario finished, Buyer is paying 0. 
            // But wait, if Buyer pays 0, and Investor pays Rent, Investor is losing heavily?
            // No, if Buyer pays 0, it means Buyer has "extra cash" now compared to the Mortgage phase.
            // Should we assume Buyer invests that savings? 
            // OR should we assume the "Budget" was just the mortgage payment?

            // The fairest comparison is:
            // "I have a budget of B_t (defined by the mortgage payment series)."
            // "In Buy Scenario, B_t goes to Bank."
            // "In Invest Scenario, B_t goes to Rent, remaining to Invest."
            // "After Mortgage is paid, B_t is freed up."
            // DOES the Buyer invest B_t? 
            // Usually comparisons stop at the moment of payoff or go to full term.

            // Let's implement the standard "Invest the Difference" where Difference = Mortgage - Rent.
            // If Mortgage is paid off, Mortgage = 0. Then Difference = 0 - Rent = -Rent.
            // This implies the Investor must pay Repnt from the Investment Pot? 
            // YES. That is the definition of "Rent vs Buy". You consume your capital to live if you don't own.

            const rent = currentRent;
            totalRentPaid += rent;

            const budget = buyCost; // The money 'used' in the buy scenario

            // Investment contribution = Budget - Rent
            // If Budget (Mortgage) > Rent, we invest positive amount.
            // If Budget (Mortgage paid off = 0) < Rent, we withdraw rent from equity.
            const monthlyContribution = budget - rent;

            investedEquity += monthlyContribution;

            // Update variables
            currentRent *= (1 + monthlyRentAdj);
        }


        // Wait, we need to project Property Value to the generic maxMonths if it ended early?
        // buySchedule stops when debt is 0. But property keeps appreciating.
        const lastInstallment = buySchedule[buySchedule.length - 1];
        let finalPropValue = lastInstallment.propertyValue;
        const monthsSincePayoff = maxMonths - lastInstallment.month;
        if (monthsSincePayoff > 0) {
            finalPropValue = finalPropValue * Math.pow(1 + params.propertyAppreciationAnnual / 100, monthsSincePayoff / 12);
        }

        const finalEquityBuy = finalPropValue; // Assuming debt 0

        return {
            buyScenario: {
                totalPaid: buySchedule.reduce((a, b) => a + b.totalCashFlow, 0),
                finalNetEquity: finalEquityBuy,
                installments: buySchedule
            },
            investScenario: {
                totalRentPaid,
                finalInvestedAmount: investedEquity,
                netEquity: investedEquity
            },
            decision: {
                financiallyBetter: finalEquityBuy > investedEquity ? 'BUY' : 'RENT_INVEST',
                difference: Math.abs(finalEquityBuy - investedEquity),
                breakEvenMonth: null // TODO: Implement finding the crossover point
            }
        };
    }
}

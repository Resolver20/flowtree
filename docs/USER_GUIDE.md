# FlowTree user guide

FlowTree is a private planning tool for mapping monthly income to priorities. It is not a bank connection, an investment recommendation, or proof of money saved.

## Start here

1. Open **Home** to see your whole monthly plan.
2. Add one or more income sources and set a safety buffer.
3. Add the monthly targets you want FlowTree to plan for.
4. Use the dedicated views for annual payments, loans, and life goals.
5. Sign in with Google Drive if you want the plan saved to your own Drive.

## Home

Home is the visual money-flow view: `income -> planning categories -> destinations`.

- Every card is a planned monthly amount, not an account balance.
- Categories are funded in their displayed order. Within a category, direct amounts are reserved before its children.
- **Available** is what remains after the safety buffer and plan targets. **Over-planned** means targets exceed the available monthly income.
- Select a branch to reveal its children. Use **Full tree overview** to see every branch together.

## Sinking funds

Use **Sinking funds** for yearly costs such as insurance, property tax, or renewals. Give the target a future target date. FlowTree calculates the monthly amount needed for the balance of that target, based on the expected progress already made in the current 12-month cycle.

## Loans

Use **Loans** for a clear payoff projection. Add the original principal, principal still outstanding, annual interest rate, remaining tenure, and any extra principal payment you intend to make each month.

The view shows the estimated monthly payment, interest remaining, payoff timeline, and a month-by-month repayment table. These are estimates: confirm the actual outstanding balance, rate resets, charges, and part-payment treatment with the lender.

## Life goals

Use **Life goals** to create monthly goals or yearly targets such as travel, a purchase, or a milestone fund. The form shows the monthly amount that will be added to the **Life goals** branch on Home before you save it.

## Google Drive and privacy

Google Drive is optional. When you sign in, FlowTree creates or uses its own private `FlowTree` folder and saves one readable JSON plan file named `flowtree-plan.json`. Your financial plan is held in the browser only while the page is open; there is no browser-local copy after the tab is closed.

The app requests the narrow `drive.file` permission. It does not read Gmail, Calendar, Contacts, or your general Drive contents. The user profile menu shows whether the current plan is connected to Drive.

## Direct JSON editing

Use the profile menu and choose **Edit plan JSON** to view and edit the same plain JSON saved in Google Drive. FlowTree validates the document before replacing the active plan. Keep IDs unique and use JSON numbers for monetary fields.

## A practical routine

At the beginning of a month, update income, buffer, loan balances, and any target dates. Then review the Home status. Add an extra loan payment only after confirming it will be treated as a principal part-payment by the lender, not simply as an advance EMI.

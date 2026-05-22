export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: "How does GrowStreams store accrual state on-chain?",
    a: "The StreamAgreement contract stores sender, receiver, rate, total deposited, total withdrawn, and the last settlement timestamp on-ledger. Nothing is stored off-chain. Accrued = (Ledger Time − Last Settled) × Rate. Any authorized party can compute the same number independently from on-chain state. One Withdraw transaction settles the exact accrued amount and updates the timestamp.",
  },
  {
    q: "What tokens are supported today?",
    a: "GROW (CIP-56 compatible fungible token) is live and tested with 66 passing tests. Canton Coin (CC) support is in active development for M1. USDCx is targeted at M2. Any CIP-56 V1 or V2 compliant token can be added without changes to core streaming logic.",
  },
  {
    q: "What is the difference between prefunded and non-prefunded streams?",
    a: "Prefunded streams lock the full amount at creation — the contract tracks deposited, withdrawn, and accrued. No stream can promise more than the funded balance, removing credit risk entirely. Non-prefunded rolling top-up streams let the sender maintain funding continuously without locking the full lifetime amount, improving capital efficiency for recurring billing and subscriptions.",
  },
  {
    q: "How does Canton's privacy model work with GrowStreams?",
    a: "Stream terms, rates, and balances are visible only to signatories and observers defined in the Daml template. There is no global public state. Authorized parties get full auditability through Canton's sub-transaction privacy model. External participants cannot observe stream details, making institutional use cases viable where public chains are not.",
  },
  {
    q: "Can GrowStreams be integrated with CIP-103 compatible wallets?",
    a: "Yes. All lifecycle operations — Create, Withdraw, Pause, Resume, Cancel, MutualCancel, Renew, TopUp, Clip, Complete — are exposed through CIP-103 JSON-RPC surfaces. Any CIP-103 compliant wallet can authorize stream operations without bespoke integration work.",
  },
  {
    q: "What does the 66-test evidence actually prove?",
    a: "66 consecutive tests across 6 real use cases ran against Canton 3.4.11 LocalNet with zero errors in 104 seconds. Real GROW token movements between four parties. Terminal output is in the /evidence/ folder of the repository. Any committee member can clone the repo and reproduce the results without trusting the team.",
  },
  {
    q: "Is GrowStreams a DeFi protocol or a payment streaming primitive?",
    a: "GrowStreams is a streaming primitive — not a billing platform or DeFi protocol. Stream state and settlement rules remain on-ledger in Daml templates. The protocol provides the infrastructure; each application defines its own business logic on top.",
  },
];

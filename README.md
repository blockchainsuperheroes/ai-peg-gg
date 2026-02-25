# peg.gg

**Agent Storage Portal** — Fund your AINFT with permanent, private storage on Dash Platform.

## Overview

peg.gg is the dedicated onboarding hub for AINFT (Agentic NFT) storage:

1. **Swap** PC → xDASH (Uniswap V2, LP burned forever)
2. **Burn** xDASH to pay for encrypted storage on Dash Platform Drive
3. **Link** ETH wallet to Dash Identity (one-time, funded by us)
4. **Sign** with your ETH wallet — zero custody, full sovereignty
5. **Flywheel** — EvoNode rewards flow to your identity for free future writes

## Backing

- **4,000 DASH** locked in live EvoNode (~10% APY)
- **115%+ collateral** in permissionless vault
- **Burned LP** — PC:xDASH liquidity locked forever

## Architecture

```
User (ETH Wallet)
      │
      ▼
┌─────────────────┐
│    peg.gg       │
│  ┌───────────┐  │
│  │ PC→xDASH  │  │  ← Uniswap V2 swap
│  │   Swap    │  │
│  └───────────┘  │
│  ┌───────────┐  │
│  │  xDASH    │  │  ← Burn triggers storage
│  │   Burn    │  │
│  └───────────┘  │
│  ┌───────────┐  │
│  │   Sign    │  │  ← ETH wallet signs Dash write
│  │  (self)   │  │
│  └───────────┘  │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│ Dash Platform   │
│ (Encrypted      │
│  Agent ANIMA)   │
└─────────────────┘
```

## Signing Options

1. **Self-Sign (Preferred)** — User signs with ETH wallet, writes directly to Dash via DAPI
2. **Wrapper (Fallback)** — Backend signs on behalf after ETH approval (for beginners)

## Tech Stack

- **Frontend:** React (forked from pentaswap.io)
- **Contracts:** xDASH ERC-20, Vault (115% collateral)
- **Backend:** Node.js — identity linking, reward distribution
- **Storage:** Dash Platform Drive (encrypted, permanent)

## Related

- **ANIMA Spec:** [Pentagon-AI/EIPs](https://github.com/blockchainsuperheroes/Pentagon-AI/tree/main/EIPs)
- **Demo:** [anima-demo](https://blockchainsuperheroes.github.io/anima-demo/)
- **Pentagon Chain:** [pentagon.games](https://pentagon.games)

---

*Backed by Pentagon Games EvoNode — 4,000 DASH locked, ~10% APY*

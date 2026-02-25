# peg.gg Incentive Flywheel

The economic engine that makes peg.gg a 10/10 project.

## EvoNode Rewards (Source)

As the operator of a live Dash EvoNode (4,000 DASH collateral locked), we capture:

| Source | Allocation | Notes |
|--------|------------|-------|
| **Platform Fees** | 100% to EvoNodes | Storage, identities, documents |
| **Core Block Rewards** | 37.5% MN portion | Regular MNs get 62.5% |

**Combined APY:** ~6-10%+ on 4,000 DASH collateral (real, sustainable yield)

## Reward Split (Our Allocation)

```
EvoNode Rewards (~6-10% APY)
         │
         ├── 40-50% → LP Deepening
         │            Auto-mint xDASH → add to Uniswap LP → burn LP tokens
         │            Result: Stronger peg, lower slippage, cheaper swaps
         │
         ├── 30-40% → User DASH Rewards  
         │            Native DASH sent directly to user's Dash Identity
         │            Result: FREE future writes after initial xDASH burn
         │
         └── 10-20% → Insurance Buffer
                      Extra collateral for 115%+ vault backing
                      Result: Permissionless redemption always works
```

## The Flywheel

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  User burns xDASH                                       │
│       │                                                 │
│       ▼                                                 │
│  AINFT prompt stored on Dash Platform                   │
│       │                                                 │
│       ▼                                                 │
│  Platform fees generated (100% to our EvoNode)          │
│       │                                                 │
│       ▼                                                 │
│  Rewards split: LP + User DASH + Buffer                 │
│       │                                                 │
│       ├──► Deeper LP = cheaper swaps = more users       │
│       │                                                 │
│       └──► Free DASH to users = more writes = more fees │
│                    │                                    │
│                    └────────────────────────────────────┘
│                              (loop)                     │
└─────────────────────────────────────────────────────────┘
```

## Why This is 10/10

### 1. Self-Sustaining Economy
Platform fees from xDASH burns flow back to us → we recycle into user incentives + LP depth → more usage → more fees → flywheel accelerates.

### 2. No Dilution Waste
Rewards grow the backing/peg instead of enriching operators. Every DASH earned strengthens the system.

### 3. User Sovereignty + Free Writes
Native DASH sent to user identities means:
- **Pay once** with PC/xDASH
- **Store forever** on Dash Platform
- **Free upgrades** via reward DASH (no more burns needed)

### 4. Redemption Safety
- 115%+ over-collateralized vault
- Insurance buffer from rewards
- Permissionless redemption = xDASH holders can ALWAYS claim real DASH

## User Journey

```
Day 1:  User swaps PC → xDASH → burns → stores AINFT prompt
        Cost: ~$X in PC

Day 30: User receives native DASH to their identity (from rewards)
        Cost for next write: $0 (uses reward DASH)

Day 60+: User continues storing/updating prompts
         Cost: $0 (perpetual free writes from accumulated DASH)
```

## Implementation

### Auto-Reward Script
- Monitors EvoNode rewards
- Splits per allocation above
- Auto-adds to LP + burns LP tokens
- Sends DASH to registered identities proportionally

### Vault Contract
- Holds 115%+ DASH collateral
- Permissionless burn-to-redeem
- Buffer fund tops up automatically

---

*This aligns everything: Pentagon Chain users get cheap Dash storage, Dash gets adoption, xDASH stays pegged & liquid, and our EvoNode yields compound the value.*

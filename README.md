# 🌍 Climate DAO: Decentralized Funding for Climate Tech Startups

Welcome to Climate DAO, a blockchain-powered platform that democratizes funding for innovative climate tech startups! By leveraging the Stacks blockchain, this project connects environmentally conscious investors with promising startups, using staked environmental impact tokens (EIT) to determine voting power. This solves the real-world problem of limited, centralized access to capital for climate solutions, while incentivizing genuine environmental commitment through token staking tied to verifiable impact metrics.

## ✨ Features

🌱 Earn and stake EIT based on verified environmental actions (e.g., carbon offsets or sustainable practices)  
💰 Crowdfund and allocate funds to climate tech startups via DAO proposals  
🗳️ Weighted voting system where influence is proportional to staked EIT  
📊 Transparent impact tracking and token minting for real-world contributions  
🔒 Secure, immutable records of funding decisions and distributions  
🚀 Startup verification to ensure legitimacy and alignment with climate goals  
📈 Automated treasury management for sustainable fund growth  
✅ Prevent sybil attacks with staking requirements for participation

## 🛠 How It Works

**For Contributors (Token Holders)**  
- Verify your environmental impact (e.g., via oracle-integrated carbon credits) to mint EIT.  
- Stake your EIT in the staking contract to gain voting power.  
- Participate in DAO votes on funding proposals—your vote weight scales with staked amount and duration.  

**For Startups**  
- Register your climate tech project with details like mission, milestones, and impact projections.  
- Submit a funding proposal outlining requested amount and use of funds.  
- If approved by DAO vote, receive funds from the treasury with automated milestone-based releases.  

**For Verifiers and Voters**  
- Browse active proposals and cast votes using your staked EIT.  
- Track funded projects' progress via on-chain impact reports.  
- Unstake EIT after lockup periods, with rewards for long-term commitment.  

That's it! A transparent, decentralized way to accelerate climate innovation.

## 📜 Smart Contracts

This project involves 8 smart contracts written in Clarity for the Stacks blockchain, ensuring modularity, security, and composability:

1. **EIT-Token Contract**: Defines the environmental impact token (EIT) as a fungible token (using SIP-010 standard). Handles minting based on verified impact and basic transfers.  

2. **Impact-Oracle Contract**: Integrates with external oracles to verify real-world environmental actions (e.g., carbon offsets) and triggers EIT minting.  

3. **Staking Contract**: Allows users to stake EIT for voting power. Calculates weighted votes based on stake amount and time locked, with slashing for malicious behavior.  

4. **DAO-Governance Contract**: Manages proposal creation, voting periods, and quorum requirements. Ties votes to staked EIT from the staking contract.  

5. **Proposal-Submission Contract**: Enables startups to submit funding proposals with details like amount requested, milestones, and impact metrics. Validates submissions for completeness.  

6. **Startup-Registry Contract**: Registers and verifies startups, storing on-chain profiles and ensuring they meet climate-focused criteria (e.g., via admin or community approval).  

7. **Treasury Contract**: Holds and manages the DAO's funds (e.g., in STX or BTC). Automates fund distributions to approved proposals and handles deposits from contributors.  

8. **Milestone-Release Contract**: Enforces automated, conditional releases of funds to startups based on verified milestones (integrated with the oracle for proof-of-progress).
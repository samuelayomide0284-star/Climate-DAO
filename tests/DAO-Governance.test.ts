import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV, principalCV, boolCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_PROPOSAL_EXISTS = 101;
const ERR_PROPOSAL_NOT_FOUND = 102;
const ERR_INVALID_QUORUM = 103;
const ERR_INVALID_DURATION = 104;
const ERR_INVALID_AMOUNT = 105;
const ERR_VOTING_ENDED = 106;
const ERR_VOTING_NOT_STARTED = 107;
const ERR_ALREADY_VOTED = 108;
const ERR_INSUFFICIENT_STAKE = 109;
const ERR_INVALID_STATUS = 110;
const ERR_QUORUM_NOT_MET = 111;
const ERR_PROPOSAL_REJECTED = 112;
const ERR_TREASURY_FAIL = 113;
const ERR_STAKING_FAIL = 114;
const ERR_INVALID_TITLE = 115;
const ERR_INVALID_DESC = 116;
const ERR_MAX_PROPOSALS = 117;
const ERR_INVALID_VOTE = 118;
const ERR_NOT_ELIGIBLE = 119;
const ERR_INVALID_START = 120;

interface Proposal {
  title: string;
  description: string;
  proposer: string;
  fundingAmount: number;
  startHeight: number;
  endHeight: number;
  yesVotes: number;
  noVotes: number;
  status: string;
  executed: boolean;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class DaoGovernanceMock {
  state: {
    nextProposalId: number;
    quorumThreshold: number;
    votingDuration: number;
    maxProposals: number;
    minStakeRequired: number;
    totalStaked: number;
    admin: string;
    stakingContract: string;
    treasuryContract: string;
    proposalSubmissionContract: string;
    proposals: Map<number, Proposal>;
    votes: Map<string, boolean>;
    voterWeights: Map<string, number>;
  } = {
    nextProposalId: 0,
    quorumThreshold: 50,
    votingDuration: 1440,
    maxProposals: 1000,
    minStakeRequired: 100,
    totalStaked: 0,
    admin: "ST1ADMIN",
    stakingContract: "SP000000000000000000002Q6VF78",
    treasuryContract: "SP000000000000000000002Q6VF78",
    proposalSubmissionContract: "SP000000000000000000002Q6VF78",
    proposals: new Map(),
    votes: new Map(),
    voterWeights: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  stakedAmounts: Map<string, number> = new Map();
  treasuryReleases: Array<{ to: string; amount: number }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextProposalId: 0,
      quorumThreshold: 50,
      votingDuration: 1440,
      maxProposals: 1000,
      minStakeRequired: 100,
      totalStaked: 0,
      admin: "ST1ADMIN",
      stakingContract: "SP000000000000000000002Q6VF78",
      treasuryContract: "SP000000000000000000002Q6VF78",
      proposalSubmissionContract: "SP000000000000000000002Q6VF78",
      proposals: new Map(),
      votes: new Map(),
      voterWeights: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stakedAmounts = new Map();
    this.treasuryReleases = [];
  }

  setQuorumThreshold(newQuorum: number): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newQuorum <= 0 || newQuorum > 100) return { ok: false, value: ERR_INVALID_QUORUM };
    this.state.quorumThreshold = newQuorum;
    return { ok: true, value: true };
  }

  setVotingDuration(newDuration: number): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newDuration <= 0) return { ok: false, value: ERR_INVALID_DURATION };
    this.state.votingDuration = newDuration;
    return { ok: true, value: true };
  }

  setMinStakeRequired(newMin: number): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newMin <= 0) return { ok: false, value: ERR_INSUFFICIENT_STAKE };
    this.state.minStakeRequired = newMin;
    return { ok: true, value: true };
  }

  createProposal(title: string, description: string, fundingAmount: number, startHeight: number): Result<number> {
    if (this.caller !== this.state.proposalSubmissionContract) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (this.state.nextProposalId >= this.state.maxProposals) return { ok: false, value: ERR_MAX_PROPOSALS };
    if (!title || title.length > 100) return { ok: false, value: ERR_INVALID_TITLE };
    if (!description || description.length > 500) return { ok: false, value: ERR_INVALID_DESC };
    if (fundingAmount <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    if (startHeight < this.blockHeight) return { ok: false, value: ERR_INVALID_START };
    const id = this.state.nextProposalId;
    this.state.proposals.set(id, {
      title,
      description,
      proposer: this.caller,
      fundingAmount,
      startHeight,
      endHeight: startHeight + this.state.votingDuration,
      yesVotes: 0,
      noVotes: 0,
      status: "active",
      executed: false,
    });
    this.state.nextProposalId++;
    return { ok: true, value: id };
  }

  vote(proposalId: number, voteYes: boolean): Result<boolean> {
    const proposal = this.state.proposals.get(proposalId);
    if (!proposal) return { ok: false, value: ERR_PROPOSAL_NOT_FOUND };
    const stake = this.stakedAmounts.get(this.caller) || 0;
    if (stake < this.state.minStakeRequired) return { ok: false, value: ERR_INSUFFICIENT_STAKE };
    if (this.blockHeight < proposal.startHeight) return { ok: false, value: ERR_VOTING_NOT_STARTED };
    if (this.blockHeight >= proposal.endHeight) return { ok: false, value: ERR_VOTING_ENDED };
    const voteKey = `${proposalId}-${this.caller}`;
    if (this.state.votes.has(voteKey)) return { ok: false, value: ERR_ALREADY_VOTED };
    if (voteYes) {
      proposal.yesVotes += stake;
    } else {
      proposal.noVotes += stake;
    }
    this.state.votes.set(voteKey, voteYes);
    this.state.voterWeights.set(voteKey, stake);
    return { ok: true, value: true };
  }

  endVoting(proposalId: number): Result<boolean> {
    const proposal = this.state.proposals.get(proposalId);
    if (!proposal) return { ok: false, value: ERR_PROPOSAL_NOT_FOUND };
    if (this.blockHeight < proposal.endHeight) return { ok: false, value: ERR_VOTING_ENDED };
    if (proposal.executed) return { ok: false, value: ERR_INVALID_STATUS };
    const totalVotes = proposal.yesVotes + proposal.noVotes;
    const quorumRequired = (this.state.totalStaked * this.state.quorumThreshold) / 100;
    if (totalVotes < quorumRequired) {
      proposal.status = "failed-quorum";
      proposal.executed = true;
      return { ok: false, value: ERR_QUORUM_NOT_MET };
    }
    if (proposal.yesVotes > proposal.noVotes) {
      proposal.status = "passed";
      proposal.executed = true;
      this.treasuryReleases.push({ to: proposal.proposer, amount: proposal.fundingAmount });
      return { ok: true, value: true };
    } else {
      proposal.status = "rejected";
      proposal.executed = true;
      return { ok: false, value: ERR_PROPOSAL_REJECTED };
    }
  }

  updateTotalStaked(newTotal: number): Result<boolean> {
    if (this.caller !== this.state.stakingContract) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.totalStaked = newTotal;
    return { ok: true, value: true };
  }

  getProposalCount(): Result<number> {
    return { ok: true, value: this.state.nextProposalId };
  }

  isVotingActive(id: number): Result<boolean> {
    const proposal = this.state.proposals.get(id);
    if (!proposal) return { ok: false, value: ERR_PROPOSAL_NOT_FOUND };
    return { ok: true, value: this.blockHeight >= proposal.startHeight && this.blockHeight < proposal.endHeight };
  }
}

describe("DaoGovernance", () => {
  let contract: DaoGovernanceMock;

  beforeEach(() => {
    contract = new DaoGovernanceMock();
    contract.reset();
  });

  it("sets quorum threshold successfully", () => {
    contract.caller = "ST1ADMIN";
    const result = contract.setQuorumThreshold(60);
    expect(result.ok).toBe(true);
    expect(contract.state.quorumThreshold).toBe(60);
  });

  it("rejects quorum threshold change by non-admin", () => {
    contract.caller = "ST2FAKE";
    const result = contract.setQuorumThreshold(60);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects invalid quorum threshold", () => {
    contract.caller = "ST1ADMIN";
    const result = contract.setQuorumThreshold(101);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_QUORUM);
  });

  it("creates proposal successfully", () => {
    contract.caller = "SP000000000000000000002Q6VF78";
    const result = contract.createProposal("Title", "Description", 1000, 10);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    const proposal = contract.state.proposals.get(0);
    expect(proposal?.title).toBe("Title");
    expect(proposal?.fundingAmount).toBe(1000);
    expect(proposal?.startHeight).toBe(10);
    expect(proposal?.endHeight).toBe(10 + 1440);
  });

  it("rejects proposal creation by unauthorized", () => {
    contract.caller = "ST2FAKE";
    const result = contract.createProposal("Title", "Description", 1000, 10);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects invalid title", () => {
    contract.caller = "SP000000000000000000002Q6VF78";
    const result = contract.createProposal("", "Description", 1000, 10);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_TITLE);
  });

  it("votes successfully", () => {
    contract.caller = "SP000000000000000000002Q6VF78";
    contract.createProposal("Title", "Description", 1000, 0);
    contract.caller = "ST1TEST";
    contract.stakedAmounts.set("ST1TEST", 200);
    contract.blockHeight = 5;
    const result = contract.vote(0, true);
    expect(result.ok).toBe(true);
    const proposal = contract.state.proposals.get(0);
    expect(proposal?.yesVotes).toBe(200);
  });

  it("rejects vote with insufficient stake", () => {
    contract.caller = "SP000000000000000000002Q6VF78";
    contract.createProposal("Title", "Description", 1000, 0);
    contract.caller = "ST1TEST";
    contract.stakedAmounts.set("ST1TEST", 50);
    const result = contract.vote(0, true);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INSUFFICIENT_STAKE);
  });

  it("rejects vote before start", () => {
    contract.caller = "SP000000000000000000002Q6VF78";
    contract.createProposal("Title", "Description", 1000, 10);
    contract.caller = "ST1TEST";
    contract.stakedAmounts.set("ST1TEST", 200);
    contract.blockHeight = 5;
    const result = contract.vote(0, true);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_VOTING_NOT_STARTED);
  });

  it("ends voting and passes proposal", () => {
    contract.caller = "SP000000000000000000002Q6VF78";
    contract.createProposal("Title", "Description", 1000, 0);
    contract.caller = "ST1TEST";
    contract.stakedAmounts.set("ST1TEST", 200);
    contract.state.totalStaked = 300;
    contract.vote(0, true);
    contract.blockHeight = 1441;
    const result = contract.endVoting(0);
    expect(result.ok).toBe(true);
    const proposal = contract.state.proposals.get(0);
    expect(proposal?.status).toBe("passed");
    expect(contract.treasuryReleases).toEqual([{ to: "SP000000000000000000002Q6VF78", amount: 1000 }]);
  });

  it("ends voting but quorum not met", () => {
    contract.caller = "SP000000000000000000002Q6VF78";
    contract.createProposal("Title", "Description", 1000, 0);
    contract.caller = "ST1TEST";
    contract.stakedAmounts.set("ST1TEST", 100);
    contract.state.totalStaked = 1000;
    contract.vote(0, true);
    contract.blockHeight = 1441;
    const result = contract.endVoting(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_QUORUM_NOT_MET);
  });

  it("updates total staked successfully", () => {
    contract.caller = "SP000000000000000000002Q6VF78";
    const result = contract.updateTotalStaked(500);
    expect(result.ok).toBe(true);
    expect(contract.state.totalStaked).toBe(500);
  });

  it("rejects total staked update by unauthorized", () => {
    contract.caller = "ST2FAKE";
    const result = contract.updateTotalStaked(500);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("gets proposal count", () => {
    contract.caller = "SP000000000000000000002Q6VF78";
    contract.createProposal("Title1", "Desc1", 1000, 0);
    contract.createProposal("Title2", "Desc2", 2000, 0);
    const result = contract.getProposalCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks if voting active", () => {
    contract.caller = "SP000000000000000000002Q6VF78";
    contract.createProposal("Title", "Description", 1000, 0);
    contract.blockHeight = 500;
    const result = contract.isVotingActive(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
  });
});
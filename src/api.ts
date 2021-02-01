import { UnwrapPromiseRec, whenDefined } from "./utils";
import { P2PPromiseClient } from "../grpc-api-client/concordium_p2p_rpc_grpc_web_pb";
import * as T from "../grpc-api-client/concordium_p2p_rpc_pb";

// Constants

const nodeUrl = "http://localhost:9999";

console.info("Connecting to node GRPC at ", nodeUrl);

const client = new P2PPromiseClient(nodeUrl);
const meta = { authentication: "rpcadmin" };
const empty = new T.Empty();

// Types

export type ConsensusInfo = {
  bestBlock: string;
  bestBlockHeight: number;
  blockArriveLatencyEMA: number;
  blockArriveLatencyEMSD: number;
  blockArrivePeriodEMA: number;
  blockArrivePeriodEMSD: number;
  blockLastArrivedTime: Date;
  blockLastReceivedTime: Date | null;
  blockReceiveLatencyEMA: number;
  blockReceiveLatencyEMSD: number;
  blockReceivePeriodEMA: number;
  blockReceivePeriodEMSD: number;
  blocksReceivedCount: number;
  blocksVerifiedCount: number;
  epochDuration: number;
  finalizationCount: number;
  finalizationPeriodEMA: number;
  finalizationPeriodEMSD: number;
  genesisBlock: string;
  genesisTime: Date;
  lastFinalizedBlock: string;
  lastFinalizedBlockHeight: number;
  lastFinalizedTime: Date | null;
  slotDuration: number;
  transactionsPerBlockEMA: number;
  transactionsPerBlockEMSD: number;
};

export type BirkParametersBaker = {
  bakerAccount: string;
  bakerId: number;
  bakerLotteryPower: number;
};

export type BirkParametersInfo = {
  bakers: BirkParametersBaker[];
  electionDifficulty: number;
  electionNonce: string;
};

type EncryptedAmount = {
  incomingAmounts: string[];
  selfAmount: string;
  startIndex: number;
};

type AccountInfoBaker = {
  restakeEarnings: boolean;
  bakerId: number;
  bakerAggregationVerifyKey: string;
  bakerElectionVerifyKey: string;
  bakerSignatureVerifyKey: string;
  stakedAmount: Amount;
  pendingChange?: BakerChange;
};

export type BakerChange =
  | {
      change: "ReduceStake";
      newStake: Amount;
      epoch: number;
    }
  | {
      change: "RemoveBaker";
      epoch: number;
    };

export type ContractAddress = {
  index: number;
  subindex: number;
};

export type Amount = BigInt;

export type ScheduleItem = {
  timestamp: Date;
  amount: Amount;
  transactions: string[];
};

type AccountReleaseSchedule = {
  schedule: ScheduleItem[];
  total: Amount;
};

type AccountCredential = {
  v: 0;
  value: InitialAccountCredential | NormalAccountCredential;
};

type InitialAccountCredential = {
  type: "initial";
  contents: {
    account: { threshold: number; keys: string[] };
    regId: string;
    ipIdentity: number;
    policy: Policy;
  };
};

type NormalAccountCredential = {
  type: "normal";
  contents: {
    account: { threshold: number; keys: string[] };
    regId: string;
    ipIdentity: number;
    revocationThreshold: number;
    arData: Record<string, { encIdCredPubShare: string }>;
    policy: Policy;
  };
};

type Policy = {
  createdAt: Date;
  validTo: Date;
  revealedAttributes: PolicyAttributes;
};

type PolicyAttributes = Partial<{
  firstName: string;
  lastName: string;
  sex: string;
  dob: string;
  countryOfResidence: string;
  nationality: string;
  idDocType: string;
  idDocNo: string;
  idDocIssuer: string;
  idDocIssuedAt: string;
  idDocExpiresAt: string;
  nationalIdNo: string;
  taxIdNo: string;
  UNKNOWN: string;
}>;

export type AccountInfo = {
  accountAmount: Amount;
  accountBaker?: AccountInfoBaker;
  accountCredentials: AccountCredential[];
  accountEncryptedAmount: EncryptedAmount;
  accountEncryptionKey: string;
  accountInstances: ContractAddress[];
  accountNonce: number;
  accountReleaseSchedule: AccountReleaseSchedule;
};

type IpOrArDescription = {
  url: string;
  name: string;
  description: string;
};

type IdentityProvider = {
  ipIdentity: number;
  ipCdiVerifyKey: string;
  ipDescription: IpOrArDescription;
  ipVerifyKey: string;
};

type AnonymityRevoker = {
  arIdentity: number;
  arPublicKey: string;
  arDescription: IpOrArDescription;
};

export type PeersInfo = UnwrapPromiseRec<ReturnType<typeof fetchPeersInfo>>;
export type PeerInfo = UnwrapPromiseRec<ReturnType<typeof fetchPeerInfo>>;

export type NodeInfo = UnwrapPromiseRec<ReturnType<typeof fetchNodeInfo>>;

// Helper functions

function parseAmountString(amount: string): Amount {
  return BigInt(amount);
}

function parsePolicyDate(str: string): Date {
  const date = new Date(0);
  const year = parseInt(str.slice(0, 4));
  const month = parseInt(str.slice(4, 6));
  date.setFullYear(year, month);
  return date;
}

function getGoogleStringValue(stringValue: any): string | undefined {
  return stringValue?.getValue();
}

function createGoogleValue(value: string) {
  return {
    toArray: () => [value],
    getValue: () => value,
  };
}

function getGoogleIntValue(intValue: any): number | undefined {
  return intValue?.getValue();
}

function catchupStatusToString(status: T.PeerElement.CatchupStatus) {
  switch (status) {
    case T.PeerElement.CatchupStatus.UPTODATE:
      return "Up to date";
    case T.PeerElement.CatchupStatus.PENDING:
      return "Pending";
    default:
    case T.PeerElement.CatchupStatus.CATCHINGUP:
      return "Catching up";
  }
}

function isInBakingCommitteeToString(
  status: T.NodeInfoResponse.IsInBakingCommittee
) {
  switch (status) {
    case T.NodeInfoResponse.IsInBakingCommittee.ACTIVE_IN_COMMITTEE:
      return "Active in committee";
    case T.NodeInfoResponse.IsInBakingCommittee
      .ADDED_BUT_NOT_ACTIVE_IN_COMMITTEE:
      return "Added but not active in committee";
    case T.NodeInfoResponse.IsInBakingCommittee.ADDED_BUT_WRONG_KEYS:
      return "Added but wrong keys";
    default:
    case T.NodeInfoResponse.IsInBakingCommittee.NOT_IN_COMMITTEE:
      return "Not in committee";
  }
}

// API functions

export async function fetchNodeInfo() {
  const res = await client.nodeInfo(empty, meta);

  return {
    id: getGoogleStringValue(res.getNodeId()),
    localTime: new Date(res.getCurrentLocaltime() * 1000),
    inBakingCommittee: isInBakingCommitteeToString(
      res.getConsensusBakerCommittee()
    ),
    bakerId: getGoogleIntValue(res.getConsensusBakerId()),
    bakerRunning: res.getConsensusBakerRunning(),
    inFinalizationCommittee: res.getConsensusFinalizerCommittee(),
  } as const;
}

export async function fetchPeersInfo() {
  const peersRequest = new T.PeersRequest();
  peersRequest.setIncludeBootstrappers(false);

  const [listRes, statsRes, bannedRes] = await Promise.all([
    client.peerList(peersRequest, meta),
    client.peerStats(peersRequest, meta),
    client.getBannedPeers(empty, meta),
  ]);

  const peerStatsMap = new Map(
    statsRes.getPeerstatsList().map((s) => [
      s.getNodeId(),
      {
        packetsSent: s.getPacketsSent(),
        packetsReceived: s.getPacketsReceived(),
        latency: s.getLatency(),
      },
    ])
  );

  const peers = listRes.getPeersList().map((peer) => {
    const id = getGoogleStringValue(peer.getNodeId());
    const stats = id !== undefined ? peerStatsMap.get(id) : undefined;
    const ip = getGoogleStringValue(peer.getIp());
    const port = getGoogleIntValue(peer.getPort());
    return {
      id,
      ip,
      port,
      status: catchupStatusToString(peer.getCatchupStatus()),
      stats,
    } as const;
  });

  const banned = bannedRes.getPeersList().map((peer) => {
    const id = getGoogleStringValue(peer.getNodeId());
    const ip = getGoogleStringValue(peer.getIp());
    const port = getGoogleIntValue(peer.getPort());
    return {
      id,
      ip,
      port,
    };
  });

  return {
    avgBpsIn: statsRes.getAvgBpsIn(),
    avgBpsOut: statsRes.getAvgBpsOut(),
    peers,
    banned,
  };
}

export async function fetchPeerInfo() {
  const [
    resVersion,
    resPeerUpTime,
    packetsSent,
    packetsReceived,
  ] = await Promise.all([
    client.peerVersion(empty, meta),
    client.peerUptime(empty, meta),
    client.peerTotalSent(empty, meta),
    client.peerTotalReceived(empty, meta),
  ]);
  return {
    version: resVersion.getValue(),
    uptime: resPeerUpTime.getValue(),
    packetsSent: packetsSent.getValue(),
    packetsReceived: packetsReceived.getValue(),
  };
}

export async function fetchConsensusInfo(): Promise<ConsensusInfo> {
  const res = await client.getConsensusStatus(empty, meta);

  const json = JSON.parse(res.getValue());

  // Parsing date fields into Date objects
  const dateFields = [
    "blockLastArrivedTime",
    "blockLastReceivedTime",
    "genesisTime",
    "lastFinalizedTime",
  ];
  for (const field of dateFields) {
    const dateString = json[field];
    if (dateString !== null) {
      json[field] = new Date(Date.parse(dateString));
    }
  }
  return json;
}

export async function fetchBirkParameters(
  blockHash: string
): Promise<BirkParametersInfo> {
  const request = new T.BlockHash();
  request.setBlockHash(blockHash);
  const res = await client.getBirkParameters(request, meta);
  return JSON.parse(res.getValue());
}

export async function fetchAccountInfo(
  blockHash: string,
  accountAddress: string
): Promise<AccountInfo> {
  const request = new T.GetAddressInfoRequest();
  request.setBlockHash(blockHash);
  request.setAddress(accountAddress);

  const res = await client.getAccountInfo(request, meta);
  const json = JSON.parse(res.getValue());

  // Parse amount strings
  json.accountAmount = parseAmountString(json.accountAmount);
  whenDefined(
    (a) => (json.accountBaker.stakedAmount = parseAmountString(a)),
    json.accountBaker?.stakedAmount
  );

  // Parse credential dates
  for (const cred of json.accountCredentials) {
    const { policy } = cred.value.contents;
    policy.createdAt = parsePolicyDate(policy.createdAt);
    policy.validTo = parsePolicyDate(policy.validTo);
  }

  // Parse release schedule
  json.accountReleaseSchedule.total = parseAmountString(
    json.accountReleaseSchedule.total
  );
  for (const schedule of json.accountReleaseSchedule.schedule) {
    schedule.amount = parseAmountString(schedule.amount);
    schedule.timestamp = new Date(schedule.timestamp);
  }

  return json;
}

export async function fetchIdentityProviders(
  blockHash: string
): Promise<Map<number, IdentityProvider>> {
  const request = new T.BlockHash();
  request.setBlockHash(blockHash);

  const res = await client.getIdentityProviders(request, meta);
  const json: IdentityProvider[] = JSON.parse(res.getValue());
  const map = new Map(json.map((ip) => [ip.ipIdentity, ip]));
  return map;
}

export async function fetchAnonymityRevokers(blockHash: string) {
  const request = new T.BlockHash();
  request.setBlockHash(blockHash);

  const res = await client.getAnonymityRevokers(request, meta);
  const json: AnonymityRevoker[] = JSON.parse(res.getValue());
  const map = new Map(json.map((ar) => [ar.arIdentity, ar]));
  return map;
}

export async function banNode(nodeId: string) {
  const node = new T.PeerElement();
  node.setNodeId(createGoogleValue(nodeId));
  const res = await client.banNode(node, meta);
  return res.getValue();
}

export async function unbanNode(nodeId: string) {
  const node = new T.PeerElement();
  node.setNodeId(createGoogleValue(nodeId));
  const res = await client.unbanNode(node, meta);
  return res.getValue();
}

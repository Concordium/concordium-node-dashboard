import { UnwrapPromiseRec } from "./utils";
import { P2PPromiseClient } from "../grpc-api-client/concordium_p2p_rpc_grpc_web_pb";
import * as T from "../grpc-api-client/concordium_p2p_rpc_pb";

const nodeUrl = "http://localhost:9999";

console.info("Connecting to node GRPC at ", nodeUrl);

const client = new P2PPromiseClient(nodeUrl);
const meta = { authentication: "rpcadmin" };
const empty = new T.Empty();

function getGoogleStringValue(stringValue: any): string | undefined {
  return stringValue?.getValue();
}

function getGoogleIntValue(intValue: any): number | undefined {
  return intValue?.getValue();
}

export async function fetchNodeInfo() {
  const res = await client.nodeInfo(empty, meta);
  return {
    id: getGoogleStringValue(res.getNodeId()),
    localTime: new Date(res.getCurrentLocaltime() * 1000),
    inBakingCommittee: res.getConsensusBakerCommittee(),
    bakerId: getGoogleIntValue(res.getConsensusBakerId()),
    bakerRunning: res.getConsensusBakerRunning(),
    inFinalizationCommittee: res.getConsensusFinalizerCommittee(),
  };
}

const peersRequest = new T.PeersRequest();
peersRequest.setIncludeBootstrappers(true);

export async function fetchPeersInfo() {
  const [listRes, statsRes] = await Promise.all([
    client.peerList(peersRequest, meta),
    client.peerStats(peersRequest, meta),
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
  const peers = listRes.getPeersList().map((p) => {
    const id = getGoogleStringValue(p.getNodeId());
    const stats = id !== undefined ? peerStatsMap.get(id) : undefined;
    const ip = getGoogleStringValue(p.getIp());
    const port = getGoogleIntValue(p.getPort());
    return {
      address: `${ip}:${port}`,
      id,
      status: catchupStatusToString(p.getCatchupStatus()),
      stats,
    };
  });
  return peers;
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
    fetchConsensusInfo(),
  ]);
  return {
    version: resVersion.getValue(),
    uptime: resPeerUpTime.getValue(),
    packetsSent: packetsSent.getValue(),
    packetsReceived: packetsReceived.getValue(),
  };
}

type ConsensusInfo = {
  bestBlock: string;
  bestBlockHeight: number;
  blockArriveLatencyEMA: number;
  blockArriveLatencyEMSD: number;
  blockArrivePeriodEMA: number;
  blockArrivePeriodEMSD: number;
  blockLastArrivedTime: Date;
  blockLastReceivedTime: Date;
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
  lastFinalizedTime: Date;
  slotDuration: number;
  transactionsPerBlockEMA: number;
  transactionsPerBlockEMSD: number;
};

export async function fetchConsensusInfo(): Promise<ConsensusInfo> {
  const res = await client.getConsensusStatus(empty, meta);

  let json = JSON.parse(res.getValue());

  // Parsing date fields into Date objects
  const dateFields = [
    "blockLastArrivedTime",
    "blockLastReceivedTime",
    "genesisTime",
    "lastFinalizedTime",
  ];
  for (const field of dateFields) {
    json[field] = new Date(Date.parse(json[field]));
  }
  return json;
}

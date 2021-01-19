import { UnwrapPromiseRec } from "./utils";
import { P2PPromiseClient } from "../grpc-api-client/concordium_p2p_rpc_grpc_web_pb";
import * as T from "../grpc-api-client/concordium_p2p_rpc_pb";

const nodeUrl = "http://localhost:9999";

console.info("Connecting to node GRPC at ", nodeUrl);

const client = new P2PPromiseClient(nodeUrl);
const meta = { authentication: "rpcadmin" };
const empty = new T.Empty();

export type FetchedNodeInfo = UnwrapPromiseRec<
  ReturnType<typeof fetchNodeInfo>
>;

function getGoogleStringValue(stringValue: any): string {
  return stringValue.array[0];
}

export async function fetchNodeInfo() {
  const [resVersion, resNodeInfo, resPeerUpTime] = await Promise.all([
    client.peerVersion(empty, meta),
    client.nodeInfo(empty, meta),
    client.peerUptime(empty, meta),
  ]);
  return {
    id: getGoogleStringValue(resNodeInfo.getNodeId()),
    version: resVersion.getValue(),
    uptime: resPeerUpTime.getValue(),
    localTime: new Date(resNodeInfo.getCurrentLocaltime() * 1000),
  };
}

export type FetchedPeersInfo = UnwrapPromiseRec<
  ReturnType<typeof fetchNodeInfo>
>;

const peersRequest = new T.PeersRequest();
peersRequest.setIncludeBootstrappers(false);

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
    const stats = peerStatsMap.get(id);
    return {
      ipAddress: getGoogleStringValue(p.getIp()),
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

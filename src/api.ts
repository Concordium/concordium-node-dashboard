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

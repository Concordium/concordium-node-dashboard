import { P2PPromiseClient } from "../grpc-api-client/concordium_p2p_rpc_grpc_web_pb";
import * as T from "../grpc-api-client/concordium_p2p_rpc_pb";

const nodeUrl = process.env.NODE_URL ?? "http://localhost:9999";

console.info("Connecting to node GRPC at ", nodeUrl);

const client = new P2PPromiseClient(nodeUrl);

client
  .peerVersion(new T.Empty(), { authentication: "rpcadmin" })
  .then((res) => console.log(res.getValue()))
  .catch((err) => console.error(err));

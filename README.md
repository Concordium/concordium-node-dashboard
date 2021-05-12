# Concordium Node dashboard

[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](https://github.com/Concordium/.github/blob/main/.github/CODE_OF_CONDUCT.md)

A dashboard shipped with the concordium-node for inspecting the current state of the node.

## Installation

Install [NodeJS](https://nodejs.org/en/) and NPM.


Install dependencies using the following from the project root:

```
npm install
```

### Build the GRPC TypeScript client

Either you install the dependencies manually or you can use a docker image.

#### Manual install

Install the protoc tool for generating protobuf files:

- MacOS: brew install protobuf
- Ubuntu 19.10: sudo apt install protobuf-compiler

Install the code generator plugin for GRPC-web to PATH, see [instructions on GRPC-web](https://github.com/grpc/grpc-web#code-generator-plugin).


Fetch the GRPC proto files for the Concordium-node:

```
git submodules update --init
```

Build the GRPC-client for TypeScript:

```
./build_grpc-web-client.sh
```
If this succeeds: a directory `grpc-api-client` should be in your project root.

#### Docker image

With docker and docker-compose installed run:

```
docker-compose up build-grpc
```

## Development

Since a browser cannot use the GRPC protocol directly, a proxy must be in front, start an envoy proxy which assumes the Node GRPC api is running on `localhost:10000`:

```
docker-compose up grpc-proxy
```

To watch files and automate the build run:

```
npm run dev
```

### CAVEATS

- Note that on MacOS the docker `network_mode: "host"` is not currently supported by the Docker Desktop for MacOS. 
  In order to run this locally, one has to remove the `network_mode` from the `docker-compose.yml` and expose the ports 
  `9901` and `9999` i.e., insert the following to the grpc-proxy. 
  
  ```
  ports:
    - "9901:9901"
    - "9999:9999"
  ```
 Moreover one has to substitute the localhost IP in `envoy.yaml` i.e., `127.0.0.1`  with `host.docker.internal`.
 Finally substitute the `GRPC_WEB_HOST` URL in `api.ts` with `http://localhost:9999` (the proxy runs on this port by default).

### Using a node on stagenet

If you want to use a node at a different address, update the envoy config to this address.


### Before commiting:

- Everything should typecheck `npm run typecheck`
- No warnings from the linter `npm run linter`
- Formatting is consistent `npm run formatcheck`

## Building

Run the following command, which will create a `dist` directory containing the build:

```
npm run build
```

## Releasing


As this is shipped as part of the concordium-node container, the image for the concordium-node contains the runtime dependencies (nginx and envoy),
but uses the image `192549843005.dkr.ecr.eu-west-1.amazonaws.com/concordium/node-dashboard`
for the configuration and static files for the node dashboard.

To build the image run the following in the project root:
```
docker build . --tag 192549843005.dkr.ecr.eu-west-1.amazonaws.com/concordium/node-dashboard:<some-version>
```
Make sure to replace `<some-version>`.
This will build the static files and copy the configuration files of envoy and nginx to the image.

Then to push the image, you need the aws-cli and to login before running:

```
docker push 192549843005.dkr.ecr.eu-west-1.amazonaws.com/concordium/node-dashboard:<some-version>
```

To use in staging and/or testnet, update the version found in the dockerfiles
found in concordium node repository.

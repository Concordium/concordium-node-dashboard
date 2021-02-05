# Concordium Node dashboard

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

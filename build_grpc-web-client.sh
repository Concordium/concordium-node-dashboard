#!/bin/bash

PROTO_SRC_DIR=./deps/grpc-api
PROTO_DEST=./grpc-api-client

mkdir -p ${PROTO_DEST}

# TypeScript code generation
protoc --js_out=import_style=commonjs:${PROTO_DEST} \
       --grpc-web_out=import_style=commonjs+dts,mode=grpcwebtext:${PROTO_DEST} \
       --proto_path ${PROTO_SRC_DIR} \
       ${PROTO_SRC_DIR}/*.proto

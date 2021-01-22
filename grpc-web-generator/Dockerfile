FROM ubuntu:20.04 AS builder

ARG MAKEFLAGS=-j8

RUN apt-get update && apt-get install -y \
  automake \
  build-essential \
  git \
  libtool \
  make

RUN git clone --depth 1 --branch 1.2.0 --single-branch https://github.com/grpc/grpc-web /github/grpc-web

WORKDIR /github/grpc-web

## Install gRPC and protobuf

RUN ./scripts/init_submodules.sh

RUN cd third_party/grpc && make && make install

RUN cd third_party/grpc/third_party/protobuf && make install

## Install all the gRPC-web plugin

RUN make install-plugin

FROM ubuntu:20.04

COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /usr/local/include /usr/local/include

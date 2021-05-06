# Build the grpc-web client
FROM juanjodiaz/grpc-web-generator:1.2.1 AS build-grpc

WORKDIR /project

COPY ./deps/grpc-api ./deps/grpc-api
COPY ./build_grpc-web-client.sh .

RUN ./build_grpc-web-client.sh

# Build the static files
FROM node:15.8 AS build-project

WORKDIR /project

# Install dependencies
COPY package.json ./
COPY package-lock.json ./
RUN npm install

# Copy project
# Note this is done as late as possible for better caching from previous layers
COPY tsconfig.json ./
COPY src ./src
COPY --from=build-grpc project/grpc-api-client ./grpc-api-client

# Build
RUN npm run build

# Move artifacts to empty image
FROM scratch
COPY --from=build-project project/dist ./static
# Copy envoy config file needed for running the proxy
COPY ./envoy.yaml ./nginx.conf ./
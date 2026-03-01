FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json ./
COPY bun.lockb* ./

RUN bun install --frozen-lockfile

COPY src/ ./src/

ARG VERSION=dev
LABEL com.nanofleet.version=${VERSION}

CMD ["bun", "run", "src/index.ts"]

// lib/node-config.ts
// Resolves the Kando super-node base URLs for the frontend clients.
// Defaults to the production super node; override with NEXT_PUBLIC_NODE_HOST
// (e.g. "localhost:8080") for local development. localhost/127.0.0.1 hosts
// automatically fall back to the insecure ws/http scheme.

const HOST = process.env.NEXT_PUBLIC_NODE_HOST || 'node.kandonet.com';

const INSECURE =
  process.env.NEXT_PUBLIC_NODE_INSECURE === 'true' ||
  HOST.startsWith('localhost') ||
  HOST.startsWith('127.0.0.1');

export const NODE_HTTP = `${INSECURE ? 'http' : 'https'}://${HOST}`;
export const NODE_WS = `${INSECURE ? 'ws' : 'wss'}://${HOST}`;

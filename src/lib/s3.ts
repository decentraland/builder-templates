import { BUILDER_SERVER_URL } from "./config";

export function getStorageUrl(hash: string) {
  return `${BUILDER_SERVER_URL}/v1/storage/contents/${hash}`;
}

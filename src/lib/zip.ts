import { readFile } from "fs";
import { resolve } from "path";
import JSZip from "jszip";
import future from "fp-future";

export async function load(path: string) {
  const promise = future<JSZip>();
  readFile(resolve(__dirname, path), async (err, data) => {
    if (err) throw err;
    const zip = await JSZip.loadAsync(data);
    promise.resolve(zip);
  });
  return promise;
}

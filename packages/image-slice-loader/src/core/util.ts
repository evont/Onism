import { createHash } from "crypto";


export function getSlices(size: number, arr: number[]): number[] {
  if (!arr.length) return [size];
  const heights = [];
  const isMulti = arr.length > 1;
  while (size > 0) {
    const slice = isMulti ? arr.shift() || 0 : arr[0];
    if (size > slice && slice > 0) {
      heights.push(slice);
      size -= slice;
    } else {
      heights.push(size);
      size = 0;
    }
  }
  return heights;
}


export function getOutput(output: ((name: string, index: number, hash: string) => string) | string, name: string, ind: number, hash: string) {
  let result: string;
  hash = hash.substr(0, 7);
  if (typeof output === "string") {
    result = (output as string).replace(/\[name\]/g, name).replace(/\[index\]/g, `${ind}`).replace(/\[hash\]/g, hash);
  } else {
    result = output(name, ind, hash)
  }
  return result;
}

export function getHash(content: Buffer | string) {
  const hash = createHash("md5");
  if (typeof content === "string") {
    hash.update(content, "utf-8");
  } else {
    hash.update(content);
  }
  return hash.digest("hex");
}
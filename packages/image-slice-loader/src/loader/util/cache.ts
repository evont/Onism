import findCacheDir from "find-cache-dir";
import { tmpdir } from "os";
import * as path from "path";
import * as fs from "fs-extra";
import { LOADER_NAME, CACHE_NAME } from "./constant";

const CACHE_CONFIG = {
  cacheDirectory: findCacheDir({ name: LOADER_NAME }) || tmpdir(),
  get cachePath() {
    return path.join(this.cacheDirectory, CACHE_NAME);
  },
};
function removeOutput(bgs) {
  bgs?.forEach((bg) => {
    try {
      fs.removeSync(typeof bg === 'string' ? bg : bg.resultPath);
    } catch (err) {
      void err;
    }
  });
}

export function compareCache(newCache, oldCache) {
  if (!oldCache) return;
  for (const k in oldCache) {
    if (k in newCache) {
      const oldOpt = oldCache[k].options;
      const newOpt = newCache[k].options;
      const usedBgs: string[] = [];
      const removeBgs: string[] = [];
      for (const j in newOpt) {
        usedBgs.push(...newOpt[j].bgsResource.map((item) => item.resultPath));
      }
      for (const j in oldOpt) {
        if (j in newOpt) {
          void 0;
        } else {
          removeBgs.push(...oldOpt[j].bgsResource.map((item) => item.resultPath));
          delete oldOpt[j];
        }
      }
      const uSet = new Set(usedBgs);
      const rSet = new Set(removeBgs);
      const diff = new Set([...Array.from(rSet)].filter((x) => !uSet.has(x)));
       removeOutput(Array.from(diff));
    } else {
      for (const j in oldCache[k].options) {
        removeOutput(oldCache[k].options[j].bgsResource);
      }
      delete oldCache[k];
    }
  }
}

let tmpCache;
function getCache() {
  tmpCache = fs.readJsonSync(CACHE_CONFIG.cachePath, { throws: false });
  return tmpCache;
}
export function getImageCache(imgHash, optionHash) {
  const cache = getCache();
  let result;
  if (cache && imgHash in cache) {
    const { options } = cache[imgHash];
    if (optionHash in options) {
      result = cache[imgHash];
    }
  }
  return result;
}
export function setCache(data) {
  fs.outputJsonSync(CACHE_CONFIG.cachePath, data);
}

export function invalidCache(newCache) {
  const oldCache = getCache();
  compareCache(newCache, oldCache);
}

export function setCachePath(path) {
  if (!path) return;
  CACHE_CONFIG.cacheDirectory = path;
}

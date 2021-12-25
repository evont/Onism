import { createHash } from "crypto";
import { getHashDigest } from "loader-utils";
import * as path from "path";

function resolve(from, to) {
  const resolvedUrl = new URL(to, new URL(from, "resolve://"));
  if (resolvedUrl.protocol === "resolve:") {
    // `from` is a relative URL.
    const { pathname, search, hash } = resolvedUrl;
    return pathname + search + hash;
  }
  return resolvedUrl.toString();
}

const utils = {
  genMD5(stream) {
    const md5 = createHash("md5");
    md5.update(stream);
    return md5.digest("hex");
  },
  urlResolve(base, urlPath) {
    if (path.sep === "\\") urlPath = urlPath.replace(/\\/g, "/");
    if (base && base[base.length - 1] !== "/") base = base + "/";
    return resolve(base, urlPath);
  },
  createFileName(placeholder, data) {
    if (data.content) {
      placeholder = placeholder.replace(
        /\[(?:(\w+):)?hash(?::([a-z]+\d*))?(?::(\d+))?\]/gi,
        (all, hashType, digestType, maxLength) =>
          getHashDigest(data.content, hashType, digestType, parseInt(maxLength))
      );
      delete data.content;
    }
    return placeholder.replace(/\[([^[]*)\]/g, ($1, $2) => data[$2] || $1);
  },
  /**
   * Prepend an entry or entries to webpack option
   */
  prependToEntry(filePaths, entry, includes) {
    if (typeof filePaths === "string") filePaths = [filePaths];

    if (typeof entry === "string") return [].concat(filePaths, [entry]);
    else if (Array.isArray(entry)) return [].concat(filePaths, entry);
    else if (typeof entry === "object") {
      Object.keys(entry).forEach((key) => {
        // if key is not included in plugin options.entries
        if (includes && includes instanceof Array && !includes.includes(key))
          return;
        entry[key] = utils.prependToEntry(filePaths, entry[key], includes);
      });
      return entry;
    } else if (typeof entry === "function") {
      return function () {
        return Promise.resolve(entry()).then((entry) =>
          utils.prependToEntry(filePaths, entry, includes)
        );
      };
    } else throw new TypeError("Error entry type: " + typeof entry);
  },
  /**
   * Append an entry or entries to webpack option
   */
  appendToEntry(filePaths, entry, includes) {
    if (typeof filePaths === "string") filePaths = [filePaths];

    if (typeof entry === "string") return [].concat([entry], filePaths);
    else if (Array.isArray(entry)) return [].concat(entry, filePaths);
    else if (typeof entry === "object") {
      Object.keys(entry).forEach((key) => {
        // if key is not included in plugin options.entries
        if (includes && includes instanceof Array && !includes.includes(key))
          return;
        entry[key] = utils.appendToEntry(filePaths, entry[key], includes);
      });
      return entry;
    } else if (typeof entry === "function") {
      return function () {
        return Promise.resolve(entry()).then((entry) =>
          utils.appendToEntry(filePaths, entry, includes)
        );
      };
    } else throw new TypeError("Error entry type: " + typeof entry);
  },
  /**
   * Escape string
   * @param {string} string to escape
   */
  escape(string) {
    return string.replace(/[\\'"]/g, "\\$&");
  },
};

export default utils;

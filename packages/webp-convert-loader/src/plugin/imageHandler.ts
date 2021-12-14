import { ImagePool } from "@squoosh/lib";
import { createHash } from "crypto";
import url from "url";
import { getHashDigest } from "loader-utils";

import * as path from "path";

const utils = {
  genMD5(stream) {
    const md5 = createHash("md5");
    md5.update(stream);
    return md5.digest("hex");
  },
  urlResolve(base, urlPath) {
    if (path.sep === "\\") urlPath = urlPath.replace(/\\/g, "/");
    if (base && base[base.length - 1] !== "/") base = base + "/";
    return url.resolve(base, urlPath);
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

function getOutputFileName(options) {
  return utils.createFileName(this.options.filename, options);
}

function getOutputPath(fileName) {
  return path.join(this.options.output, fileName);
}

function getOutputURL(fileName, compilation) {
  const urlPath = this.options.output;
  let url = "/";
  if (this.options.publicPath)
    url = utils.urlResolve(this.options.publicPath, fileName);
  else
    url = utils.urlResolve(
      compilation.options.output.publicPath || "",
      path.join(urlPath, fileName)
    );
  if (path.sep === "\\") url = url.replace(/\\/g, "/");
  return url;
}

/**
 * Get output info by fileName options
 * @param {Object} options
 * @param {*} compilation
 */
function getOutput(options, compilation) {
  const fileName = getOutputFileName(options);
  const path = getOutputPath(fileName);
  const url = getOutputURL(fileName, compilation);
  return { fileName, path, url };
}

const targets = {
  ".png": "oxipng",
  ".jpg": "mozjpeg",
  ".jpeg": "mozjpeg",
  ".jxl": "jxl",
  ".webp": "webp",
  ".avif": "avif",
  // ...minifyOptions.targets,
};
async function imageHandler(imagePath, { encodeOption = {}, quant = {} } = {}) {
  const imagePool = new ImagePool();
  const image = imagePool.ingestImage(imagePath);
  const ext = path.extname(imagePath).toLowerCase();
  const targetCodec = targets[ext];
  const encodeOptions = Object.assign(
    {
      [targetCodec]: {},
      webp: {},
      // ...minifyOptions.encodeOptions,
    },
    encodeOption
  );
  // in case webp convert is disabled by mistake
  if (!encodeOptions.webp) encodeOptions.webp = {};
  const rawImage = await image.decoded;
  const preProcessQuant = Object.assign(
    {
      numColors: 255,
      dither: 1.0,
    },
    quant
  );
  await image.preprocess({
    quant: preProcessQuant,
  });
  await image.encode(encodeOptions);
  await imagePool.close();
  const rawImageMinify = await image.encodedWith[targetCodec];
  const rawImageInWebp = await image.encodedWith.webp;
  return {
    rawImage,
    rawImageMinify,
    rawImageInWebp
  }
}


export default imageHandler;
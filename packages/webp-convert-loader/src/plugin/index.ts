import { asyncHooks } from "./hooks";
import { PLUGIN_NAME, REG_HEAD } from "../constants";
import { ReplaceDependency } from "./ReplaceDependency";
import { ReplaceSource } from "webpack-sources";
import imageHandler from "./imageHandler";
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

let ConcatenatedModule;
try {
  ConcatenatedModule = require("webpack/lib/optimize/ConcatenatedModule");
} catch (e) {}

function getAllModules(compilation) {
  // Compilation.modules as changed from Array to Set in webpack 5
  let modules: any[] = Array.from(compilation.modules);

  if ([...compilation.children].length) {
    let childModulesList: Set<any> | Array<any> = [...compilation.children].map(
      getAllModules
    );
    modules = modules.concat(...childModulesList);

    //  if (!isWebpack4) modules = new Set(modules);
  }

  if (ConcatenatedModule) {
    const concatenatedModulesList = modules
      .filter((m) => m instanceof ConcatenatedModule)
      .map(
        (m) =>
          m.modules || m._orderedConcatenationList.map((entry) => entry.module)
      );
    if (concatenatedModulesList.length)
      modules = modules.concat(...concatenatedModulesList);
  }
  return modules;
}

class WebpConvertPlugin {
  constructor(options) {
    this.options = Object.assign(this.options, options || {});
  }
  options = {
    output: "./",
    filename: "[name].[ext]",
    publicPath: undefined,
  };
  data = [];
  // REPLACER_RE = /\/\*CONVER_HOLDER_(\w+)_(\w+)\*\//g;
  REPLACER_RE = new RegExp(`/\\*${REG_HEAD}_(\\w+)_(\\w+)\\*/`, 'g')
  plugin(obj, name, callback) {
    if (obj.hooks) {
      if (asyncHooks.includes(name))
        obj.hooks[name].tapAsync(PLUGIN_NAME, callback);
      else obj.hooks[name].tap(PLUGIN_NAME, callback);
    } else {
      name = name.replace(/([A-Z])/g, (m, $1) => "-" + $1.toLowerCase());
      obj.plugin(name, callback);
    }
  }

  apply(compiler) {
    const normalModule = compiler.webpack
      ? compiler.webpack.NormalModule
      : require("webpack/lib/NormalModule");

    this.plugin(compiler, "thisCompilation", (compilation, params) => {
      try {
        normalModule
          .getCompilationHooks(compilation)
          .loader.tap(
            PLUGIN_NAME,
            (loaderContext) => (loaderContext[PLUGIN_NAME] = this)
          );
      } catch (e) {
        this.plugin(
          compilation,
          "normalModuleLoader",
          (loaderContext, module) => {
            loaderContext[PLUGIN_NAME] = this;
          }
        );
      }

      this.plugin(compilation, "optimizeTree", (chunks, modules, callback) =>
        this.optimizeTree(compilation, chunks, modules, callback)
      );

      this.plugin(compilation, "afterOptimizeTree", (chunks, modules) => {
        this.replaceInModules(chunks, compilation);
      });

      try {
        compilation.hooks.processAssets.tap(
          {
            name: PLUGIN_NAME,
            stage: compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
          },
          (assets) => {
            for (let file in assets) {
              if (file.endsWith(".css")) {
                const asset = compilation.getAsset(file); // <- standardized version of asset object

                const replaceSource = new ReplaceSource(asset.source);
                const ranges = this.replaceHolderToRanges(
                  asset.source.source()
                );
                for (const range of ranges)
                  replaceSource.replace(range[0], range[1], range[2]);

                // standardized way of updating asset source
                compilation.updateAsset(file, replaceSource);
              }
            }
          }
        );
      } catch (e) {
        this.plugin(compilation, "optimizeChunkAssets", (chunks, callback) => {
          const asssets = [];
          chunks.forEach((chunk) => {
            chunk.files.forEach((file) => {
              if (!file.endsWith(".css")) return;
              // 处理css模块
              const source = compilation.assets[file];
              const replaceSource = new ReplaceSource(source);
              const ranges = this.replaceHolderToRanges(source.source());
              for (const range of ranges)
                replaceSource.replace(range[0], range[1], range[2]);
              compilation.assets[file] = replaceSource;
            });
          });
          callback();
        });
      }
    });
  }
  generateImage(image, name, compilation, ext = "png") {
    const buffer = Buffer.from(image.binary);
    const output = this.getOutput(
      {
        name,
        ext,
        content: buffer,
      },
      compilation
    );
    console.log(output);
    compilation.assets[output.path] = {
      source: () => buffer,
      size: () => buffer.length,
    };
    return { output };
  }
  async optimizeTree(compilation, chunks, modules, callback) {
    const fileMap = new Map();
    try {
      await new Promise<void>(async (resolve, reject) => {
        try {
          for (const [key, item] of Object.entries(this.data)) {
            const { bgs } = item as { bgs: Array<string[]> };
            // console.log(bgs);
            for (const filePaths of bgs) {
              const normalFiles = [];
              const webpFiles = [];
              for (const filePath of filePaths) {
                let handler;
                if (fileMap.has(filePath)) {
                  handler = fileMap.get(filePath);
                } else {
                  handler = await imageHandler(filePath);
                  fileMap.set(filePath, handler);
                }
                const { rawImage, rawImageMinify, rawImageInWebp } = handler;
                const name = path.basename(filePath, path.extname(filePath));
                let normalFile;
                let webpFile;
                if (rawImageMinify.size < rawImage.size) {
                  const { output } = this.generateImage(
                    rawImageMinify,
                    name,
                    compilation
                  );
                  normalFile = output.path;
                } else {
                  const { output } = this.generateImage(
                    rawImage,
                    name,
                    compilation
                  );
                  normalFile = output.path;
                }

                if (rawImageInWebp.size < rawImage.size) {
                  const { output } = this.generateImage(
                    rawImageInWebp,
                    name,
                    compilation,
                    "webp"
                  );
                  webpFile = output.path;
                } else {
                  webpFile = normalFile;
                }
                normalFiles.push(normalFile);
                webpFiles.push(webpFile);
              }
              this.data[key].normals.push(normalFiles);
              this.data[key].webps.push(webpFiles);
            }
          }
          resolve();
        } catch (e) {
          reject(e);
        }
      });
      callback();
    } catch (e) {
      callback(e);
    }

    // Promise.all(promises).then(() => callback()).catch(e => callback(e))
  }
  replaceInModules(chunks, compilation) {
    const allModules = getAllModules(compilation);
    allModules.forEach((module: any) => {
      const identifier = module.identifier();
      if (/^css[\s]+/g.test(identifier)) {
        console.log(identifier);
      } else {
        const source = module._source;
        let ranges = [];
        const replaceDependency = module.dependencies.filter(
          (dependency) => dependency.constructor === ReplaceDependency
        )[0];
        if (typeof source === "string")
          ranges = this.replaceHolderToRanges(source);
        else if (source instanceof Object && typeof source._value === "string")
          ranges = this.replaceHolderToRanges(source._value);
        if (ranges.length) {
          if (replaceDependency) replaceDependency.updateRanges(ranges);
          else module.addDependency(new ReplaceDependency(ranges));
        }
      }
    });
    // for (const [key, value] of Object.entries(this.data)) {
    //   console.log(key, value.webp.toString());
    // }
  }
  replaceHolderToRanges(source) {
    const ranges = [];
    console.log(this.REPLACER_RE)
    source.replace(this.REPLACER_RE, (...args) => {
      const m = args[0];
      const offset = +args[args.length - 2];
      //@ts-ignore
      const content = this.REPLACER_FUNC_ESCAPED(...args.slice(1, -2)) || m;
      ranges.push([offset, offset + m.length - 1, content]);
      return m;
    });
    return ranges;
  }
  ruleSet = new Set();
  REPLACER_FUNC_ESCAPED(type, id) {
    const { webpRule, noWebpRule, normals, webps } = this.data[id];
    let images = normals;
    let rule = noWebpRule;
    if (type === "WEBP") {
      images = webps;
      rule = webpRule;
    }

    if (!this.ruleSet.has(images)) {
      images.forEach((image) => {
        const value = image.map((item) => `url(${item})`).join(", ");
        rule.append({
          prop: "background-image",
          value: value,
        });
      });
    }
    this.ruleSet.add(images);

    console.log(rule.toString());
    return rule.toString();
  }

  getOutputFileName(options) {
    return utils.createFileName(this.options.filename, options);
  }

  getOutputPath(fileName) {
    return path.join(this.options.output, fileName);
  }

  getOutputURL(fileName, compilation) {
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
  getOutput(options, compilation) {
    const fileName = this.getOutputFileName(options);
    const path = this.getOutputPath(fileName);
    const url = this.getOutputURL(fileName, compilation);
    return { fileName, path, url };
  }
}

export default WebpConvertPlugin;

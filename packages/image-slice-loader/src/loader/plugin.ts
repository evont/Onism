import { PluginCreator, Rule } from "postcss";
import valueParser, { FunctionNode } from "postcss-value-parser";
import * as path from "path";
import * as fs from "fs-extra";
import { getHash } from "../core/util";
import { parseProperty, startsWith, transformAlias } from "./util";
import { PluginOptions, BgType } from "../type";
import { getImageCache } from "./util/cache";
import { outputSharp } from "../core/index";

export default ({ loaderContext, options }: PluginOptions) => {
  const cache = {};
  let { property, output, outputPath, template } = options;

  const result = new Map();
  const PostcssPlugin: PluginCreator<{}> = function () {
    const compilerOptions = loaderContext._compiler.options;
    const _alias = compilerOptions.resolve.alias;
    const _context = compilerOptions.context || loaderContext.rootContext;

    const alias = transformAlias(_alias);

    let realOutput = outputPath;
    // if output path is match alias, transform into alias path
    for (const item of alias) {
      if (
        outputPath === item.name ||
        (!item.onlyModule && startsWith(outputPath, item.name + "/"))
      ) {
        if (
          outputPath !== item.alias &&
          !startsWith(outputPath, `${item.alias}/`)
        ) {
          realOutput = item.alias + outputPath.substr(item.name.length);
        }
      }
    }
    // if not alias or not absolute path, transform into path relate to webpack context
    if (!path.isAbsolute(realOutput)) {
      realOutput = path.resolve(_context, realOutput);
      outputPath = path.resolve(_context, outputPath);
    }

    fs.ensureDirSync(realOutput);

    return {
      postcssPlugin: "image-slice-parser",
      async Declaration(decl) {
        if (decl.prop === "background" || decl.prop === "background-image") {
          const { nodes } = valueParser(decl.value);
          let url;
          let query: Partial<{
            direction: "row" | "column",
            seprate: boolean,
            slice: number[];
            size: number;
          }> = {};
          // console.log(decl)
          for (const node of nodes) {
            if (node.value === "url") {
              const [urlNode] = (node as FunctionNode).nodes;
              const [_url, _query] = urlNode.value.split("?");
              const queryObj = {};
              if (_query) {
                _query.split("&").forEach((kv) => {
                  let [key, value = true] = kv.split("=");
                  let resValue: any = value;
                  if (key === 'seprate') {
                    resValue = !!+value
                  }
                  if (key === 'slice' && typeof value === "string") {
                    resValue = value.split(",").map(item => isNaN(+item) ? 0 : +item);
                  }
                  if (key === 'size') {
                    resValue = +value;
                  }
                  queryObj[key] = resValue;
                });
              }
              url = _url;
              query = queryObj;
              console.log(_query);
              break;
            }
          }
          const { direction = "column", seprate = false, slice = [300], size = 375 } = query;
          if (!url) return;

          let filePath;
          try {
            filePath = await new Promise<string>((resolve, reject) =>
              loaderContext.resolve(loaderContext.context, url, (err, result) =>
                err ? reject(err) : resolve(result)
              )
            );
          } catch (err) {
            throw new Error(
              `${url} can't be loaded, Please use a correct file path`
            );
          }
          if (!filePath) return;
          const fileHash = getHash(fs.readFileSync(filePath));
          const optionHash = getHash([direction, slice.join(",")].join("-"));
          const oldCache = getImageCache(fileHash, optionHash);
          let cacheOption = {};
          const currentOption = {};

          let bgs: BgType[] = [];
          let bgsResource = [];
          let _imgWidth = 0;
          let _imgHeight = 0;
          let _isRow = false;
          let scale = 1;
          let cacheDimension;
          if (oldCache) {
            const {
              options: _options,
              imgWidth: _imgWidth,
              imgHeight: _imgHeight,
            } = oldCache;
            cache[fileHash] = Object.assign(cache[fileHash] || {}, {
              options: Object.assign(cache[fileHash]?.options || {}, {
                [optionHash]: _options[optionHash],
              }),
              imgWidth: _imgWidth,
              imgHeight: _imgHeight,
            });
            cacheOption = cache[fileHash].options;
            const { bgsResource: _bgsResource, dimension: _dimension } =
              _options[optionHash];
            bgsResource = _bgsResource;
            if (_dimension) cacheDimension = _dimension;
            Object.assign(currentOption, cacheOption[optionHash]);
          } else {
            cacheOption[optionHash] = currentOption;
          }

          // only if all images is extracted should we continue to process css file
          // error will fallback to use original image
          try {
            const outputs = outputSharp(
              {
                image: filePath,
                options: {
                  direction,
                  slice,
                },
              },
              {
                output,
                outputPath: realOutput,
                urlPath: outputPath,
                cacheMatch: (item) => {
                  const matchItem =
                    bgsResource &&
                    bgsResource.find((bg) => bg.hash === item.hash);
                  if (matchItem) {
                    const hasFile = fs.pathExistsSync(matchItem.resultPath);
                    return hasFile && matchItem;
                  }
                  return null;
                },
              },
              cacheDimension
            );
            const { dimension, isRow, results, sliceArr } = outputs;
            const { height: imgHeight, width: imgWidth } = dimension;
            _imgWidth = imgWidth;
            _imgHeight = imgHeight;
            _isRow = isRow;
            scale = size ? size / (isRow ? imgHeight : imgWidth) : 1;
            for (let result of results) {
              const { info, index, hash, resultPath, url } = await result;
              if (bgsResource.findIndex((br) => br.hash === hash) === -1) {
                bgsResource.push({
                  info,
                  url,
                  hash,
                  index,
                  resultPath,
                });
              }

              let { left, top, width, height } = info;

              height *= scale;
              width *= scale;
              left *= scale;
              top *= scale;

              bgs.push({
                top,
                left,
                height,
                width,
                index,
                url,
                isRow,
              });
            }
            Object.assign(currentOption, {
              bgsResource,
              sliceArr,
              dimension,
            });
          } catch (e) {
            bgs = [
              {
                top: 0,
                left: 0,
                height: _imgHeight,
                width: _imgWidth,
                index: 0,
                url,
                isRow: _isRow,
              },
            ];
            console.error(e);
          }
          cache[fileHash] = Object.assign(cache[fileHash] || {}, {
            options: Object.assign(cache[fileHash]?.options || {}, cacheOption),
            imgWidth: _imgWidth,
            imgHeight: _imgHeight,
          });

          const localCss = template({
            bgs,
            isSeparate: seprate,
            selector: (decl.parent as Rule).selector,
            bgWidth: _imgWidth * scale,
            bgHeight: _imgHeight * scale,
            imgWidth: _imgWidth,
            imgHeight: _imgHeight,
          });
          // if (seprate) {
          //   decl.parent.after(localCss);
          // } else {
          //   decl.after(localCss);
          // }

          // decl.remove();
          result.set(seprate ? decl.parent : decl, localCss)
        }
        if (decl.prop === property) {
          const { url, direction, isSeparate, slice, bgSize } = parseProperty(
            decl.value
          );

          if (!url) return;

          let filePath;
          try {
            filePath = await new Promise<string>((resolve, reject) =>
              loaderContext.resolve(loaderContext.context, url, (err, result) =>
                err ? reject(err) : resolve(result)
              )
            );
          } catch (err) {
            throw new Error(
              `${url} can't be loaded, Please use a correct file path`
            );
          }
          if (!filePath) return;
          const fileHash = getHash(fs.readFileSync(filePath));
          const optionHash = getHash([direction, slice.join(",")].join("-"));
          const oldCache = getImageCache(fileHash, optionHash);
          let cacheOption = {};
          const currentOption = {};

          let bgs: BgType[] = [];
          let bgsResource = [];
          let _imgWidth = 0;
          let _imgHeight = 0;
          let _isRow = false;
          let scale = 1;
          let cacheDimension;
          if (oldCache) {
            const {
              options: _options,
              imgWidth: _imgWidth,
              imgHeight: _imgHeight,
            } = oldCache;
            cache[fileHash] = Object.assign(cache[fileHash] || {}, {
              options: Object.assign(cache[fileHash]?.options || {}, {
                [optionHash]: _options[optionHash],
              }),
              imgWidth: _imgWidth,
              imgHeight: _imgHeight,
            });
            cacheOption = cache[fileHash].options;
            const { bgsResource: _bgsResource, dimension: _dimension } =
              _options[optionHash];
            bgsResource = _bgsResource;
            if (_dimension) cacheDimension = _dimension;
            Object.assign(currentOption, cacheOption[optionHash]);
          } else {
            cacheOption[optionHash] = currentOption;
          }

          // only if all images is extracted should we continue to process css file
          // error will fallback to use original image
          try {
            const outputs = outputSharp(
              {
                image: filePath,
                options: {
                  direction,
                  slice,
                },
              },
              {
                output,
                outputPath: realOutput,
                urlPath: outputPath,
                cacheMatch: (item) => {
                  const matchItem =
                    bgsResource &&
                    bgsResource.find((bg) => bg.hash === item.hash);
                  if (matchItem) {
                    const hasFile = fs.pathExistsSync(matchItem.resultPath);
                    return hasFile && matchItem;
                  }
                  return null;
                },
              },
              cacheDimension
            );
            const { dimension, isRow, results, sliceArr } = outputs;
            const { height: imgHeight, width: imgWidth } = dimension;
            _imgWidth = imgWidth;
            _imgHeight = imgHeight;
            _isRow = isRow;
            scale = bgSize ? bgSize / (isRow ? imgHeight : imgWidth) : 1;
            for (let result of results) {
              const { info, index, hash, resultPath, url } = await result;
              if (bgsResource.findIndex((br) => br.hash === hash) === -1) {
                bgsResource.push({
                  info,
                  url,
                  hash,
                  index,
                  resultPath,
                });
              }

              let { left, top, width, height } = info;

              height *= scale;
              width *= scale;
              left *= scale;
              top *= scale;

              bgs.push({
                top,
                left,
                height,
                width,
                index,
                url,
                isRow,
              });
            }
            Object.assign(currentOption, {
              bgsResource,
              sliceArr,
              dimension,
            });
          } catch (e) {
            bgs = [
              {
                top: 0,
                left: 0,
                height: _imgHeight,
                width: _imgWidth,
                index: 0,
                url,
                isRow: _isRow,
              },
            ];
            console.error(e);
          }
          cache[fileHash] = Object.assign(cache[fileHash] || {}, {
            options: Object.assign(cache[fileHash]?.options || {}, cacheOption),
            imgWidth: _imgWidth,
            imgHeight: _imgHeight,
          });

          const localCss = template({
            bgs,
            isSeparate,
            selector: (decl.parent as Rule).selector,
            bgWidth: _imgWidth * scale,
            bgHeight: _imgHeight * scale,
            imgWidth: _imgWidth,
            imgHeight: _imgHeight,
          });
          if (isSeparate) {
            decl.parent.after(localCss);
          } else {
            decl.after(localCss);
          }

          decl.remove();
        }
      },
      async OnceExit(root) {
        for (const [decl, localCss] of result) {
          decl.after(localCss);
          decl.remove();
        }
      }
    };
  };
  PostcssPlugin.postcss = true;
  return {
    PostcssPlugin,
    cache,
  };
};

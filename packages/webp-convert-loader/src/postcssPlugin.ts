import { Declaration, PluginCreator, Rule } from "postcss";
import valueParser, { FunctionNode } from "postcss-value-parser";
import { getHashDigest } from "loader-utils";
// import { transformAlias, startsWith } from "./util";
// import * as path from "path";
// import * as fs from "fs-extra";
import sharp from "sharp";
// const targets = {
//   ".png": "oxipng",
//   ".jpg": "mozjpeg",
//   ".jpeg": "mozjpeg",
//   ".jxl": "jxl",
//   ".webp": "webp",
//   ".avif": "avif",
//   // ...minifyOptions.targets,
// };

async function convertToWebp(url, loaderContext) {
  try {
    const imagePath = await new Promise<string>((resolve, reject) =>
      loaderContext.resolve(loaderContext.context, url, (err, result) =>
        err ? reject(err) : resolve(result)
      )
    );
    const old = await sharp(imagePath);
    const {
      info: { size },
      data: oldData,
      hash,
    } = await new Promise((resolve, reject) => {
      old.toBuffer((err, data, info) => {
        if (err) reject(err);
        const hash = getHashDigest(data);
        resolve({
          data,
          info,
          hash,
        });
      });
    });

    const webp = await old.webp({
      lossless: true,
    });

    const {
      info: { size: webpSize },
      data: webpData,
      hash: webpHash,
    } = await new Promise((resolve, reject) => {
      webp.toBuffer((err, data, info) => {
        if (err) reject(err);
        const hash = getHashDigest(data);
        resolve({
          data,
          info,
          hash,
        });
      });
    });

    if (webpSize < size) {
      const imgName = `${imagePath}.webp`;
      await webp.toFile(imgName);
      return {
        hash,
        webpHash,
        imgName,
      };
    }
    return null;
  } catch (err) {
    console.error(err);
    console.error(`${url} is not found`);
  }
}
export default ({ loaderContext, options = {} }) => {
  const DEFAULT_OPTIONS = {
    modules: false,
    noWebpClass: "no-webp",
    webpClass: "webp",
    addNoJs: true,
    noJsClass: "no-js",
  };
  let { modules, noWebpClass, webpClass, addNoJs, noJsClass } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };
  function removeHtmlPrefix(className) {
    return className.replace(/html ?\./, "");
  }
  function addClass(selector, className) {
    let generatedNoJsClass;
    let initialClassName = className;
    if (className.includes("html")) {
      className = removeHtmlPrefix(className);
    }
    if (modules) {
      className = `:global(.${className})`;
      generatedNoJsClass = `:global(.${noJsClass})`;
    } else {
      className = `.${className}`;
      generatedNoJsClass = `.${noJsClass}`;
    }
    if (selector.includes("html")) {
      selector = selector.replace(/html[^ ]*/, `$& body${className}`);
    } else {
      selector = `body${className} ` + selector;
    }
    if (addNoJs && initialClassName === noWebpClass) {
      selector +=
        ", " +
        selector.split(`body${className}`).join(`body${generatedNoJsClass}`);
    }
    return selector;
  }
  // const cacheMap = new Map();
  const PostcssPlugin: PluginCreator<{}> = function () {
    return {
      postcssPlugin: "webp-connvert-parser",
      async Declaration(decl) {
        if (/\.(jpe?g|png)(?!(\.webp|.*[&?]format=webp))/i.test(decl.value)) {
          let rule = decl.parent as Rule;
          if (
            rule.selector.includes(`.${removeHtmlPrefix(noWebpClass)}`) ||
            rule.selector.includes(`.${removeHtmlPrefix(noJsClass)}`) ||
            rule.selector.includes(`.${removeHtmlPrefix(webpClass)}`)
          ) {
            return;
          }

          let noWebp = rule.cloneAfter();
          noWebp.each((i: Declaration) => {
            if (i.prop !== decl.prop && i.value !== decl.value) i.remove();
          });
          noWebp.selectors = noWebp.selectors.map((i) =>
            addClass(i, noWebpClass)
          );

          let webp = rule.cloneAfter();
          webp.each((i: Declaration) => {
            if (i.prop !== decl.prop && i.value !== decl.value) i.remove();
          });
          webp.selectors = webp.selectors.map((i) => addClass(i, webpClass));
          for (const node of webp.nodes) {
            const i = node as Declaration;
            const { nodes } = valueParser(decl.value);
            for (const node of nodes) {
              if (node.value === "url") {
                const [urlNode] = (node as FunctionNode).nodes;
                const url = urlNode.value;
                const converResult = await convertToWebp(url, loaderContext);
                if (converResult) {
                  const { imgName } = converResult;
                  i.value = i.value.replace(url, imgName);
                }
              }
            }
          }
          decl.remove();
          if (rule.nodes.length === 0) rule.remove();
        }
      },
    };
  };
  PostcssPlugin.postcss = true;
  return {
    PostcssPlugin,
  };
};

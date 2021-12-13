import { Declaration, PluginCreator, Rule } from "postcss";
import valueParser, { FunctionNode } from "postcss-value-parser";
import { getHashDigest } from "loader-utils";
import { ImagePool } from "@squoosh/lib";
import * as path from "path";
import * as fs from "fs-extra";

import { PLUGIN_NAME } from "./constants";

const targets = {
  ".png": "oxipng",
  ".jpg": "mozjpeg",
  ".jpeg": "mozjpeg",
  ".jxl": "jxl",
  ".webp": "webp",
  ".avif": "avif",
  // ...minifyOptions.targets,
};

function genID() {
  return Math.random().toString(16).substr(2);
}

function removeHtmlPrefix(className) {
  return className.replace(/html ?\./, "");
}

export default ({ loaderContext, options = {} }) => {
  // const _compilation = loaderContext._compilation;

  const plugin = loaderContext[PLUGIN_NAME];
  const { data } = plugin;

  const DEFAULT_OPTIONS = {
    modules: false,
    noWebpClass: "no-webp",
    webpClass: "webp",
    addNoJs: false,
    noJsClass: "no-js",
    minifyFormate: "minify/[name][ext]",
    webpFormate: "webp/[name][ext].webp",
    encodeOption: {},
    quant: {},
  };
  let {
    modules,
    noWebpClass,
    webpClass,
    addNoJs,
    noJsClass,
    minifyFormate,
    webpFormate,
    encodeOption,
    quant,
  } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

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
  const PostcssPlugin: PluginCreator<{}> = function () {
    return {
      postcssPlugin: "webp-connvert-parser",
      async Declaration(decl) {
        if (/\.(jpe?g|png)(?!(\.webp|.*[&?]format=webp))/i.test(decl.value)) {
          const rule = decl.parent as Rule;

          const parsed = valueParser(decl.value);
          const { nodes } = parsed;
          const images = [];
          for (const node of nodes) {
            if (node.value === "url") {
              const [{ value: url }] = (node as FunctionNode).nodes;
              // const url = urlNode.value;
              images.push(url);
            }
          }

          await Promise.all(
            images.map(
              (image) =>
                new Promise((resolve, reject) => {
                  loaderContext.resolve(
                    loaderContext.context,
                    image,
                    (err, result) => (err ? reject(err) : resolve(result))
                  );
                })
            )
          ).then((filePaths) => {
            const id = genID();
            filePaths.forEach((filePath) => {
              loaderContext.addDependency(filePath);
            })
            data[id] = {
              filePaths,
              normals: [],
              webps: [],
            };
            let webpRule;
            let noWebpRule;
            webpRule = rule.clone();
            webpRule.removeAll();
            webpRule.selectors = webpRule.selectors.map((i) =>
              addClass(i, webpClass)
            );

            data[id].webpRule = webpRule;

            rule.after(`/*WEBP_HOLDER_${id}*/`);

            noWebpRule = rule.clone();
            noWebpRule.removeAll();
            noWebpRule.selectors = noWebpRule.selectors.map((i) =>
              addClass(i, noWebpClass)
            );

            rule.after(`/*NO_WEBP_HOLDER_${id}*/`);

            data[id].noWebpRule = noWebpRule;

          });
        }
      },
    };
  };
  PostcssPlugin.postcss = true;

  return {
    PostcssPlugin,
  };
};

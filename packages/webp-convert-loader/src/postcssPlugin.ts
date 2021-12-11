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

  const PostcssPlugin: PluginCreator<{}> = function () {
    return {
      postcssPlugin: "webp-connvert-parser",
      async Declaration(decl) {
        if (/\.(jpe?g|png)(?!(\.webp|.*[&?]format=webp))/i.test(decl.value)) {
          let rule = decl.parent as Rule;
          const parsed = valueParser(decl.value);
          const { nodes } = parsed;
          for (const node of nodes) {
            if (node.value === "url") {
              const [urlNode] = (node as FunctionNode).nodes;
              const url = urlNode.value;
              try {
                const imagePath = await new Promise<string>((resolve, reject) =>
                  loaderContext.resolve(
                    loaderContext.context,
                    url,
                    (err, result) => (err ? reject(err) : resolve(result))
                  )
                );
                
                const webpRule = rule.clone();
                webpRule.each((i: Declaration) => {
                  if (i.prop !== decl.prop && i.value !== decl.value) i.remove()
                })

                
                const id = genID();
                const webpHolder = `WEBP_HOLDER_${id}`;
                data[id] = {
                  url,
                  imagePath,
                  webp: {
                    rule: webpRule,
                    replace: webpHolder
                  }
                }

                rule.append(`/** ${webpHolder} **/`)
              } catch (err) {
                void err;
              }
            }
          }
        }
      },
    };
  };
  PostcssPlugin.postcss = true;

  return {
    PostcssPlugin,
  };
};

import { Declaration, PluginCreator, Rule } from "postcss";
import valueParser, { FunctionNode } from "postcss-value-parser";
import { getHashDigest } from "loader-utils";
import { ImagePool } from "@squoosh/lib";
import * as path from "path";
import * as fs from "fs-extra";
const targets = {
  ".png": "oxipng",
  ".jpg": "mozjpeg",
  ".jpeg": "mozjpeg",
  ".jxl": "jxl",
  ".webp": "webp",
  ".avif": "avif",
  // ...minifyOptions.targets,
};

function genImage({ formate, binary, url, imagePath, _compilation }) {
  const hash = getHashDigest(binary);

  const { path: urlPath } = _compilation.getPathWithInfo(formate, {
    filename: url,
  });
  const { path: filePath } = _compilation.getPathWithInfo(formate, {
    filename: imagePath,
  });
  fs.outputFileSync(filePath, binary);
  return {
    hash,
    urlPath,
    filePath,
  };
}
export default ({ loaderContext, options = {} }) => {
  const _compilation = loaderContext._compilation;
  async function convertToWebp(url) {
    try {
      const imagePath = await new Promise<string>((resolve, reject) =>
        loaderContext.resolve(loaderContext.context, url, (err, result) =>
          err ? reject(err) : resolve(result)
        )
      );

      const imagePool = new ImagePool();
      const image = imagePool.ingestImage(imagePath);
      const ext = path.extname(imagePath).toLowerCase();
      const targetCodec = targets[ext];
      const encodeOptions = {
        [targetCodec]: {},
        webp: {},
        // ...minifyOptions.encodeOptions,
      };
      const { size } = await image.decoded;
      await image.preprocess({
        quant: {
          numColors: 256,
          dither: 0.5,
        },
      });
      await image.encode(encodeOptions);
      await imagePool.close();
      const rawImage = await image.encodedWith[targetCodec];
      const rawImageInWebp = await image.encodedWith.webp;

      const result: {
        hash?: string;
        urlPath?: string;
        filePath?: string;
        webpHash?: string;
        webpUrlPath?: string;
        webpFilePath?: string;
      } = {};
      if (rawImage.size < size) {
        Object.assign(
          result,
          genImage({
            binary: rawImage.binary,
            formate: "[path]minify/[name][ext]",
            url,
            imagePath,
            _compilation,
          })
        );
      }

      if (rawImageInWebp.size < rawImage.size) {
        const {
          hash: webpHash,
          urlPath: webpUrlPath,
          filePath: webpFilePath,
        } = genImage({
          binary: rawImageInWebp.binary,
          formate: "[path]webp/[name][ext].webp",
          url,
          imagePath,
          _compilation,
        });
        Object.assign(result, {
          webpHash,
          webpUrlPath,
          webpFilePath,
        });
      }
      return result;
    } catch (err) {
      console.error(err);
    }
  }

  const DEFAULT_OPTIONS = {
    modules: false,
    noWebpClass: "no-webp",
    webpClass: "webp",
    addNoJs: true,
    noJsClass: "no-js",
    filename: "",
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

          const minifyMap = new Map();
          const webpMap = new Map();
          for (const node of rule.nodes) {
            const i = node as Declaration;
            const { nodes } = valueParser(i.value);

            for (const node of nodes) {
              if (node.value === "url") {
                const [urlNode] = (node as FunctionNode).nodes;
                const url = urlNode.value;
                const { urlPath, webpUrlPath } = await convertToWebp(url);
                if (urlPath) {
                  const oldValue = minifyMap.get(i.prop) || i.value;
                  minifyMap.set(i.prop, oldValue.replace(url, urlPath));
                }
                if (webpUrlPath) {
                  const oldValue = webpMap.get(i.prop) || i.value;
                  webpMap.set(i.prop, oldValue.replace(url, webpUrlPath));
                }
              }
            }
          }
          let deleteDecl = false;
          let noWebp = rule.cloneAfter();
          noWebp.each((i: Declaration) => {
            if (i.prop !== decl.prop && i.value !== decl.value) {
              i.remove();
            } else {
              if (minifyMap.has(i.prop)) {
                deleteDecl = true;
                i.value = minifyMap.get(i.prop);
              }
            }
          });
          noWebp.selectors = noWebp.selectors.map((i) =>
            addClass(i, noWebpClass)
          );

          let webp = rule.cloneAfter();
          webp.each((i: Declaration) => {
            if (i.prop !== decl.prop && i.value !== decl.value) {
              i.remove();
            } else {
              if (webpMap.has(i.prop)) {
                deleteDecl = true;
                i.value = webpMap.get(i.prop);
              }
            }
          });
          webp.selectors = webp.selectors.map((i) => addClass(i, webpClass));

          if (deleteDecl) decl.remove();
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

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

export default ({ loaderContext, options = {} }) => {
  const _compilation = loaderContext._compilation;

  const DEFAULT_OPTIONS = {
    modules: false,
    noWebpClass: "no-webp",
    webpClass: "webp",
    addNoJs: false,
    noJsClass: "no-js",
    minifyFormate: "minify/[name][ext]",
    webpFormate: "webp/[name][ext].webp",
    encodeOption: {},
    quant: {}
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
    quant
  } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  function generateImage({ formate, binary, url, imagePath }) {
    const hash = getHashDigest(binary);
    let { path: urlPath } = _compilation.getPathWithInfo(formate, {
      filename: url,
      hash,
    });
    let { path: filePath } = _compilation.getPathWithInfo(formate, {
      filename: imagePath,
      hash
    });
    if (!path.isAbsolute(filePath)) {
      filePath = path.resolve(path.dirname(imagePath), filePath);
    }
    if (!path.isAbsolute(urlPath)) {
      urlPath = path.join(path.dirname(url), urlPath);
    }
    fs.outputFileSync(filePath, binary);
    return {
      hash,
      urlPath,
      filePath,
    };
  }

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
      const encodeOptions = Object.assign({
        [targetCodec]: {},
        webp: {},
        // ...minifyOptions.encodeOptions,
      }, encodeOption);
      // in case webp convert is disabled by mistake
      if (!encodeOptions.webp) encodeOptions.webp = {}
      const { size } = await image.decoded;
      const preProcessQuant = Object.assign({
        numColors: 255,
        dither: 1.0
      }, quant);
      await image.preprocess({
        quant: preProcessQuant
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
          generateImage({
            binary: rawImage.binary,
            formate: minifyFormate,
            url,
            imagePath,
          })
        );
      }

      if (rawImageInWebp.size < rawImage.size) {
        const {
          hash: webpHash,
          urlPath: webpUrlPath,
          filePath: webpFilePath,
        } = generateImage({
          binary: rawImageInWebp.binary,
          formate: webpFormate,
          url,
          imagePath,
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
          let hasWebp = false;
          let webp = rule.clone();
          webp.each((i: Declaration) => {
            if (i.prop !== decl.prop && i.value !== decl.value) {
              i.remove();
            } else {
              if (webpMap.has(i.prop)) {
                hasWebp = true;
                i.value = webpMap.get(i.prop);
              }
            }
          });
          if (hasWebp) {
            webp.selectors = webp.selectors.map((i) => addClass(i, webpClass));
            rule.after(webp);

            let noWebp = rule.clone();
            noWebp.each((i: Declaration) => {
              if (i.prop !== decl.prop && i.value !== decl.value) {
                i.remove();
              } else {
                if (minifyMap.has(i.prop)) {
                  i.value = minifyMap.get(i.prop);
                }
              }
            });
            noWebp.selectors = noWebp.selectors.map((i) =>
              addClass(i, noWebpClass)
            );
            rule.after(noWebp);

            decl.remove();
          }

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

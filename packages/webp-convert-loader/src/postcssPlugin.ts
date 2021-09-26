import { Declaration, Node, PluginCreator, Rule } from "postcss";
import valueParser, { FunctionNode } from "postcss-value-parser";
import { transformAlias, startsWith } from "./util";
import * as path from "path";
import * as fs from "fs-extra";
import { ImagePool } from "@squoosh/lib";
import sharp from "sharp";
const targets = {
  ".png": "oxipng",
  ".jpg": "mozjpeg",
  ".jpeg": "mozjpeg",
  ".jxl": "jxl",
  ".webp": "webp",
  ".avif": "avif",
  // ...minifyOptions.targets,
};

// async function minify({
//   loaderContext,
//   url
// }) {
  
//   const _compilation = loaderContext._compilation;
//   try {
//     const imagePath = await new Promise<string>((resolve, reject) =>
//       loaderContext.resolve(loaderContext.context, url, (err, result) =>
//         err ? reject(err) : resolve(result)
//       )
//     );
//     const ext = path.extname(imagePath).toLowerCase();
//     const targetCodec = targets[ext];
//     if (!targetCodec) {
//       throw new Error(
//         `The "${imagePath}" was not minified, ${ext} extension is not supported".`
//       );
//     }
//     const encodeOptions = {
//       [targetCodec]: {},
//       webp: {},
//       // ...minifyOptions.encodeOptions,
//     };
//     const len = cpus().length;
//     const imagePool = new ImagePool(len);
//     const image = imagePool.ingestImage(imagePath);
//     await image.decoded;
//     await image.preprocess({
//       quant: {
//         numColors: 256,
//         dither: 0.5,
//       },
//     });
//     await image.encode(encodeOptions);
//     await imagePool.close();
//     //TODO: compare image size
//     const rawImage = await image.encodedWith[targetCodec];
//     const rawImageInWebp = await image.encodedWith.webp;
//     // fs.outputFile(imagePath, rawImage.binary);
//     // console.log(rawImageInWebp.size, rawImage.size)
//     // if (rawImageInWebp.size < rawImage.size) {
//     //   fs.outputFileSync(imagePath + ".webp", rawImageInWebp.binary);
//     //   result[selector].url.push(url);
//     // } else {
//     //   console.log(imagePath);
//     // }
    
//     const { path: newName } = _compilation.getPathWithInfo(
//       "[path][name][ext].webp",
//       {
//         filename: imagePath,
//       }
//     );
//     const minifyPath = path.resolve(
//       path.dirname(imagePath),
//       "minify",
//       path.basename(imagePath)
//     );
//     loaderContext.emitFile(
//       path.basename(imagePath),
//       Buffer.from(rawImage.binary),
//       ""
//     );
//     if (rawImageInWebp.size < rawImage.size) {
//       loaderContext.emitFile(
//         path.basename(imagePath) + ".webp",
//         Buffer.from(rawImageInWebp.binary),
//         ""
//       );
//     }

//   } catch (err) {
//     console.error(err);
//     console.error(`${url} is not found`);
//   }
// }
export default ({ loaderContext, options }) => {
  let { outputPath, className } = options;
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
  if (!path.isAbsolute(realOutput)) {
    realOutput = path.resolve(_context, realOutput);
    outputPath = path.resolve(_context, outputPath);
  }
  const result: Record<
    string,
    {
      url: string[];
      decl: Declaration;
      webpDecl: Declaration;
    }
  > = {};
  const DEFAULT_OPTIONS = {
    modules: false,
    noWebpClass: 'no-webp',
    webpClass: 'webp',
    addNoJs: true,
    noJsClass: 'no-js',
    rename: oldName => {
      return oldName.replace(/\.(jpe?g|png)/gi, '.$1.webp')
    }
  }
  let { modules, noWebpClass, webpClass, addNoJs, noJsClass, rename } = {
    ...DEFAULT_OPTIONS,
  }
  function removeHtmlPrefix(className) {
    console.log(className);
    return className.replace(/html ?\./, '')
  }
  function addClass(selector, className) {
    let generatedNoJsClass
    let initialClassName = className
    if (className.includes('html')) {
      className = removeHtmlPrefix(className)
    }
    if (modules) {
      className = `:global(.${className})`
      generatedNoJsClass = `:global(.${noJsClass})`
    } else {
      className = `.${className}`
      generatedNoJsClass = `.${noJsClass}`
    }
    if (selector.includes('html')) {
      selector = selector.replace(/html[^ ]*/, `$& body${className}`)
    } else {
      selector = `body${className} ` + selector
    }
    if (addNoJs && initialClassName === noWebpClass) {
      selector +=
        ', ' +
        selector.split(`body${className}`).join(`body${generatedNoJsClass}`)
    }
    return selector
  }
  fs.ensureDirSync(realOutput);
  const PostcssPlugin: PluginCreator<{}> = function () {
    return {
      postcssPlugin: "webp-connvert-parser",
      async Declaration(decl) {
        if (/\.(jpe?g|png)(?!(\.webp|.*[&?]format=webp))/i.test(decl.value)) {
          let rule = decl.parent as Rule;
          if (rule.selector.includes(`.${removeHtmlPrefix(noWebpClass)}`) || rule.selector.includes(`.${removeHtmlPrefix(noJsClass)}`)) return
          // let webp = rule.clone();
          // webp.each((i: Declaration) => {
          //   if (i.prop !== decl.prop && i.value !== decl.value) i.remove()
          // })
          // webp.selectors = webp.selectors.map(i => addClass(i, webpClass))
          // webp.each((i: Declaration) => {
          //   if (
          //     rename &&
          //     Object.prototype.toString.call(rename) === '[object Function]'
          //   ) {
          //     i.value = rename(i.value)
          //   }
          //   const { nodes } = valueParser(i.value);
          //   console.log(i.prop, nodes)
          // })
          let noWebp = rule.cloneAfter()
          noWebp.each((i: Declaration) => {
            if (i.prop !== decl.prop && i.value !== decl.value) i.remove()
          })
          noWebp.selectors = noWebp.selectors.map(i => addClass(i, noWebpClass))
          decl.remove()
          if (rule.nodes.length === 0) rule.remove()
        }
        // if (decl.prop === "background" || decl.prop === "background-image") {
        //   const { selector } = decl.parent as Rule;
        //   result[selector] = Object.assign(result[selector] || {}, {
        //     url: result[selector]?.url || [],
        //     decl,
        //     webpDecl: undefined,
        //   });
        //   const { nodes } = valueParser(decl.value);
        //   for (const node of nodes) {
        //     if (node.value === "url") {
        //       const [urlNode] = (node as FunctionNode).nodes;
        //       const url = urlNode.value;
        //       result[selector].url.push(url);
        //     }
        //   }
        // }
      },
      // async OnceExit(root, { Rule }) {
      //   //console.log(root)
      //   const nowebps = [];
      //   const webps = [];
      //   for (const item in result) {
      //     for (const url of result[item].url) {
      //       console.log(url);
      //       await minify({
      //         loaderContext,
      //         url
      //       })
      //     }
      //     // const norule = new Rule({ selector: `.${className.nowebp} ${item}` });
      //     // norule.append(result[item].decl);
      //     // nowebps.push(norule);

      //     // let finalValue = result[item].decl.value;
      //     // result[item].url.forEach((url) => {
      //     //   finalValue = finalValue.replace(url, url + ".webp");
      //     // });
      //     // result[item].webpDecl = result[item].decl.clone({
      //     //   value: finalValue,
      //     // });

      //     // const rule = new Rule({ selector: `.${className.webp} ${item}` });
      //     // rule.append(result[item].webpDecl);
      //     // webps.push(rule);
      //   }
      //   root.append([...nowebps, ...webps]);
      // },
    };
  };
  PostcssPlugin.postcss = true;
  return {
    PostcssPlugin,
  };
};

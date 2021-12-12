import { asyncHooks } from "./hooks";
import { PLUGIN_NAME } from "../constants";
import { ReplaceDependency } from "./ReplaceDependency";

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
  // constructor() {}
  data = [];
  REPLACER_RE = /WEBP_HOLDER_/;
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
        this.replaceInModules(chunks, compilation)
      });

      try {
        compilation.hooks.processAssets.tap(
          {
            name: PLUGIN_NAME,
            stage: compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
          },
          (assets) => {
            // console.log("processAssets");
            // console.log('List of assets and their sizes:');
            // Object.entries(assets).forEach(([pathname, source]) => {
            //   console.log(`— ${pathname}: ${source.size()} bytes`);
            // });
            // console.log(assets);
          }
        );
      } catch (e) {
        this.plugin(compilation, "optimizeChunkAssets", (chunks, callback) => {
          console.log("optimizeChunkAssets");
          this.replaceInCSSAssets(chunks, compilation);
          callback();
        });
      }
    });
  }

  replaceInCSSAssets(chunks, compilation) {

  }
  optimizeTree(compilation, chunks, modules, callback) {

    callback();
  }
  replaceInModules(chunks, compilation) {
    const allModules = getAllModules(compilation);
    allModules.forEach((module: any) => {
      const identifier = module.identifier();
      // if (/^css[\s]+/g.test(identifier)) {
      //   console.log(identifier);
      // } else {
      //   const source = module._source;
      //   let ranges = [];
      //   const replaceDependency = module.dependencies.filter(
      //     (dependency) => dependency.constructor === ReplaceDependency
      //   )[0];
      //   if (typeof source === "string")
      //     ranges = this.replaceHolderToRanges(source);
      //   else if (source instanceof Object && typeof source._value === "string")
      //     ranges = this.replaceHolderToRanges(source._value);
      //   if (ranges.length) {
      //     if (replaceDependency) replaceDependency.updateRanges(ranges);
      //     else module.addDependency(new ReplaceDependency(ranges));
      //   }
      // }
    });
    // for (const [key, value] of Object.entries(this.data)) {
    //   console.log(key, value.webp.toString());
    // }
  }
  replaceHolderToRanges(source) {
    const ranges = [];
    // source.replace(this.REPLACER_RE, (...args) => {
    //   const m = args[0];
    //   const offset = +args[args.length - 2];
    //   const content = this.REPLACER_FUNC_ESCAPED(...args.slice(1, -2)) || m;
    //   ranges.push([offset, offset + m.length - 1, content]);
    //   return m;
    // });
    return ranges;
  }

  REPLACER_FUNC_ESCAPED(groupName, id) {
    // console.log('[REPLACER_FUNC_ESCAPED]', this.data[groupName][id]);
    return this.data[id].content;
  }
}

export default WebpConvertPlugin;

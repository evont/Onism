import { asyncHooks } from "./hooks";
import { PLUGIN_NAME } from "./constants";

class WebpConvertPlugin {
  // constructor() {}

  data = {};
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

      this.plugin(compilation, "optimizeTree", (chunks, modules, callback) => {
        console.log("optimizeTree");
      });

      this.plugin(compilation, "afterOptimizeTree", (chunks, modules) => {
        console.log("afterOptimizeTree");
      });

      try {
        compilation.hooks.processAssets.tap(
          {
            name: PLUGIN_NAME,
            stage: compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
          },
          (assets) => {
            console.log("processAssets");
            // console.log('List of assets and their sizes:');
            // Object.entries(assets).forEach(([pathname, source]) => {
            //   console.log(`— ${pathname}: ${source.size()} bytes`);
            // });
          }
        );
      } catch (e) {
        this.plugin(compilation, "optimizeChunkAssets", (chunks, callback) => {
          console.log("optimizeChunkAssets");
          callback();
        });
      }
    });
  }
}

export default WebpConvertPlugin;

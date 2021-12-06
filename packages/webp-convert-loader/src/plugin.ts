import { asyncHooks } from "./hooks";
class WebpConvertPlugin {
  constructor() {

  }
  PLUGIN_NAME = 'WebpConvertPlugin';
  plugin(obj, name, callback) {
    if (obj.hooks) {
      if (asyncHooks.includes(name))
        obj.hooks[name].tapAsync(this.PLUGIN_NAME, callback);
      else obj.hooks[name].tap(this.PLUGIN_NAME, callback);
    } else {
      name = name.replace(/([A-Z])/g, (m, $1) => "-" + $1.toLowerCase());
      obj.plugin(name, callback);
    }
  }

  apply(compiler) {
    this.plugin(compiler, 'thisCompilation', (compilation, params) => {
      console.log('thisCompilation')
    })
  }
}

export default WebpConvertPlugin;

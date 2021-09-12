import postcss, { AcceptedPlugin, ProcessOptions } from "postcss";
export type GetPlugin = (loaderContext: any) => AcceptedPlugin[];
export default function createLoader(getPlugin) {
  return function (source, meta) {
    const callback = this?.async();
    this?.cacheable();
    const options: ProcessOptions = {
      to: this.resourcePath,
      from: this.resourcePath,
    };
    if (meta && meta.sourceRoot && meta.mappings) {
      options.map = {
        prev: meta,
        inline: false,
        annotation: false,
      };
    }
    let plugins = getPlugin(this);
    if (!Array.isArray(plugins)) plugins = [plugins];
    postcss(plugins)
      .process(source, options)
      .then((result) => {
        const map = result.map && result.map.toJSON();
        callback(null, result.css, map);
        return null;
      })
      .catch((error) => {
        callback(error);
      });
  };
}

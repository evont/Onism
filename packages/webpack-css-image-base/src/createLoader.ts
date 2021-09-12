import postcss, { AcceptedPlugin, ProcessOptions } from "postcss";
import { getOptions } from "loader-utils";

export type GetPlugin = (loaderContext: any) => AcceptedPlugin[];
export default function createLoader(getPlugin, onSuccess) {
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
    const loaderOption = getOptions(this) || {};
    let plugins = getPlugin(this, loaderOption);
    if (!Array.isArray(plugins)) plugins = [plugins];
    return postcss(plugins)
      .process(source, options)
      .then((result) => {
        const map = result.map && result.map.toJSON();
        callback(null, result.css, map);
        onSuccess(result)
        return null;
      })
      .catch((error) => {
        callback(error);
      });
  };
}

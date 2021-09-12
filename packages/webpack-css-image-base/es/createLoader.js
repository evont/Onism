import postcss from "postcss";
export default function createLoader(getPlugin) {
  return function (source, meta) {
    var callback = this == null ? void 0 : this.async();
    this == null ? void 0 : this.cacheable();
    var options = {
      to: this.resourcePath,
      from: this.resourcePath
    };

    if (meta && meta.sourceRoot && meta.mappings) {
      options.map = {
        prev: meta,
        inline: false,
        annotation: false
      };
    }

    var plugins = getPlugin(this);
    if (!Array.isArray(plugins)) plugins = [plugins];
    postcss(plugins).process(source, options).then(function (result) {
      var map = result.map && result.map.toJSON();
      callback(null, result.css, map);
      return null;
    })["catch"](function (error) {
      callback(error);
    });
  };
}
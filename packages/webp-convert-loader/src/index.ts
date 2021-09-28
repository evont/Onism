import postcss from "postcss";
import { getOptions } from "loader-utils";
import getPlugin from "./postcssPlugin";
import { LoaderOptions } from "./type";

export default function loader(source) {
  const callback = this?.async();
  this?.cacheable();
  let options: LoaderOptions = {};
  try {
    options = getOptions(this) || {};
    const pcOptions = {
      to: this?.resourcePath,
      from: this?.resourcePath,
    };

    const { PostcssPlugin } = getPlugin({
      loaderContext: this,
      options,
    });
    postcss(PostcssPlugin)
      .process(source, pcOptions)
      .then((result) => {
        const map = result.map && result.map.toJSON();
        callback(null, result.css, map);
      })
      .catch((error) => {
        callback(error);
      });
  } catch (err) {
    callback(err);
  }
}

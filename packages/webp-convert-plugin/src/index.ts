import postcss from "postcss";
import { getOptions } from "loader-utils";
import getPlugin from "./plugin";

import { LoaderOptions } from "./type";
function mergeOptions(options: LoaderOptions): LoaderOptions {
  const defaultClassName = {
    webp: 'webp',
    nowebp: 'nowebp'
  }
  const mergeOption = Object.assign(
    {
      outputPath: "./",
      className: defaultClassName
    },
    options
  );
  mergeOption.className = Object.assign(defaultClassName, mergeOption.className);
  // validate(schema, mergeOption, {
  //   name: LOADER_NAME,
  // });
  return mergeOption;
}
export default function loader(source) {
  const callback = this?.async();
  this?.cacheable();
  let options: LoaderOptions = {};
  try {
    options = mergeOptions(getOptions(this) || {});
    const pcOptions = {
      to: this?.resourcePath,
      from: this?.resourcePath,
    };

    const { PostcssPlugin } = getPlugin({
      loaderContext: this,
      options
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

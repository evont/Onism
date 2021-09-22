import { validate } from "schema-utils";

import getPlugin from "./plugin";
import { LOADER_NAME } from "./util/constant";
import { invalidCache, setCache, setCachePath } from "./util/cache";
import { LoaderOptions } from "../type";
import schema from "./schema";
import { createLoader } from "@onism/webpack-css-image-base";
function mergeOptions(options: LoaderOptions): LoaderOptions {
  const mergeOption = Object.assign(
    {
      outputPath: "./slice",
      output: "[hash]_[index]",
    },
    options
  );
  validate(schema, mergeOption, {
    name: LOADER_NAME,
  });
  return mergeOption;
}

let loaderCache;
export default createLoader(
  (loaderContext, options) => {
    options = mergeOptions(options);
    if (options.cachePath) {
      setCachePath(options.cachePath);
    }
    const { cache, PostcssPlugin } = getPlugin({
      loaderContext,
      options,
    });
    loaderCache = cache;
    return PostcssPlugin;
  },
  () => {
    invalidCache(loaderCache);
    setCache(loaderCache);
  }
);
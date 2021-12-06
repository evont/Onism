import { createLoader } from "@onism/webpack-css-image-base";
import { getOptions } from "loader-utils";
import getPlugin from "./postcssPlugin";
import { LoaderOptions } from "./type";

export default createLoader((loaderContext, options: LoaderOptions) => { 
  const { PostcssPlugin } = getPlugin({
    loaderContext,
    options,
  });
  return PostcssPlugin;
})
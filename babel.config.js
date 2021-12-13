module.exports = (api) => {
  const { BABEL_MODULE } = process.env;
  const useESModules = BABEL_MODULE !== "commonjs";
  api && api.cache(false);
  return {
    presets: [
      [
        "@babel/env",
        {
          loose: true,
          modules: useESModules ? false : "commonjs",
          exclude: ["transform-regenerator", "transform-async-to-generator"],
          targets: { node: "current" },
        },
      ],
      "@babel/typescript",
    ],
  };
};

#!/usr/bin/env node
const { Command } = require("commander");
const fs = require("fs-extra");
const babel = require("@babel/core");
const path = require("path");
const glob = require("glob");
const gaze = require("gaze");
const cwd = process.cwd();
const program = new Command();
program
  .option("-w, --watch", "should turn on watch mode or not")
  .option("-c, --config <type>", "babel config file path", "./babel.config.js")
  .option("-s, --src <type>", "src path to compile", "./src")
  .option(
    "-e, --es <type>",
    "es path to output compiled es module file",
    "./es"
  )
  .option(
    "-l, --lib <type>",
    "lib path to output compiled commonjs module file",
    "./lib"
  );
program.parse();

function getAbsolutePath(dir) {
  return path.isAbsolute(dir) ? dir : path.resolve(cwd, dir);
}
function checkConfigExist(configFile) {
  return fs.pathExistsSync(configFile);
}

const scriptRegExp = /(?<!\.d)\.(ts|tsx)$/;
const isDir = (dir) => fs.lstatSync(dir).isDirectory();
const isScript = (file) => scriptRegExp.test(file);
function compile(dir, babelConfig) {
  const files = fs.readdirSync(dir);

  files.forEach(async (file) => {
    const filePath = path.join(dir, file);

    if (isDir(filePath)) {
      return compile(filePath);
    }

    if (isScript(file)) {
      const { code } = babel.transformFileSync(filePath, babelConfig);
      fs.removeSync(filePath);
      fs.outputFileSync(filePath.replace(scriptRegExp, ".js"), code);
    }
  });
}

function exec({ watch = false, config, src, es, lib }) {
  const babelConfig = {
    rootMode: "upward-optional",
  };
  let configFile = getAbsolutePath(config);
  if (checkConfigExist(configFile)) {
    babelConfig.configFile = configFile;
  }
  const srcDir = getAbsolutePath(src);
  const esDir = getAbsolutePath(es);
  const libDir = getAbsolutePath(lib);

  const globPattern = "**/*.ts";
  const run = () => {
    glob(globPattern, {
      cwd: srcDir
    }, (err, files) => {
      if (err) {
        throw err;
      }

      fs.emptyDirSync(esDir);
      fs.emptyDirSync(libDir);
      fs.copySync(srcDir, esDir);
      compile(esDir, babelConfig);

      process.env.BABEL_MODULE = "commonjs";
      fs.copySync(srcDir, libDir);
      compile(libDir, babelConfig);

    });
  };
  run();
  if (watch) {
    gaze(globPattern, { cwd: srcDir }, (err, watcher) => {
      watcher.on('all', run);
    });
  }
}

exec(program.opts());

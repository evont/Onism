#! /usr/local/bin/node
const inquirer = require("inquirer");
const fs = require("fs-extra");
const glob = require("glob");
const path = require("path");
const { spawn } = require("child_process");
const args = process.argv.slice(2);

glob(
  "*",
  {
    cwd: path.resolve(process.cwd(), "packages"),
  },
  async (err, files) => {
    const packages = {};
    files.forEach((p) => {
      try {
        const packageJson = fs.readJSONSync(
          path.resolve(process.cwd(), "packages", p, "package.json")
        );
        const { scripts } = packageJson;
        if (scripts) {
          packages[p] = Object.keys(scripts);
        }
      } catch (e) {
        console.error(e);
      }
    });

    const { packages: selectPackages } = await inquirer.prompt([
      {
        type: "checkbox",
        name: "packages",
        message: "Please choose packages to run your task",
        choices: Object.keys(packages),
        validate(answer) {
          if (!answer.length) {
            return 'You muse choose at lease one package'
          }
          return true;
        }
      },
    ]);
    const questions = [];
    for (const package of selectPackages) {
      questions.push({
        type: "list",
        choices: packages[package],
        name: package,
        message: `Please select the task command of ${package}`,
      });
    }
    const matchCMD = await inquirer.prompt(questions);
    const spawnParam = [];
    for (const pkg in matchCMD) {
      const cmd = matchCMD[pkg];
      spawnParam.push(cmd, "--filter", `@onism/${pkg}`);
    }
    spawn("pnpm", spawnParam, {
      stdio: "inherit",
      // env: Object.assign(process.env, { FORCE_COLOR: true }),
    });
    // sp.stdout.pipe(process.stdout);
  }
);

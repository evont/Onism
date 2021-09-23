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
  (err, files) => {
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

    inquirer
      .prompt([
        {
          type: "list",
          name: "package",
          message: "Please select the package to run your task",
          choices: Object.keys(packages),
        },
        {
          type: "list",
          name: "command",
          default: "start",
          message: "Please select the command you want to run",
          choices: (answer) => {
            return packages[answer.package];
          },
        },
      ])
      .then((answers) => {
        const { package, command } = answers;
        const sp = spawn(
          "yarn",
          ["workspace", `@onism/${package}`, "run", command],
          {
            stdio: "pipe",
            env: Object.assign(process.env, { FORCE_COLOR: true }),
          }
        );
        sp.stdout.pipe(process.stdout);
      });
  }
);

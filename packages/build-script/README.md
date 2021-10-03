# `@onism/build-script`

Tool that compile scripts into `ES Module` & `commonjs` formate.

## Usage

add  `onism-build [options]` script to `package.json`

**Options**:
| short param | full param |description | default |
| :--: | :--: | -- | -- |
| -c | --config <type> | babel config file path | **./babel.config.js** |
| -s | --src <type> | src path to compile |  **./src** |
| -e | --es <type> | es path to output compiled es module file | **./es** |
| -l | --lib <type> | lib path to output compiled commonjs module file |  **./lib** |
| -h | --help | display help for command |  |

**Notice**: all passed path is relative to `process.cwd()`;
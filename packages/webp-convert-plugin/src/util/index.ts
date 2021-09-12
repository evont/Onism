interface Alias {
  name: string;
  alias: string;
  onlyModule: boolean;
}
export function transformAlias(
  alias: Record<string, string | { alias: string }>
): Alias[] {
  return Object.keys(alias).map((key) => {
    let obj = alias[key];
    let onlyModule = false;
    let result: Alias;
    if (/\$$/.test(key)) {
      onlyModule = true;
      key = key.substr(0, key.length - 1);
    }
    result = Object.assign(
      {
        name: key,
        onlyModule,
      },
      typeof obj === "string"
        ? {
            alias: obj,
          }
        : obj
    );
    return result;
  });
}

// enhanced-resolve/lib/AliasPlugin
export function startsWith(string, searchString) {
  const stringLength = string.length;
  const searchLength = searchString.length;

  // early out if the search length is greater than the search string
  if (searchLength > stringLength) {
    return false;
  }
  let index = -1;
  while (++index < searchLength) {
    if (string.charCodeAt(index) !== searchString.charCodeAt(index)) {
      return false;
    }
  }
  return true;
}
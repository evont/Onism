export function useNumOnly(val: string | number, defaultVal = 0): number {
  return val && Number.isNaN(+val) ? defaultVal : +val;
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

export function parseProperty(propValue: string) {
  // use example: [url, bgSize, slice, direction, isSep]
  // 1. long-bg: url(@assets/long-1.png) 375 300 column;
  // 2. long-bg: url(@assets/long-1.png) 375 [200, 400, 300];
  const reg = /url\(["']?(.*?)["']?\)/;
  const formateVal = propValue.replace(/(\d+,)\s?(?=\d)/g, "$1");
  const valArr = formateVal.split(" ");
  const url = reg.exec(valArr[0])?.[1] || "";
  let bgSize: number = useNumOnly(valArr[1]); // zero means use origin image size
  let slice: number[] = [300];
  if (valArr[2]) {
    slice = valArr[2]
      .split(",")
      .filter(Boolean)
      .map((num) => useNumOnly(num, 500));
  }
  let direction: "column" | "row" = "column";
  let isSeparate = false;
  let tmp = valArr[3];
  if (tmp === "column" || tmp === "row") {
    direction = tmp;
    if (valArr[4]) {
      tmp = valArr[4];
    } else {
      tmp = "";
    }
  }
  isSeparate = (tmp && tmp === "true") || false;
  return {
    url,
    bgSize,
    slice,
    direction,
    isSeparate
  };
}

# `@onism/webp-convert-loader`

add script below in your head
```javascript
document.body.classList.remove("no-js");
var i = new Image();
i.onload = i.onerror = function () {
  document.body.classList.add(i.height == 1 ? "webp" : "no-webp");
};
i.src =
  "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";
```

[encodeOption](https://github.com/GoogleChromeLabs/squoosh/blob/dev/libsquoosh/src/codecs.ts)

`{}` an empty object means 'use default settings
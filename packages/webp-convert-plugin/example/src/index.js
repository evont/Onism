import "./assets/style/index.css";
import "./assets/style/index2.css";

function testWebp(callback) {
  const image = new Image();
  image.onerror = function () {
    callback(false);
  };
  image.onload = function () {
    callback(image.width == 1);
  };
  image.src =
    "data:image/webp;base64,UklGRiwAAABXRUJQVlA4ICAAAAAUAgCdASoBAAEAL/3+/3+CAB/AAAFzrNsAAP5QAAAAAA==";
}

testWebp((flag) => {
    document.body.classList.add(flag ? 'webp' : 'nowebp')
  
})
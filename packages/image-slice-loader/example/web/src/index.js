import "./style/index.css";
import lozad from 'lozad'
console.log("hey")

setTimeout(() => {
  const observer = lozad(); // lazy loads elements with default selector as '.lozad'
observer.observe();
}, 2000)
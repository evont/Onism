const { spawn } = require('child_process');

function ps(command) {
  // console.log(command.join(' '))
  const sp = spawn("node", ['../../dist/cli.js', ...command]);
  sp.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
}
function testImg() {
  ps([, '-i', './long.png', '-s', '300', '200', '-d', 'column', '-o', './slice/images'])
}

function testJson() {
  ps(['-j', './multi.json', '-o', './slice/multi'])
}

function testJson2() {
  ps(['-j', './single.json', '-o', '/Users/evontng/Project/person/image-slice-loader/example/bin/slice/single'])
}


testImg();

testJson();

testJson2();
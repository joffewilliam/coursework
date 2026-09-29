# Code Citations

## License: unknown
https://github.com/freyhill/freyhill.github.io/tree/93ff85076768e97a60b21dd49bebd8a681a5a912/example/currying/index.html

```
.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0"
```


## License: GPL_3_0
https://github.com/hypothete/dowel/tree/01a73d2f677250a38a4d8ef17bad5da1b81bc247/src/core/shader.js

```
);
  }

  loadShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.
```


## License: MIT
https://github.com/atom-archive/xray/tree/cb6c5809f18c733f55b89ce202678c379a4cfc7b/xray_ui/lib/text_editor/text_plane.js

```
vertexShader, fragmentShader) {
    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter
```


## License: unknown
https://github.com/DavidDecraene/marchingCubesGL/tree/5382193573fc9509c1b063f378aa4687adeb2b45/src/lib/shader.utils.ts

```
(!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('An error occurred compiling the shaders: ' + this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
```


## License: unknown
https://github.com/robsouthgate4/webgl2_sandbox/tree/88028a02e285677cf7bbbf33eacf769031399fa8/src/scenes/CubeScene.js

```
.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
```


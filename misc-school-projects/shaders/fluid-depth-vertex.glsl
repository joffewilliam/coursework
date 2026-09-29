attribute vec2 a_position;
uniform mat4 u_projection;
uniform float u_pointSize;

void main() {
  gl_Position = u_projection * vec4(a_position, 0.0, 1.0);
  gl_PointSize = u_pointSize;
}
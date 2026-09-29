#version 300 es
in vec2 a_position;
uniform vec2 u_resolution;
uniform float u_pointSize;
void main() {
  // Convert the particle positions to normalized coordinates.
  vec2 normalizedPosition = (a_position / u_resolution) * 2.0 - 1.0;
  gl_Position = vec4(normalizedPosition, 0.0, 1.0);
  gl_PointSize = u_pointSize; // Set the point size of the particles.
}

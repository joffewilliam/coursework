// Renders particles as soft blobs to create a thickness/depth map
precision highp float;

void main() {
  // Calculate distance from center of point sprite
  vec2 coord = gl_PointCoord * 2.0 - 1.0;
  float distSq = dot(coord, coord);
  
  // Soft circular falloff for each particle
  float influence = smoothstep(1.0, 0.0, distSq);
  
  // Output particle depth and thickness
  gl_FragColor = vec4(influence, 0.0, 0.0, 1.0);
}
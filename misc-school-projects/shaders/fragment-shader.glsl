#version 300 es
precision mediump float;
out vec4 fragColor;
void main() {
  // Calculate distance from the center of the point sprite.
  vec2 center = gl_PointCoord - vec2(0.5);
  float r = length(center);
  
  // Softer falloff for more connected appearance
  float intensity = exp(-5.0 * r * r);
  
  // Smoother blending with wider alpha range
  float alpha = smoothstep(0.1, 0.4, intensity);
  
  // More water-like colors with better contrast
  vec3 deepBlue = vec3(0.0, 0.2, 0.5);
  vec3 lightBlue = vec3(0.4, 0.7, 1.0);
  vec3 color = mix(deepBlue, lightBlue, intensity);
  
  // Add a subtle highlight for surface appearance
  float highlight = smoothstep(0.4, 0.8, intensity);
  color += vec3(0.1, 0.1, 0.2) * highlight;
  
  fragColor = vec4(color, alpha);
}

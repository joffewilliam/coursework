precision highp float;

uniform sampler2D u_depthTexture;
uniform vec2 u_texelSize;
uniform float u_normalStrength;

void main() {
  vec2 uv = gl_FragCoord.xy * u_texelSize;
  
  // Sample depth at neighboring pixels
  float c = texture2D(u_depthTexture, uv).r;
  float l = texture2D(u_depthTexture, uv + vec2(-u_texelSize.x, 0.0)).r;
  float r = texture2D(u_depthTexture, uv + vec2(u_texelSize.x, 0.0)).r;
  float t = texture2D(u_depthTexture, uv + vec2(0.0, u_texelSize.y)).r;
  float b = texture2D(u_depthTexture, uv + vec2(0.0, -u_texelSize.y)).r;
  
  // Calculate normal using central differences
  vec3 normal = normalize(vec3(
    (l - r) * u_normalStrength,
    (b - t) * u_normalStrength,
    1.0
  ));
  
  // Output normal encoded in color
  gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
}
precision highp float;

uniform sampler2D u_depthTexture;
uniform sampler2D u_normalTexture;
uniform vec2 u_texelSize;
uniform vec3 u_lightDir;
uniform vec4 u_waterColor;
uniform vec3 u_viewPosition;

void main() {
  vec2 uv = gl_FragCoord.xy * u_texelSize;
  
  // Get depth and normal
  float depth = texture2D(u_depthTexture, uv).r;
  vec3 normal = texture2D(u_normalTexture, uv).rgb * 2.0 - 1.0;
  
  // Skip pixels with no fluid
  if (depth < 0.01) discard;
  
  // Calculate lighting
  vec3 lightDir = normalize(u_lightDir);
  float diffuse = max(0.0, dot(normal, lightDir));
  vec3 viewDir = normalize(u_viewPosition - vec3(uv, depth));
  vec3 reflectDir = reflect(-lightDir, normal);
  float specular = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
  
  // Final water color
  vec3 waterColor = u_waterColor.rgb;
  vec3 ambient = waterColor * 0.2;
  vec3 diffuseColor = waterColor * diffuse * 0.6;
  vec3 specularColor = vec3(1.0) * specular * 0.5;
  
  // Fade based on depth
  float opacity = smoothstep(0.0, 0.5, depth) * u_waterColor.a;
  
  // Final color with depth-based darkness
  gl_FragColor = vec4(ambient + diffuseColor + specularColor, opacity);
}
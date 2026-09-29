#version 300 es
precision highp float;
precision highp int;
precision highp isampler2D;

// Input from vertex shader
flat in int v_particleIndex;
in vec2 v_gridPosition;

// Output
layout(location = 0) out int fragColor;

// Uniforms
uniform ivec2 u_gridSize;

void main() {
    // Skip particles that are out of bounds
    if (v_gridPosition.x < 0.0 || v_gridPosition.y < 0.0) {
        discard;
    }
    
    // Output the particle index
    fragColor = v_particleIndex;
}
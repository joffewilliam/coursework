#version 300 es
precision highp float;
precision highp int;

in vec2 a_position;

// Uniforms
uniform vec2 u_resolution;
uniform ivec2 u_gridSize;
uniform float u_gridCellSize;

// Output to fragment shader
flat out int v_particleIndex;
out vec2 v_gridPosition;

void main() {
    // Calculate grid cell for this particle
    vec2 gridPos = floor(a_position / u_gridCellSize);
    int cellX = int(min(gridPos.x, float(u_gridSize.x - 1)));
    int cellY = int(min(gridPos.y, float(u_gridSize.y - 1)));
    
    // Handle out-of-bounds particles
    if (a_position.x < 0.0 || a_position.y < 0.0 || 
        a_position.x >= u_resolution.x || a_position.y >= u_resolution.y) {
        cellX = -1;
        cellY = -1;
    }
    
    // Pass grid position and particle index to fragment shader
    v_gridPosition = vec2(cellX, cellY);
    v_particleIndex = gl_VertexID; // Current particle index
    
    // Convert position to clip space
    gl_Position = vec4(
        a_position.x / u_resolution.x * 2.0 - 1.0,
        a_position.y / u_resolution.y * 2.0 - 1.0,
        0, 
        1
    );
    
    // Set point size
    gl_PointSize = 1.0;
}
#version 300 es
precision highp float;
precision highp int;
precision highp isampler2D;

// Inputs from vertex buffers
in vec2 a_position;
in vec2 a_velocity;

// Outputs to transform feedback
out vec2 v_position;
out vec2 v_velocity;
// Add an extra output storing force magnitude for debug:
out float v_debugForceMagnitude;

// Uniforms
uniform float u_dt;
uniform vec2 u_gravity;
uniform sampler2D u_positions;
uniform int u_particleCount;
uniform float u_viscosity;
uniform float u_surfaceTension;
uniform vec2 u_resolution;

// Grid-related uniforms
uniform isampler2D u_grid;
uniform isampler2D u_gridCount;
uniform ivec2 u_gridSize;
uniform float u_gridCellSize;

// Constants - ADJUSTED FOR LESS COMPRESSION
const float REST_DENSITY = 111.0;           // Keep this the same
const float GAS_CONSTANT = 5000.0;         // Increase stiffness (was 3000.0)
const float PARTICLE_MASS = 10.0;           // Keep this the same
const float PARTICLE_RADIUS = 5.0;        // Keep this the same
const float H = 30.0;                      // Keep this the same
const float HSQ = H * H;

float poly6Kernel(float distSq) {
    if (distSq > HSQ) return 0.0;
    
    float x = 1.0 - distSq / HSQ;
    // Normalize by kernel volume for better physical accuracy
    return 4.0 * x * x * x / (3.14159 * HSQ);
}

float spikyKernel(float dist) {
    if (dist > H) return 0.0;
    
    float x = 1.0 - dist / H;
    // Normalize for consistent forces at different radii
    return 10.0 * x * x / (3.14159 * H * H);
}

// Add a viscosity kernel for better viscosity behavior
float viscosityKernel(float dist) {
    if (dist > H) return 0.0;
    
    float x = dist / H;
    // Quadratic kernel for smoother viscosity
    return (1.0 - x) * (1.0 - x);
}

void main() {
    vec2 position = a_position;
    vec2 velocity = a_velocity;
    
    // Calculate density at particle position
    float density = 0.0;
    
    // Calculate grid cell for this particle
    ivec2 cell = ivec2(position / u_gridCellSize);
    
    // Check neighboring cells (3x3 grid)
    for (int offsetY = -1; offsetY <= 1; offsetY++) {
        for (int offsetX = -1; offsetX <= 1; offsetX++) {
            ivec2 neighborCell = cell + ivec2(offsetX, offsetY);
            
            // Skip if outside grid bounds
            if (neighborCell.x < 0 || neighborCell.y < 0 || 
                neighborCell.x >= u_gridSize.x || neighborCell.y >= u_gridSize.y) {
                continue;
            }
            
            // Get count of particles in this grid cell
            int cellIndex = neighborCell.y * u_gridSize.x + neighborCell.x;
            int particleCount = texelFetch(u_gridCount, neighborCell, 0).r;
            
            // Process each particle in this cell
            for (int i = 0; i < 32; i++) {
                if (i >= particleCount) break;
                
                // Get particle index from grid
                int particleIndex = texelFetch(u_grid, ivec2(neighborCell.x * 32 + i, neighborCell.y), 0).r;
                
                // Skip invalid indices or self
                if (particleIndex < 0 || particleIndex >= u_particleCount) continue;
                
                // Get neighbor particle data
                vec4 neighborData = texelFetch(u_positions, ivec2(particleIndex, 0), 0);
                vec2 neighborPos = neighborData.xy;
                
                // Calculate distance
                vec2 diff = neighborPos - position;
                float distSq = dot(diff, diff);
                
                // Skip if too far or same particle
                if (distSq > HSQ || distSq < 0.0001) continue;
                
                // Add to density estimate using poly6 kernel
                density += PARTICLE_MASS * poly6Kernel(distSq);
            }
        }
    }
    
    // Add self-density to avoid division by zero
    density = max(density, 100.0);
    
    // Add artificial pressure term to prevent tight clustering
    float artificialPressure = 0.0;
    if (density > REST_DENSITY * 0.8) {
        artificialPressure = 0.1 * GAS_CONSTANT * (density - REST_DENSITY * 0.8);
    }

    // Inside your main function after calculating density

    // Add this debugging code
    if (density < 1.0) {
        // Force artificial density to see if pressure calculation works
        density = REST_DENSITY * 2.0;
    }

    // Calculate pressure explicitly
    float pressure = GAS_CONSTANT * max(0.0, density - REST_DENSITY);

    // Add density correction to prevent stacking/compression
    // This creates a stronger repulsion at higher densities
    float densityRatio = density / REST_DENSITY;
    float pressureTerm = 0.0;

    if (densityRatio > 1.0) {
        // Progressive stiffness - gets much stiffer as density increases
        float overCompression = densityRatio - 1.0;
        float stiffnessFactor = 1.0 + 5.0 * overCompression * overCompression;
        pressure = GAS_CONSTANT * (density - REST_DENSITY) * stiffnessFactor;
    } else {
        // Standard pressure for normal or low density regions
        pressure = GAS_CONSTANT * (density - REST_DENSITY);
    }

    // Also add a stronger artificial pressure term to prevent tight clustering
    artificialPressure = 0.0;
    if (density > REST_DENSITY * 0.8) {
        artificialPressure = 0.2 * GAS_CONSTANT * (density - REST_DENSITY * 0.8);
    }

    // Calculate pressure with artificial term
    pressure += artificialPressure;
    
    // Calculate forces (pressure and viscosity)
    vec2 pressureForce = vec2(0.0);
    vec2 viscosityForce = vec2(0.0);
    vec2 cohesionForce = vec2(0.0);
    
    // Recalculate neighbor interactions for forces
    for (int offsetY = -1; offsetY <= 1; offsetY++) {
        for (int offsetX = -1; offsetX <= 1; offsetX++) {
            ivec2 neighborCell = cell + ivec2(offsetX, offsetY);
            
            // Skip if outside grid bounds
            if (neighborCell.x < 0 || neighborCell.y < 0 || 
                neighborCell.x >= u_gridSize.x || neighborCell.y >= u_gridSize.y) {
                continue;
            }
            
            // Get count of particles in this grid cell
            int cellIndex = neighborCell.y * u_gridSize.x + neighborCell.x;
            int particleCount = texelFetch(u_gridCount, neighborCell, 0).r;
            
            // Process each particle in this cell
            for (int i = 0; i < 32; i++) {
                if (i >= particleCount) break;
                
                // Get particle index from grid
                int particleIndex = texelFetch(u_grid, ivec2(neighborCell.x * 32 + i, neighborCell.y), 0).r;
                
                // Skip invalid indices or self
                if (particleIndex < 0 || particleIndex >= u_particleCount) continue;
                
                // Get neighbor particle data
                vec4 neighborData = texelFetch(u_positions, ivec2(particleIndex, 0), 0);
                vec2 neighborPos = neighborData.xy;
                vec2 neighborVel = neighborData.zw;
                
                // Calculate distance
                vec2 diff = neighborPos - position;
                float distSq = dot(diff, diff);
                
                // Skip if too far or same particle
                if (distSq > HSQ || distSq < 0.0001) continue;
                
                float dist = sqrt(distSq);
                vec2 dir = dist > 0.0 ? diff / dist : vec2(0.0, 1.0);
                
                // Calculate pressure force using spiky kernel - separated pressure calculation
                float neighborPressure = GAS_CONSTANT * max(density - REST_DENSITY, 0.0);
                float pressureTerm = (pressure + neighborPressure) / (2.0 * density);
                pressureForce -= dir * PARTICLE_MASS * pressureTerm * spikyKernel(dist);
                
                // Calculate viscosity force with dedicated kernel
                viscosityForce += (neighborVel - velocity) * viscosityKernel(dist);
                
                // Add cohesion force (surface tension effect)
                cohesionForce += dir * poly6Kernel(distSq) * u_surfaceTension;
            }
        }
    }
    
    // Scale viscosity appropriately
    viscosityForce *= u_viscosity * PARTICLE_MASS / density;
    
    // Add this code right before calculating the total force:

    // DIRECT COLLISION TEST - billiard ball style (overrides SPH forces)
    vec2 directCollisionForce = vec2(0.0);
    float collisionRadius = PARTICLE_RADIUS * 2.0;
    float collisionRadiusSq = collisionRadius * collisionRadius;

    // Check all particles (brute force, but guaranteed to work)
    for (int i = 0; i < u_particleCount; i++) {
        // Skip self
        if (gl_VertexID == i) continue;
        
        // Get other particle data directly (bypass grid)
        vec4 otherParticle = texelFetch(u_positions, ivec2(i, 0), 0);
        vec2 otherPos = otherParticle.xy;
        
        // Simple distance check
        vec2 diff = otherPos - position;
        float distSq = dot(diff, diff);
        
        // Reduce the collision force and add velocity damping
        if (distSq < collisionRadiusSq && distSq > 0.0001) {
            float dist = sqrt(distSq);
            vec2 dir = diff / dist;
            float overlap = collisionRadius - dist;
            
            // SOFTER COLLISIONS - Reduce force strength significantly
            directCollisionForce -= dir * overlap * 100.0; // Reduced from 500.0
            
            // Get other particle's velocity for relative damping
            vec2 otherVel = otherParticle.zw;
            
            // Calculate relative velocity along collision normal
            vec2 relativeVel = velocity - otherVel;
            float normalVelocity = dot(relativeVel, dir);
            
            // Apply damping only if particles are approaching each other
            if (normalVelocity < 0.0) {
                // Add velocity damping (absorbs energy during collision)
                directCollisionForce -= normalVelocity * dir * 3.0; 
            }
        }
    }

    // Also increase general viscosity to make everything calmer
    viscosityForce *= 2.0; // Double viscosity effect

    // Add gravity force calculation before the force summation
    vec2 gravityForce = u_gravity * PARTICLE_MASS;

    // Calculate total force by combining both models
    vec2 force = pressureForce + viscosityForce + cohesionForce + directCollisionForce + gravityForce;
    
    // After calculating total force:
    float forceMagnitude = length(force);
    v_debugForceMagnitude = forceMagnitude;

    // Update velocity and position
    velocity += force * u_dt;
    position += velocity * u_dt;
    
    // Boundary collision handling with damping
    float damping = 0.5;
    
    if (position.x < PARTICLE_RADIUS) {
        position.x = PARTICLE_RADIUS;
        velocity.x *= -damping;
    }
    else if (position.x > u_resolution.x - PARTICLE_RADIUS) {
        position.x = u_resolution.x - PARTICLE_RADIUS;
        velocity.x *= -damping;
    }
    
    if (position.y < PARTICLE_RADIUS) {
        position.y = PARTICLE_RADIUS;
        velocity.y *= -damping;
    }
    else if (position.y > u_resolution.y - PARTICLE_RADIUS) {
        position.y = u_resolution.y - PARTICLE_RADIUS;
        velocity.y *= -damping;
    }
    
    // Output updated position and velocity
    v_position = position;
    v_velocity = velocity;
}

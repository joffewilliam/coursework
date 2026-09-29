import { createShader, createProgram } from './ShaderUtils.js';

export class FluidSimulation {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2');
    if (!this.gl) {
      console.error("WebGL2 is not supported in your browser.");
      return;
    }

    // Simulation parameters
    this.dt = 0.016; // Explicit timestep
    this.gravity = [0.0, -9.81];
    this.substeps = 4; // Add this line to fix the simulation

    // Maximum number of particles and active count.
    this.maxParticles = 10000;
    this.activeParticleCount = 0;
    // CPU–side copy of particle data (interleaved: pos.xy, vel.xy)
    this.particleData = new Float32Array(this.maxParticles * 4);
    // Initially, all values are zero (simulation starts empty)
    for (let i = 0; i < this.maxParticles * 4; i++) {
      this.particleData[i] = 0;
    }

    this.gl.getExtension('EXT_color_buffer_float');

    // Initialize default values for viscosity and surface tension
    this.viscosity = 0.01; // Reduce viscosity (from 0.4)
    this.surfaceTension = 0.05; // Add surface tension

    // Spatial partitioning grid properties
    this.gridCellSize = 25.0; // Reduce from 40.0 to 25.0 for better spatial partitioning
    this.useGPUGridConstruction = true; // Flag to enable GPU-based grid construction
    this.maxParticlesPerCell = 16; // Limit particles per grid cell
    this.frameSkip = 0; // Frame skip counter for less frequent spatial grid updates
    this.frameSkipMax = 2; // Only update spatial grid every 3 frames
    this.gridWidth = 0;
    this.gridHeight = 0;
    this.gridCells = [];

    // Setup GPU simulation and rendering
    this.initializeSimulation();
  }

  async initializeSimulation() {
    try {
      // Setup shaders and programs first
      await this.setupUpdateProgram();
      await this.setupRenderProgram();
      await this.setupGridConstructionProgram();
      
      // Then setup buffers and transform feedback
      this.setupParticleBuffers();
      this.setupTransformFeedback();

      // Add texture for particle positions and velocities
      // We'll store positions in the first half and velocities in the second half
      // Use a power-of-two texture size to avoid WebGL errors
      const texWidth = 2048; // Power of two, large enough for maxParticles
      const texHeight = 2;   // One row for positions, one for velocities
      
      this.positionTexture = this.gl.createTexture();
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.positionTexture);
      this.gl.texImage2D(
          this.gl.TEXTURE_2D, 0, 
          this.gl.RGBA32F,  // Change to RGBA to store both position and velocity
          this.maxParticles, 1, 0,
          this.gl.RGBA, this.gl.FLOAT, 
          null
      );
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

      // Create spatial grid textures
      this.setupSpatialGrid();

      // Start with swap flag false (buffers[0] is current state)
      this.swap = false;

      // Start the animation loop
      this.animate();
      
      console.log("Simulation initialized successfully");
    } catch (error) {
      console.error("Error initializing simulation:", error);
    }
  }

  async setupUpdateProgram() {
    const gl = this.gl;
    
    // Use the full physics implementation from update-shader.glsl
    const updateVS = await createShader(gl, gl.VERTEX_SHADER, './shaders/update-shader.glsl');
    if (!updateVS) {
      throw new Error("Failed to create update vertex shader");
    }
    
    // Use a dummy fragment shader for transform feedback as no rendering is done in update program
    const updateFS = await createShader(gl, gl.FRAGMENT_SHADER, './shaders/update-fragment-shader.glsl');
    if (!updateFS) {
      throw new Error("Failed to create update fragment shader");
    }
    
    this.updateProgram = gl.createProgram();
    gl.attachShader(this.updateProgram, updateVS);
    gl.attachShader(this.updateProgram, updateFS);
    
    // Capture both output varyings into a single interleaved buffer.
    const feedbackVars = ["v_position", "v_velocity"];
    gl.transformFeedbackVaryings(this.updateProgram, feedbackVars, gl.INTERLEAVED_ATTRIBS);
    gl.linkProgram(this.updateProgram);
    
    if (!gl.getProgramParameter(this.updateProgram, gl.LINK_STATUS)) {
      const error = "Unable to link update program: " + gl.getProgramInfoLog(this.updateProgram);
      console.error(error);
      throw new Error(error);
    }
    
    // Get attribute and uniform locations
    this.upd_a_positionLoc = gl.getAttribLocation(this.updateProgram, "a_position");
    this.upd_a_velocityLoc = gl.getAttribLocation(this.updateProgram, "a_velocity");
    this.upd_u_dtLoc = gl.getUniformLocation(this.updateProgram, "u_dt");
    this.upd_u_gravityLoc = gl.getUniformLocation(this.updateProgram, "u_gravity");
    this.upd_u_positionsLoc = gl.getUniformLocation(this.updateProgram, "u_positions");
    this.upd_u_particleCountLoc = gl.getUniformLocation(this.updateProgram, "u_particleCount");
    this.upd_u_viscosityLoc = gl.getUniformLocation(this.updateProgram, "u_viscosity");
    this.upd_u_surfaceTensionLoc = gl.getUniformLocation(this.updateProgram, "u_surfaceTension");
    this.upd_u_resolutionLoc = gl.getUniformLocation(this.updateProgram, "u_resolution");
    
    // Grid-related uniform locations
    this.upd_u_gridLoc = gl.getUniformLocation(this.updateProgram, "u_grid");
    this.upd_u_gridCountLoc = gl.getUniformLocation(this.updateProgram, "u_gridCount");
    this.upd_u_gridSizeLoc = gl.getUniformLocation(this.updateProgram, "u_gridSize");
    this.upd_u_gridCellSizeLoc = gl.getUniformLocation(this.updateProgram, "u_gridCellSize");
    
    console.log("Update program setup complete");
  }

  async setupRenderProgram() {
    const gl = this.gl;
    
    const renderVS = await createShader(gl, gl.VERTEX_SHADER, './shaders/vertex-shader.glsl');
    if (!renderVS) {
      throw new Error("Failed to create render vertex shader");
    }
    
    const renderFS = await createShader(gl, gl.FRAGMENT_SHADER, './shaders/render-fragment-shader.glsl');
    if (!renderFS) {
      throw new Error("Failed to create render fragment shader");
    }
    
    this.renderProgram = createProgram(gl, renderVS, renderFS);
    if (!this.renderProgram) {
      throw new Error("Failed to create render program");
    }
    
    // Get attribute and uniform locations
    this.r_u_resolutionLoc = gl.getUniformLocation(this.renderProgram, "u_resolution");
    this.r_u_pointSizeLoc = gl.getUniformLocation(this.renderProgram, "u_pointSize");
    this.r_a_positionLoc = gl.getAttribLocation(this.renderProgram, "a_position");
    
    console.log("Render program setup complete");
  }

  async setupGridConstructionProgram() {
    const gl = this.gl;
    
    // Create shader for grid construction
    const gridVS = await createShader(gl, gl.VERTEX_SHADER, './shaders/grid-vertex.glsl');
    if (!gridVS) {
      throw new Error("Failed to create grid vertex shader");
    }
    
    const gridFS = await createShader(gl, gl.FRAGMENT_SHADER, './shaders/grid-fragment.glsl');
    if (!gridFS) {
      throw new Error("Failed to create grid fragment shader");
    }
    
    this.gridProgram = createProgram(gl, gridVS, gridFS);
    if (!this.gridProgram) {
      throw new Error("Failed to create grid construction program");
    }
    
    // Get locations
    this.grid_u_resolutionLoc = gl.getUniformLocation(this.gridProgram, "u_resolution");
    this.grid_u_gridSizeLoc = gl.getUniformLocation(this.gridProgram, "u_gridSize");
    this.grid_u_gridCellSizeLoc = gl.getUniformLocation(this.gridProgram, "u_gridCellSize");
    this.grid_a_positionLoc = gl.getAttribLocation(this.gridProgram, "a_position");
    
    // Create framebuffers for grid construction
    this.gridCountFramebuffer = gl.createFramebuffer();
    this.gridIndicesFramebuffer = gl.createFramebuffer();
    
    console.log("Grid construction program setup complete");
  }

  setupParticleBuffers() {
    const gl = this.gl;
    // Create two buffers for double buffering.
    this.buffers = [gl.createBuffer(), gl.createBuffer()];
    for (let i = 0; i < 2; i++) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[i]);
      // Allocate full buffer size using our CPU particleData.
      gl.bufferData(gl.ARRAY_BUFFER, this.particleData, gl.DYNAMIC_COPY);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    console.log("Particle buffers setup complete");
  }

  setupTransformFeedback() {
    const gl = this.gl;
    // Create two transform feedback objects, each attached to one buffer.
    this.transformFeedbacks = [gl.createTransformFeedback(), gl.createTransformFeedback()];
    for (let i = 0; i < 2; i++) {
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.transformFeedbacks[i]);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.buffers[i]);
    }
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    console.log("Transform feedback setup complete");
  }

  setupSpatialGrid() {
    const gl = this.gl;
    
    // Calculate grid dimensions based on canvas size
    this.gridWidth = Math.ceil(gl.canvas.width / this.gridCellSize);
    this.gridHeight = Math.ceil(gl.canvas.height / this.gridCellSize);
    const totalCells = this.gridWidth * this.gridHeight;
    
    // Create a texture to store particle counts per grid cell
    this.gridCountTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.gridCountTexture);
    gl.texImage2D(
        gl.TEXTURE_2D, 0,
        gl.R32I,  // Single integer component
        this.gridWidth, this.gridHeight, 0,
        gl.RED_INTEGER, gl.INT,
        null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    // Create a texture to store particle indices for each grid cell
    this.gridTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
    gl.texImage2D(
        gl.TEXTURE_2D, 0,
        gl.R32I,  // Single integer component
        this.gridWidth * 16, this.gridHeight, 0, // Allow up to 32 particles per cell
        gl.RED_INTEGER, gl.INT,
        null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    // Initialize grid cell data structure on CPU
    this.gridCells = new Array(totalCells).fill().map(() => ({ count: 0, particles: [] }));
    
    // Create framebuffer for grid updates
    this.gridFramebuffer = gl.createFramebuffer();
    
    console.log("Spatial grid setup complete");
  }

  updateSimulation() {
    if (this.activeParticleCount === 0) return;
        
    const gl = this.gl;
    
    // Only update spatial grid periodically to save CPU/GPU time
    if (this.frameSkip <= 0) {
      this.updateSpatialGrid();
      this.frameSkip = this.frameSkipMax;
    } else {
      this.frameSkip--;
    }
    
    const dt = this.dt / this.substeps;
    
    // Do multiple substeps for better stability
    for (let step = 0; step < this.substeps; step++) {
      // 2. Update the position texture from current buffer (but only active particles)
      const currentBuffer = this.swap ? this.buffers[1] : this.buffers[0];
      
      gl.bindBuffer(gl.ARRAY_BUFFER, currentBuffer);
      const data = new Float32Array(this.activeParticleCount * 4);
      gl.getBufferSubData(gl.ARRAY_BUFFER, 0, data, 0, this.activeParticleCount * 4);
      
      gl.bindTexture(gl.TEXTURE_2D, this.positionTexture);
      gl.texSubImage2D(
        gl.TEXTURE_2D, 0,
        0, 0, 
        this.activeParticleCount, 1,
        gl.RGBA, gl.FLOAT,
        data
      );
      
      // 3. Run the update shader with spatial optimization
      gl.useProgram(this.updateProgram);
      
      // Bind the position texture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.positionTexture);
      gl.uniform1i(this.upd_u_positionsLoc, 0);
      
      // Bind the grid textures
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
      gl.uniform1i(this.upd_u_gridLoc, 1);
      
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.gridCountTexture);
      gl.uniform1i(this.upd_u_gridCountLoc, 2);
      
      // Set uniforms
      gl.uniform1f(this.upd_u_dtLoc, dt);
      gl.uniform2fv(this.upd_u_gravityLoc, this.gravity);
      gl.uniform1i(this.upd_u_particleCountLoc, this.activeParticleCount);
      gl.uniform1f(this.upd_u_viscosityLoc, this.viscosity);
      gl.uniform1f(this.upd_u_surfaceTensionLoc, this.surfaceTension);
      gl.uniform2f(this.upd_u_resolutionLoc, gl.canvas.width, gl.canvas.height);
      gl.uniform2i(this.upd_u_gridSizeLoc, this.gridWidth, this.gridHeight);
      gl.uniform1f(this.upd_u_gridCellSizeLoc, this.gridCellSize);

      // Set up buffers
      const srcBuffer = this.swap ? this.buffers[1] : this.buffers[0];
      const dstTF = this.swap ? this.transformFeedbacks[0] : this.transformFeedbacks[1];

      gl.bindBuffer(gl.ARRAY_BUFFER, srcBuffer);
      gl.enableVertexAttribArray(this.upd_a_positionLoc);
      gl.vertexAttribPointer(this.upd_a_positionLoc, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(this.upd_a_velocityLoc);
      gl.vertexAttribPointer(this.upd_a_velocityLoc, 2, gl.FLOAT, false, 16, 8);

      // Unbind any transform feedback before binding a new one
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
      
      // Bind transform feedback before beginning
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, dstTF);
      gl.enable(gl.RASTERIZER_DISCARD);
      
      // Begin transform feedback after program is active
      gl.beginTransformFeedback(gl.POINTS);
      gl.drawArrays(gl.POINTS, 0, this.activeParticleCount);
      gl.endTransformFeedback();
      
      // Clean up state
      gl.disable(gl.RASTERIZER_DISCARD);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.useProgram(null);

      // Swap buffers for next frame
      this.swap = !this.swap;
    }
  }

  updateSpatialGrid() {
    const gl = this.gl;
    
    // Get current particle data without copying the entire buffer
    const currentBuffer = this.swap ? this.buffers[1] : this.buffers[0];
    
    // CPU implementation for grid construction
    // Clear grid quickly using typed arrays
    const gridCounts = new Int32Array(this.gridWidth * this.gridHeight);
    const gridIndices = new Int32Array(this.gridWidth * this.gridHeight * this.maxParticlesPerCell).fill(-1);
    
    // Read particle data once
    gl.bindBuffer(gl.ARRAY_BUFFER, currentBuffer);
    
    // Only read position data (half the buffer) to save memory bandwidth
    const posData = new Float32Array(this.activeParticleCount * 2);
    gl.getBufferSubData(gl.ARRAY_BUFFER, 0, posData, 0, this.activeParticleCount * 2);
    
    // Process particles in batches to avoid large allocations
    const batchSize = 1000;
    for (let start = 0; start < this.activeParticleCount; start += batchSize) {
      const end = Math.min(start + batchSize, this.activeParticleCount);
      
      for (let i = start; i < end; i++) {
        const idx = i * 2;
        const x = posData[idx];
        const y = posData[idx + 1];
        
        // Skip offscreen particles
        if (x < 0 || y < 0 || x >= gl.canvas.width || y >= gl.canvas.height) continue;
        
        // Calculate grid cell
        const cellX = Math.min(Math.floor(x / this.gridCellSize), this.gridWidth - 1);
        const cellY = Math.min(Math.floor(y / this.gridCellSize), this.gridHeight - 1);
        const cellIdx = cellY * this.gridWidth + cellX;
        
        // Add to grid if space available
        if (gridCounts[cellIdx] < this.maxParticlesPerCell) {
          // Store particle index in the proper cell
          const indexInCell = gridCounts[cellIdx];
          const gridOffset = (cellY * this.gridWidth + cellX) * this.maxParticlesPerCell + indexInCell;
          gridIndices[gridOffset] = i;
          gridCounts[cellIdx]++;
        }
      }
    }
    
    // Update grid textures in one go
    gl.bindTexture(gl.TEXTURE_2D, this.gridCountTexture);
    gl.texSubImage2D(
      gl.TEXTURE_2D, 0,
      0, 0,
      this.gridWidth, this.gridHeight,
      gl.RED_INTEGER, gl.INT,
      gridCounts
    );
    
    // For the grid texture, we need to reorganize how we store particles
    // The shader expects to find particles at (cellX * maxParticlesPerCell + index, cellY)
    const reorganizedIndices = new Int32Array(this.gridWidth * this.maxParticlesPerCell * this.gridHeight).fill(-1);
    
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const cellIdx = y * this.gridWidth + x;
        const count = gridCounts[cellIdx];
        
        for (let i = 0; i < count; i++) {
          const srcIdx = cellIdx * this.maxParticlesPerCell + i;
          const destX = x * this.maxParticlesPerCell + i;
          const destY = y;
          const destIdx = destY * (this.gridWidth * this.maxParticlesPerCell) + destX;
          
          reorganizedIndices[destIdx] = gridIndices[srcIdx];
        }
      }
    }
    
    gl.bindTexture(gl.TEXTURE_2D, this.gridTexture);
    gl.texSubImage2D(
      gl.TEXTURE_2D, 0,
      0, 0,
      this.gridWidth * this.maxParticlesPerCell, this.gridHeight,
      gl.RED_INTEGER, gl.INT,
      reorganizedIndices
    );
    
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  render() {
    const gl = this.gl;
    
    // Safety check - if anything isn't initialized yet, just return
    if (!gl || !this.buffers || !this.buffers[0]) {
      console.warn("FluidSimulation not fully initialized yet, skipping render");
      return;
    }
    
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Use the current particle buffer
    const bufferToRender = this.swap ? this.buffers[1] : this.buffers[0];
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferToRender);
    
    // Set up vertex attributes
    gl.enableVertexAttribArray(this.r_a_positionLoc);
    gl.vertexAttribPointer(this.r_a_positionLoc, 2, gl.FLOAT, false, 16, 0);
    
    // Update uniforms
    gl.uniform2f(this.r_u_resolutionLoc, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(this.r_u_pointSizeLoc, 15.0); // Reduced point size for better performance
    
    // Optimize blending for better performance
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    // Use instanced rendering if available for better performance
    gl.drawArrays(gl.POINTS, 0, this.activeParticleCount);
    
    gl.disable(gl.BLEND);
    
    // For debugging - render grid overlay
    if (this.debugMode && this.gridOverlayProgram) {
      this.renderGridOverlay();
    }

    // Add debug visualization
    this.renderDebugOverlay();
}

  animate() {
    const loop = () => {
      // Update simulation at full framerate
      this.updateSimulation();
      this.render();
      
      // Use rAF with timing for consistent framerate
      requestAnimationFrame(loop);
    };
    
    // Start animation loop
    requestAnimationFrame(loop);
  }

  // Resets the simulation to an empty state.
  resetSimulation() {
    this.activeParticleCount = 0;
    for (let i = 0; i < this.maxParticles * 4; i++) {
      this.particleData[i] = 0;
    }
    const gl = this.gl;
    
    // Unbind any transform feedback before updating buffers
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    
    for (let i = 0; i < 2; i++) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[i]);
      gl.bufferData(gl.ARRAY_BUFFER, this.particleData, gl.DYNAMIC_COPY);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  // Adds water particles near (x,y) in a circular area.
  addWaterParticles(x, y, count = 15) { // Increased default count
    const gl = this.gl;
    const oldActiveCount = this.activeParticleCount; // Save current count

    // Add new particles and update activeParticleCount.
    for (let i = 0; i < count; i++) {
      if (this.activeParticleCount >= this.maxParticles) break;
      
      // Use a more structured grid-like distribution with small random offsets
      // This helps particles stack better by starting with a more organized arrangement
      const particleRadius = 5.0; // Match PARTICLE_RADIUS in shader
      const spacing = particleRadius * 2.1; // Slightly more than diameter to prevent initial overlap
      
      const gridSize = Math.ceil(Math.sqrt(count));
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      
      // Calculate grid position with small random offset (less randomness than before)
      const offsetX = (col - gridSize/2) * spacing + (Math.random() - 0.5) * 2;
      const offsetY = (row - gridSize/2) * spacing + (Math.random() - 0.5) * 2;
      
      const posX = x + offsetX;
      const posY = y + offsetY;
      
      // Add very slight initial velocity for better mixing
      // But keep it smaller to prevent too much initial movement
      const velX = (Math.random() - 0.5) * 5;
      const velY = (Math.random() - 0.5) * 5;
      
      const index = this.activeParticleCount * 4;
      this.particleData.set([posX, posY, velX, velY], index);
      this.activeParticleCount++;
    }

    // Calculate the byte offset and subarray for only the new particles.
    const byteOffset = oldActiveCount * 4 * Float32Array.BYTES_PER_ELEMENT;
    const newData = this.particleData.subarray(oldActiveCount * 4, this.activeParticleCount * 4);

    // Unbind any transform feedback before updating buffers
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    
    // Update the GPU buffers only for the new particle data.
    for (let i = 0; i < 2; i++) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[i]);
      gl.bufferSubData(gl.ARRAY_BUFFER, byteOffset, newData);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // Optionally update the displayed particle count in the UI.
    const countElem = document.getElementById('particleCount');
    if (countElem) {
      countElem.innerText = this.activeParticleCount;
    }
  }


  // Erases (removes) particles within a given radius by moving them offscreen.
  eraseWater(x, y, radius = 50) {
    const gl = this.gl;
    let i = 0;
    let modifiedCount = 0;
    let modifiedIndices = [];
    
    while (i < this.activeParticleCount) {
      const idx = i * 4;
      const posX = this.particleData[idx];
      const posY = this.particleData[idx + 1];
      const dx = posX - x;
      const dy = posY - y;
      
      if (dx * dx + dy * dy < radius * radius) {
        // Swap with the last active particle
        const lastIdx = (this.activeParticleCount - 1) * 4;
        
        if (i !== this.activeParticleCount - 1) {
          this.particleData[idx] = this.particleData[lastIdx];
          this.particleData[idx + 1] = this.particleData[lastIdx + 1];
          this.particleData[idx + 2] = this.particleData[lastIdx + 2];
          this.particleData[idx + 3] = this.particleData[lastIdx + 3];
          
          modifiedIndices.push(i);
        }
        
        this.activeParticleCount--;
        modifiedCount++;
      } else {
        i++;
      }
    }
    
    // If nothing was removed, exit early
    if (modifiedCount === 0) return;
    
    // Unbind transform feedback
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    
    // Only update the necessary parts of the buffer
    if (modifiedIndices.length > 0) {
      for (let i = 0; i < 2; i++) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[i]);
        
        // If more than 25% of particles were modified, update the whole buffer
        if (modifiedCount > this.activeParticleCount * 0.25) {
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, 
            this.particleData.subarray(0, this.activeParticleCount * 4));
        } else {
          // Otherwise, update only the modified indices
          for (const index of modifiedIndices) {
            const offset = index * 4 * Float32Array.BYTES_PER_ELEMENT;
            gl.bufferSubData(gl.ARRAY_BUFFER, offset,
              this.particleData.subarray(index * 4, index * 4 + 4));
          }
        }
      }
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    
    // Update the displayed particle count in the UI
    const countElem = document.getElementById('particleCount');
    if (countElem) {
      countElem.innerText = this.activeParticleCount;
    }
}

  getParticleCount() {
    return this.activeParticleCount;
  }
  
  // Methods to update simulation parameters
  setViscosity(value) {
    this.viscosity = value;
    console.log(`Viscosity set to: ${value}`);
    
    // Update the uniform in the shader
    const gl = this.gl;
    gl.useProgram(this.updateProgram);
    gl.uniform1f(this.upd_u_viscosityLoc, value * 50000); // Add the multiplier back here
    gl.useProgram(null);
  }
  
  setSurfaceTension(value) {
    this.surfaceTension = value;
    console.log(`Surface tension set to: ${value}`);
    
    // Update the uniform in the shader
    const gl = this.gl;
    gl.useProgram(this.updateProgram);
    gl.uniform1f(this.upd_u_surfaceTensionLoc, value);
    gl.useProgram(null);
  }

  // Add this method to your FluidSimulation class

  renderDebugOverlay() {
    // Get overlay canvas and context
    const overlayCanvas = document.getElementById('overlayCanvas');
    const ctx = overlayCanvas.getContext('2d');
    
    // Clear previous frame
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // Use the current particle buffer (based on swap flag)
    const currentBuffer = this.swap ? this.buffers[1] : this.buffers[0];
    
    // Get latest particle data including debug force values
    const debugData = new Float32Array(this.activeParticleCount * 5); // Allocate only what we need
    
    // Read from the current particle buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, currentBuffer);
    this.gl.getBufferSubData(this.gl.ARRAY_BUFFER, 0, debugData, 0, this.activeParticleCount * 5);
    
    // Draw force indicators for each particle
    ctx.lineWidth = 2;
    for (let i = 0; i < this.activeParticleCount; i++) {
      const baseIndex = i * 5; // 5 values per particle (x, y, vx, vy, forceMag)
      const x = debugData[baseIndex];
      const y = debugData[baseIndex + 1];
      const forceMag = debugData[baseIndex + 4]; // The debug force magnitude
      
      // Color-code based on force magnitude
      const intensity = Math.min(forceMag / 50.0, 1.0); // Normalize (adjust 50.0 as needed)
      
      // Use a color scale: green (low force) to red (high force)
      ctx.fillStyle = `rgb(${intensity * 255}, ${(1-intensity) * 255}, 0)`;
      
      // Draw circle at particle position
      ctx.beginPath();
      ctx.arc(x, overlayCanvas.height - y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Method to expose the current buffer and rendering data to external renderers
  getParticleRenderData() {
    // Check if buffers are initialized
    if (!this.buffers || !this.buffers[0]) {
      console.warn("Buffers not initialized yet");
      return null;
    }
    
    return {
      buffer: this.swap ? this.buffers[1] : this.buffers[0],
      count: this.activeParticleCount,
      positionAttribLocation: this.r_a_positionLoc,
      stride: 16,
      offset: 0,
      gl: this.gl
    };
  }
}

console.log("FluidSimulation.js loaded");

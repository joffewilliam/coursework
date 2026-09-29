import { createShader, createProgram } from './ShaderUtils.js';

export class FluidRenderer {
  constructor(gl, simulation) {
    this.gl = gl;
    this.simulation = simulation;
    this.initialized = false;
    
    // Initialize async
    this.init().catch(err => {
      console.error("Failed to initialize fluid renderer:", err);
    });
  }
  
  async init() {
    try {
      await this.setupRenderTargets();
      await this.setupShaders();
      this.createFullscreenQuad();
      this.initialized = true;
      console.log("Fluid renderer initialized successfully");
    } catch (error) {
      console.error("Error initializing fluid renderer:", error);
    }
  }
  
  async setupRenderTargets() {
    const gl = this.gl;
    const width = gl.canvas.width;
    const height = gl.canvas.height;
    
    try {
      // Enable required extension for floating-point textures
      const ext = gl.getExtension('EXT_color_buffer_float');
      if (!ext) {
        throw new Error("EXT_color_buffer_float extension not supported");
      }
      
      // 1. Depth/thickness texture
      this.depthFramebuffer = gl.createFramebuffer();
      this.depthTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
      // Change internal format from RGBA to RGBA32F
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.depthFramebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.depthTexture, 0);
      
      // Check framebuffer status
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error("Depth framebuffer is incomplete");
      }
      
      // 2. Normal texture - same change here
      this.normalFramebuffer = gl.createFramebuffer();
      this.normalTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.normalTexture);
      // Change internal format from RGBA to RGBA32F
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.normalFramebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.normalTexture, 0);
      
      // Check framebuffer status
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error("Normal framebuffer is incomplete");
      }
      
      // Reset state
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindTexture(gl.TEXTURE_2D, null);
    } catch (error) {
      console.error("Error setting up render targets:", error);
      throw error;
    }
  }
  
  createFullscreenQuad() {
    const gl = this.gl;
    
    // Create a full-screen quad for post-processing passes
    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      1, 1
    ]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
  
  async setupShaders() {
    try {
      const gl = this.gl;
      
      // Debug log to check loading
      console.log("Loading fluid renderer shaders...");
      
      // 1. Depth pass shader
      const depthVS = await createShader(gl, gl.VERTEX_SHADER, './shaders/fluid-depth-vertex.glsl');
      if (!depthVS) throw new Error("Failed to create depth vertex shader");
      
      const depthFS = await createShader(gl, gl.FRAGMENT_SHADER, './shaders/fluid-depth-fragment.glsl');
      if (!depthFS) throw new Error("Failed to create depth fragment shader");
      
      this.depthShaderProgram = createProgram(gl, depthVS, depthFS);
      if (!this.depthShaderProgram) throw new Error("Failed to create depth shader program");
      
      // Get depth shader locations
      this.depth_a_positionLoc = gl.getAttribLocation(this.depthShaderProgram, "a_position");
      this.depth_u_projectionLoc = gl.getUniformLocation(this.depthShaderProgram, "u_projection");
      this.depth_u_pointSizeLoc = gl.getUniformLocation(this.depthShaderProgram, "u_pointSize");
      
      // 2. Normal calculation shader
      const normalVS = await createShader(gl, gl.VERTEX_SHADER, './shaders/fluid-normal-vertex.glsl');
      if (!normalVS) throw new Error("Failed to create normal vertex shader");
      
      const normalFS = await createShader(gl, gl.FRAGMENT_SHADER, './shaders/fluid-normal-fragment.glsl');
      if (!normalFS) throw new Error("Failed to create normal fragment shader");
      
      this.normalShaderProgram = createProgram(gl, normalVS, normalFS);
      if (!this.normalShaderProgram) throw new Error("Failed to create normal shader program");
      
      // Get normal shader locations
      this.normal_a_positionLoc = gl.getAttribLocation(this.normalShaderProgram, "a_position");
      this.normal_u_depthTextureLoc = gl.getUniformLocation(this.normalShaderProgram, "u_depthTexture");
      this.normal_u_texelSizeLoc = gl.getUniformLocation(this.normalShaderProgram, "u_texelSize");
      this.normal_u_normalStrengthLoc = gl.getUniformLocation(this.normalShaderProgram, "u_normalStrength");
      
      // 3. Final composite shader
      const compositeVS = await createShader(gl, gl.VERTEX_SHADER, './shaders/fluid-composite-vertex.glsl');
      if (!compositeVS) throw new Error("Failed to create composite vertex shader");
      
      const compositeFS = await createShader(gl, gl.FRAGMENT_SHADER, './shaders/fluid-composite-fragment.glsl');
      if (!compositeFS) throw new Error("Failed to create composite fragment shader");
      
      this.compositeShaderProgram = createProgram(gl, compositeVS, compositeFS);
      if (!this.compositeShaderProgram) throw new Error("Failed to create composite shader program");
      
      // Get composite shader locations
      this.composite_a_positionLoc = gl.getAttribLocation(this.compositeShaderProgram, "a_position");
      this.composite_u_depthTextureLoc = gl.getUniformLocation(this.compositeShaderProgram, "u_depthTexture");
      this.composite_u_normalTextureLoc = gl.getUniformLocation(this.compositeShaderProgram, "u_normalTexture");
      this.composite_u_texelSizeLoc = gl.getUniformLocation(this.compositeShaderProgram, "u_texelSize");
      this.composite_u_lightDirLoc = gl.getUniformLocation(this.compositeShaderProgram, "u_lightDir");
      this.composite_u_waterColorLoc = gl.getUniformLocation(this.compositeShaderProgram, "u_waterColor");
      this.composite_u_viewPositionLoc = gl.getUniformLocation(this.compositeShaderProgram, "u_viewPosition");
      
      console.log("Fluid renderer shaders loaded successfully");
      return true;
    } catch (error) {
      console.error("Error setting up shaders:", error);
      return false;
    }
  }
  
  render() {
    // If not fully initialized, fall back to standard rendering
    if (!this.initialized) {
      console.log("Fluid renderer not initialized, using fallback");
      this.simulation.render();
      return;
    }
    
    try {
      // Check if the simulation has initialized its buffers yet
      const renderData = this.simulation.getParticleRenderData();
      if (!renderData || !renderData.buffer) {
        this.simulation.render();
        return;
      }
      
      // Multi-pass rendering
      this.renderParticleDepth(renderData);
      this.calculateSurfaceNormals();
      this.renderFinalComposite();
    } catch (err) {
      console.error("Error during fluid rendering:", err);
      this.simulation.render();
    }
  }
  
  renderParticleDepth(renderData) {
    const gl = this.gl;
    
    // Bind to depth framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.depthFramebuffer);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Use particle depth shader
    gl.useProgram(this.depthShaderProgram);
    
    // Set uniforms
    const projectionMatrix = [
      2/gl.canvas.width, 0, 0, 0,
      0, 2/gl.canvas.height, 0, 0,
      0, 0, 1, 0,
      -1, -1, 0, 1
    ];
    gl.uniformMatrix4fv(this.depth_u_projectionLoc, false, projectionMatrix);
    gl.uniform1f(this.depth_u_pointSizeLoc, 20.0);
    
    // Draw particles with additive blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, renderData.buffer);
    gl.enableVertexAttribArray(this.depth_a_positionLoc);
    gl.vertexAttribPointer(this.depth_a_positionLoc, 2, gl.FLOAT, false, renderData.stride, renderData.offset);
    gl.drawArrays(gl.POINTS, 0, renderData.count);
    
    // Clean up
    gl.disableVertexAttribArray(this.depth_a_positionLoc);
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  
  calculateSurfaceNormals() {
    const gl = this.gl;
    
    // Bind to normal framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.normalFramebuffer);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.5, 0.5, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Use normal calculation shader
    gl.useProgram(this.normalShaderProgram);
    
    // Set uniforms
    gl.uniform2f(this.normal_u_texelSizeLoc, 1.0/gl.canvas.width, 1.0/gl.canvas.height);
    gl.uniform1f(this.normal_u_normalStrengthLoc, 2.0);
    
    // Bind depth texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
    gl.uniform1i(this.normal_u_depthTextureLoc, 0);
    
    // Draw a full-screen quad
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(this.normal_a_positionLoc);
    gl.vertexAttribPointer(this.normal_a_positionLoc, 2, gl.FLOAT, false, 0, 0);
    
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    // Clean up
    gl.disableVertexAttribArray(this.normal_a_positionLoc);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  
  renderFinalComposite() {
    const gl = this.gl;
    
    // Render to screen
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Use composite shader
    gl.useProgram(this.compositeShaderProgram);
    
    // Set uniforms
    gl.uniform2f(this.composite_u_texelSizeLoc, 1.0/gl.canvas.width, 1.0/gl.canvas.height);
    gl.uniform3f(this.composite_u_lightDirLoc, 0.5, 0.8, -0.2);
    gl.uniform4f(this.composite_u_waterColorLoc, 0.2, 0.6, 1.0, 0.9);
    gl.uniform3f(this.composite_u_viewPositionLoc, 0.5, 0.5, 1.0);
    
    // Bind textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
    gl.uniform1i(this.composite_u_depthTextureLoc, 0);
    
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.normalTexture);
    gl.uniform1i(this.composite_u_normalTextureLoc, 1);
    
    // Enable blending for transparent water
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    // Draw a full-screen quad
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(this.composite_a_positionLoc);
    gl.vertexAttribPointer(this.composite_a_positionLoc, 2, gl.FLOAT, false, 0, 0);
    
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    // Clean up
    gl.disableVertexAttribArray(this.composite_a_positionLoc);
    gl.disable(gl.BLEND);
  }
}
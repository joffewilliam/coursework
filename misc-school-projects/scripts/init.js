import { FluidSimulation } from './FluidSimulation.js';
import { FluidRenderer } from './FluidRenderer.js';
import { UIControls, setupLaunchButton, setupFeatureInteractions } from './UIControls.js';

// Get the WebGL canvas
const canvas = document.getElementById('webglCanvas');
const fluidSimulation = new FluidSimulation(canvas);

// Create the fluid renderer using the same GL context
const fluidRenderer = new FluidRenderer(fluidSimulation.gl, fluidSimulation);

// Initialize UI controls
new UIControls(fluidSimulation, canvas);

// Override the animation loop to use the fluid renderer
fluidSimulation.animate = function() {
  const loop = () => {
    // Update simulation physics
    this.updateSimulation();
    
    // Instead of particle rendering, use the fluid renderer
    fluidRenderer.render();
    
    // Continue animation loop
    requestAnimationFrame(loop);
  };
  
  // Start animation loop
  requestAnimationFrame(loop);
};

// Start the animation
fluidSimulation.animate();

document.addEventListener('DOMContentLoaded', () => {
  setupLaunchButton();
  setupFeatureInteractions();
  // ...your other initialization code
});

import { InteractionManager } from './InteractionManager.js';

export class UIControls {
  constructor(simulation, canvas) {
    this.simulation = simulation;
    // Create a new InteractionManager instance
    this.interactionManager = new InteractionManager(canvas, simulation);
    this.bindUI();
    this.setupSliders();
    this.initParticleCountSlider();
  }

  bindUI() {
    document.getElementById('waterToolBtn').addEventListener('click', () => {
      this.interactionManager.setTool('water');
    });

    document.getElementById('eraseWaterBtn').addEventListener('click', () => {
      this.interactionManager.setTool('eraseWater');
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
      this.simulation.resetSimulation();
    });
    
    // Set up brush size control
    const brushSizeSlider = document.getElementById('brushSize');
    if (brushSizeSlider) {
      brushSizeSlider.addEventListener('input', (e) => {
        this.interactionManager.setBrushSize(parseInt(e.target.value));
      });
      // Initialize with default value
      this.interactionManager.setBrushSize(parseInt(brushSizeSlider.value));
    }
  }
  
  setupSliders() {
    // Viscosity slider
    const viscositySlider = document.getElementById('viscosity');
    const viscosityValue = document.getElementById('viscosityValue');
    
    if (viscositySlider && viscosityValue) {
      viscositySlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        viscosityValue.textContent = value.toFixed(3);
        
        // Update the simulation's viscosity parameter directly
        // Note: The scaling is handled in FluidSimulation.js
        if (this.simulation.setViscosity) {
          this.simulation.setViscosity(value);
        }
      });
    }
    
    // Surface tension slider
    const surfaceTensionSlider = document.getElementById('surfaceTension');
    const surfaceTensionValue = document.getElementById('surfaceTensionValue');
    
    if (surfaceTensionSlider && surfaceTensionValue) {
      surfaceTensionSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        surfaceTensionValue.textContent = value.toFixed(4);
        
        // Update the simulation's surface tension parameter directly
        if (this.simulation.setSurfaceTension) {
          this.simulation.setSurfaceTension(value);
        }
      });
    }
  }

  initParticleCountSlider() {
    const slider = document.getElementById('particleCountSlider');
    const valueDisplay = document.getElementById('particleCountValue');
    
    if (slider && valueDisplay) {
      // Set initial value
      valueDisplay.textContent = slider.value;
      this.interactionManager.setParticleCount(parseInt(slider.value));
      
      // Update when slider changes
      slider.addEventListener('input', () => {
        const count = parseInt(slider.value);
        valueDisplay.textContent = count;
        this.interactionManager.setParticleCount(count);
      });
    }
  }
}

// Add to your existing UIControls.js or create this function

export function setupLaunchButton() {
  const launchButton = document.getElementById('launchButton');
  const simulationSection = document.getElementById('simulation');
  
  launchButton.addEventListener('click', function(e) {
    e.preventDefault();
    
    // Add active class to begin animation
    simulationSection.classList.add('active');
    
    // Smooth scroll to the simulation section
    simulationSection.scrollIntoView({ 
      behavior: 'smooth' 
    });
    
    // Initialize the simulation once it becomes visible
    setTimeout(() => {
      // If you have an initialization function for the simulation, call it here
      // This ensures WebGL context is created after the element is visible
      if (window.initSimulation) {
        window.initSimulation();
      }
    }, 800); // Wait for animation to progress before initializing
  });
}

export function setupFeatureInteractions() {
  const featureCards = document.querySelectorAll('.feature-card');
  const featureContentSections = document.querySelectorAll('.feature-content-section');
  const launchButton = document.getElementById('launchButton');
  const simulationSection = document.getElementById('simulation');
  
  // Make feature cards clickable
  featureCards.forEach(card => {
    card.addEventListener('click', function() {
      const feature = this.getAttribute('data-feature');
      const contentSection = document.getElementById(`content-${feature}`);
      
      // Hide simulation if it's active
      simulationSection.classList.remove('active');
      
      // Hide all feature content sections
      featureContentSections.forEach(section => {
        section.classList.remove('active');
      });
      
      // Show selected feature content section
      setTimeout(() => {
        contentSection.classList.add('active');
      }, 300); // Small delay for better transition
      
      // Scroll to content
      contentSection.scrollIntoView({ behavior: 'smooth' });
    });
  });
  
  // Launch simulation button
  launchButton.addEventListener('click', function(e) {
    e.preventDefault();
    
    // Hide any active feature content sections
    featureContentSections.forEach(section => {
      section.classList.remove('active');
    });
    
    // Show simulation section
    setTimeout(() => {
      simulationSection.classList.add('active');
    }, 300);
    
    // Scroll to the simulation section
    simulationSection.scrollIntoView({ 
      behavior: 'smooth' 
    });
    
    // Initialize the simulation once it becomes visible
    setTimeout(() => {
      if (window.initSimulation) {
        window.initSimulation();
      }
    }, 800);
  });
}

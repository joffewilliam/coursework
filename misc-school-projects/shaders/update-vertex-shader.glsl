#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_velocity;
uniform float u_dt;
uniform vec2 u_gravity;
uniform sampler2D u_positions;
uniform int u_particleCount;
uniform float u_viscosity;
uniform float u_surfaceTension;
out vec2 v_position;
out vec2 v_velocity;

void main() {
    v_position = a_position;
    v_velocity = a_velocity;
}

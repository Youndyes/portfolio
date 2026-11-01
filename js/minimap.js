import { ISLAND, ROADS } from './world.js';

// Mini-carte tournée à 45° pour correspondre à la vue isométrique
export class Minimap {
  constructor(canvas, zones) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.zones = zones;
    this.size = canvas.width;
    this.k = (this.size / (2 * ISLAND * Math.SQRT2)) * 0.96;
    this.staticLayer = document.createElement('canvas');
    this.staticLayer.width = this.staticLayer.height = this.size;
    this.drawStatic();
  }

  applyTransform(ctx) {
    const a = this.k / Math.SQRT2, h = this.size / 2;
    // (x, z) → ((x - z)/√2, (x + z)/√2)
    ctx.setTransform(a, a, -a, a, h, h);
  }

  drawStatic() {
    const ctx = this.staticLayer.getContext('2d');
    this.applyTransform(ctx);
    ctx.fillStyle = '#e6d295';
    ctx.fillRect(-ISLAND, -ISLAND, ISLAND * 2, ISLAND * 2);
    ctx.fillStyle = '#6fb84f';
    ctx.fillRect(-ISLAND + 2, -ISLAND + 2, ISLAND * 2 - 4, ISLAND * 2 - 4);
    ctx.fillStyle = '#3c404c';
    for (const [x0, x1, z0, z1] of ROADS) ctx.fillRect(x0, z0, x1 - x0, z1 - z0);
    for (const z of this.zones) {
      ctx.fillStyle = '#20243a';
      ctx.fillRect(z.building.x - 3, z.building.z - 3, 6, 6);
      ctx.fillStyle = z.color;
      ctx.fillRect(z.building.x - 2, z.building.z - 2, 4, 4);
    }
  }

  draw(car, active, t) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.size, this.size);
    ctx.drawImage(this.staticLayer, 0, 0);
    this.applyTransform(ctx);
    for (const z of this.zones) {
      const on = z === active || Math.sin(t * 4) > 0;
      ctx.fillStyle = on ? z.color : '#ffffff';
      ctx.fillRect(z.pad.x - 1.6, z.pad.z - 1.6, 3.2, 3.2);
    }
    // voiture
    ctx.save();
    ctx.translate(car.pos.x, car.pos.y);
    ctx.rotate(-car.angle);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2.2, -2.2, 4.4, 4.4);
    ctx.fillStyle = '#e8434b';
    ctx.beginPath();
    ctx.moveTo(0, 3.2);
    ctx.lineTo(1.9, -1.8);
    ctx.lineTo(-1.9, -1.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

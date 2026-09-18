// Lightweight canvas confetti — no external assets, pure generated shapes.
(function(){
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let rafId = null;

  function resize(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const COLORS = ['#ff6fa5','#8c6bff','#3fb6ff','#3ed598','#ffce45','#ff9f45'];

  function makeParticle(originX, originY){
    return {
      x: originX,
      y: originY,
      vx: (Math.random()-0.5)*10,
      vy: -(Math.random()*9 + 6),
      size: Math.random()*8+6,
      color: COLORS[Math.floor(Math.random()*COLORS.length)],
      rot: Math.random()*Math.PI*2,
      vrot: (Math.random()-0.5)*0.3,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
      life: 0,
      maxLife: 90 + Math.random()*40
    };
  }

  function burst(x, y, count){
    count = count || 60;
    x = x === undefined ? canvas.width/2 : x;
    y = y === undefined ? canvas.height/2 : y;
    for(let i=0;i<count;i++){
      particles.push(makeParticle(x,y));
    }
    if(!rafId){ loop(); }
  }

  function fullCelebration(){
    burst(canvas.width*0.2, canvas.height*0.3, 45);
    burst(canvas.width*0.8, canvas.height*0.3, 45);
    burst(canvas.width*0.5, canvas.height*0.15, 45);
  }

  function loop(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(p=>{
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.28; // gravity
      p.rot += p.vrot;
      const alpha = Math.max(0, 1 - p.life/p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if(p.shape === 'rect'){
        ctx.fillRect(-p.size/2, -p.size/4, p.size, p.size/2);
      } else {
        ctx.beginPath();
        ctx.arc(0,0,p.size/2,0,Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    });
    particles = particles.filter(p => p.life < p.maxLife);
    if(particles.length > 0){
      rafId = requestAnimationFrame(loop);
    } else {
      rafId = null;
      ctx.clearRect(0,0,canvas.width,canvas.height);
    }
  }

  window.Confetti = { burst, fullCelebration };
})();

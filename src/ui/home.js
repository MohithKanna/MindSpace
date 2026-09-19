const phrases = [
    "Write what comes to mind.",
    "A quieter place to think.",
    "Turn thoughts into something real.",
    "Make space for your ideas.",
    "One thought at a time.",
    "Start with a blank block.",
    "Capture the thought before it fades.",
    "Shape ideas as you go.",
    "Keep your thoughts together.",
    "Give your ideas room to grow.",
];
const target = document.getElementById("typewriter-text");
const canvas = document.getElementById("dust-canvas");

if (canvas && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const context = canvas.getContext("2d");
    const cursor = { x: -1000, y: -1000, active: false };
    let particles = [];
    let width = 0;
    let height = 0;

    const createParticle = () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.15 + 0.3,
        phase: Math.random() * Math.PI * 2,
    });

    const resize = () => {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        particles = Array.from(
            {
                length: 200,
            },
            createParticle,
        );
    };

    const animateDust = (time) => {
        context.clearRect(0, 0, width, height);
        context.fillStyle = getComputedStyle(document.documentElement)
            .getPropertyValue("--accent")
            .trim();

        particles.forEach((particle) => {
            particle.vx += Math.sin(time / 2200 + particle.phase) * 0.003;
            particle.vy += Math.cos(time / 2600 + particle.phase) * 0.003;
            const dx = cursor.x - particle.x;
            const dy = cursor.y - particle.y;
            const distance = Math.hypot(dx, dy);

            if (cursor.active && distance > 1 && distance < 190) {
                const repel = (1 - distance / 190) * 0.022;
                particle.vx -= (dx / distance) * repel;
                particle.vy -= (dy / distance) * repel;
            }

            particle.vx *= 0.985;
            particle.vy *= 0.985;
            particle.x += particle.vx;
            particle.y += particle.vy;

            if (particle.x < -8) particle.x = width + 8;
            if (particle.x > width + 8) particle.x = -8;
            if (particle.y < -8) particle.y = height + 8;
            if (particle.y > height + 8) particle.y = -8;

            context.globalAlpha = 0.6;
            context.beginPath();
            context.arc(
                particle.x,
                particle.y,
                particle.radius,
                0,
                Math.PI * 2,
            );
            context.fill();
        });
        context.globalAlpha = 1;
        requestAnimationFrame(animateDust);
    };

    window.addEventListener("pointermove", (event) => {
        cursor.x = event.clientX;
        cursor.y = event.clientY;
        cursor.active = true;
    });
    window.addEventListener("pointerleave", () => {
        cursor.active = false;
    });
    window.addEventListener("resize", resize);
    resize();
    requestAnimationFrame(animateDust);
}

if (target && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    target.textContent = phrases[0];
} else if (target) {
    let phraseIndex = 0;
    let character = 0;
    let deleting = false;
    const type = () => {
        const phrase = phrases[phraseIndex];
        character += deleting ? -1 : 1;
        target.textContent = phrase.slice(0, character);
        let delay = deleting ? 32 : 58;
        if (!deleting && character === phrase.length) {
            deleting = true;
            delay = 1400;
        } else if (deleting && character === 0) {
            deleting = false;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            delay = 240;
        }
        window.setTimeout(type, delay);
    };
    type();
}

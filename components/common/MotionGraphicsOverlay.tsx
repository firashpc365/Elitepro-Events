
// components/common/MotionGraphicsOverlay.tsx
import React, { useEffect, useRef, useMemo } from 'react';
import type { AppSettings } from '../../types';

interface MotionGraphicsOverlayProps {
    type?: 'particle-flow' | 'light-flares' | 'abstract-lines' | 'golden-sparkles';
    color?: string;
    opacity?: number;
    config?: AppSettings['motion'];
}

export const MotionGraphicsOverlay: React.FC<MotionGraphicsOverlayProps> = ({ type, color, opacity, config }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<any[]>([]);
    const animationFrameRef = useRef<number>();
    const mouseRef = useRef({ x: -1000, y: -1000 });

    // Memoize settings to prevent effect re-runs on referential equality changes
    const settings = useMemo(() => ({
        style: config?.particleStyle || type || 'particle-flow',
        count: config?.particleCount ?? 60,
        speed: config?.particleSpeed ?? 0.5,
        baseOpacity: config?.particleOpacity ?? opacity ?? 0.3,
        baseColor: color || '#0891b2',
        direction: config?.particleDirection || 'random',
        shape: config?.particleShape || 'circle',
        sensitivity: config?.motionSensitivity ?? 2,
        responsiveSensitivity: config?.responsiveSensitivity ?? 5,
        enableOverlap: config?.enableOverlap ?? false,
        overlayMode: config?.overlayMode ?? false,
    }), [
        config?.particleStyle, type, 
        config?.particleCount, 
        config?.particleSpeed, 
        config?.particleOpacity, opacity, 
        color, 
        config?.particleDirection, 
        config?.particleShape, 
        config?.motionSensitivity, 
        config?.responsiveSensitivity, 
        config?.enableOverlap, 
        config?.overlayMode
    ]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const updateSize = () => {
            // Use offsetWidth/Height to match parent container if absolute
            canvas.width = canvas.offsetWidth || window.innerWidth;
            canvas.height = canvas.offsetHeight || window.innerHeight;
            
            // Only re-init if particles array is empty to prevent resetting on simple resizes/renders if not needed
            // But here we probably want to re-distribute on resize. 
            // To avoid flickering on re-renders that don't change settings, we rely on useEffect dependency stability.
            initParticles(); 
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseRef.current.x = e.clientX - rect.left;
            mouseRef.current.y = e.clientY - rect.top;
        };

        const initParticles = () => {
            const particles: any[] = [];
            // Responsiveness: Adjust count based on width and sensitivity
            const responsiveFactor = (canvas.width / 1000) * (settings.responsiveSensitivity / 5); 
            const count = Math.floor(settings.count * Math.max(0.5, responsiveFactor));

            for (let i = 0; i < count; i++) {
                const size = Math.random() * 2 + 1;
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * settings.speed,
                    vy: (Math.random() - 0.5) * settings.speed,
                    radius: size,
                    originalRadius: size,
                    alpha: Math.random(),
                    targetAlpha: Math.random(),
                    speed: Math.random() * 0.01 + 0.005,
                    angle: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() - 0.5) * 0.05
                });
            }
            particlesRef.current = particles;
        };

        const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
            let rot = Math.PI / 2 * 3;
            let x = cx;
            let y = cy;
            let step = Math.PI / spikes;
            ctx.beginPath();
            ctx.moveTo(cx, cy - outerRadius);
            for (let i = 0; i < spikes; i++) {
                x = cx + Math.cos(rot) * outerRadius;
                y = cy + Math.sin(rot) * outerRadius;
                ctx.lineTo(x, y);
                rot += step;
                x = cx + Math.cos(rot) * innerRadius;
                y = cy + Math.sin(rot) * innerRadius;
                ctx.lineTo(x, y);
                rot += step;
            }
            ctx.lineTo(cx, cy - outerRadius);
            ctx.closePath();
            ctx.fill();
        };

        const draw = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (settings.style === 'golden-sparkles' || settings.enableOverlap) {
                ctx.globalCompositeOperation = 'lighter';
            } else {
                ctx.globalCompositeOperation = 'source-over';
            }

            const particles = particlesRef.current;
            const mouse = mouseRef.current;

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];

                p.alpha += p.speed;
                if (p.alpha > 1 || p.alpha < 0) p.speed = -p.speed;
                const currentAlpha = Math.max(0, Math.min(1, p.alpha)) * settings.baseOpacity;

                if (settings.style === 'golden-sparkles') {
                    const hue = 40 + Math.random() * 20;
                    ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${currentAlpha})`;
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = `hsla(${hue}, 100%, 50%, ${currentAlpha})`;
                } else {
                    ctx.fillStyle = settings.baseColor;
                    ctx.globalAlpha = currentAlpha;
                    ctx.shadowBlur = 0;
                }

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.angle);
                
                if (settings.shape === 'square') {
                    ctx.beginPath();
                    ctx.rect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
                    ctx.fill();
                } else if (settings.shape === 'star') {
                    drawStar(ctx, 0, 0, 4, p.radius * 2, p.radius);
                } else {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
                
                p.angle += p.rotSpeed;

                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const interactionRadius = 100 * (settings.sensitivity / 2);

                if (distance < interactionRadius && settings.sensitivity > 0) {
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const force = (interactionRadius - distance) / interactionRadius;
                    const dirX = forceDirectionX * force * settings.sensitivity;
                    const dirY = forceDirectionY * force * settings.sensitivity;
                    p.x -= dirX;
                    p.y -= dirY;
                }

                let moveX = p.vx;
                let moveY = p.vy;

                if (settings.direction === 'up') { moveY = -Math.abs(p.vy) - 0.2; moveX = p.vx * 0.2; }
                else if (settings.direction === 'down') { moveY = Math.abs(p.vy) + 0.2; moveX = p.vx * 0.2; }
                else if (settings.direction === 'left') { moveX = -Math.abs(p.vx) - 0.2; moveY = p.vy * 0.2; }
                else if (settings.direction === 'right') { moveX = Math.abs(p.vx) + 0.2; moveY = p.vy * 0.2; }

                p.x += moveX;
                p.y += moveY;

                if (p.x < -50) p.x = canvas.width + 50;
                if (p.x > canvas.width + 50) p.x = -50;
                if (p.y < -50) p.y = canvas.height + 50;
                if (p.y > canvas.height + 50) p.y = -50;
            }

            animationFrameRef.current = requestAnimationFrame(draw);
        };

        updateSize();
        
        window.addEventListener('resize', updateSize);
        window.addEventListener('mousemove', handleMouseMove);

        draw();

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            window.removeEventListener('resize', updateSize);
            window.removeEventListener('mousemove', handleMouseMove);
        };

    }, [settings]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute', 
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: settings.overlayMode ? 9999 : 0 
            }}
        />
    );
};

export const PartyPopperIllustration: React.FC<{ className?: string; color?: string; style?: React.CSSProperties }> = ({ className, color = '#FFFFFF', style }) => {
    return <div className={className} style={{ ...style, color: color }}></div>;
};
export const Sparkle: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => <svg viewBox="0 0 100 100" className={className} style={style} fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M50 0 L55.9 44.1 L100 50 L55.9 55.9 L50 100 L44.1 55.9 L0 50 L44.1 44.1 Z" /></svg>;
export const GoldenBalloons: React.FC<{ className?: string }> = ({ className }) => <div className={className}></div>;
export const NoAlertsIllustration: React.FC<{ className?: string }> = ({ className }) => <svg className={className}></svg>;
export const IntelligenceHubIllustration: React.FC<{ className?: string }> = ({ className }) => <svg className={className}></svg>;

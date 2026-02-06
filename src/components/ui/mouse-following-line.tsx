import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"

// --- COMPONENT PROPS ---
interface GridAnimationProps extends React.HTMLAttributes<HTMLDivElement> {
    spacing?: number
    strokeLength?: number
    strokeWidth?: number
}

export function GridAnimation({
    className,
    spacing = 35,
    strokeLength = 10,
    strokeWidth = 1,
    style,
    ...props
}: GridAnimationProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const ballRef = useRef<HTMLDivElement>(null)
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
    const animationFrameRef = useRef<number | null>(null)

    // Mouse tracking with Refs for performance and direct DOM manipulation
    const targetPos = useRef({ x: 0, y: 0 })
    const currentPos = useRef({ x: 0, y: 0 })

    // Calculate canvas dimensions
    useEffect(() => {
        const updateDimensions = () => {
            const width = window.innerWidth
            const height = window.innerHeight
            setDimensions({ width, height })

            // Initial position (center)
            targetPos.current = { x: width / 2, y: height / 2 }
            currentPos.current = { x: width / 2, y: height / 2 }
        }

        updateDimensions()
        window.addEventListener('resize', updateDimensions)
        return () => window.removeEventListener('resize', updateDimensions)
    }, [])

    // Main animation loop
    const animate = useCallback(() => {
        if (!canvasRef.current || dimensions.width === 0) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        ctx.clearRect(0, 0, dimensions.width, dimensions.height)

        // Smooth lerp for the animated position
        currentPos.current.x += (targetPos.current.x - currentPos.current.x) * 0.12
        currentPos.current.y += (targetPos.current.y - currentPos.current.y) * 0.12

        const { x: curX, y: curY } = currentPos.current

        // Update ball DOM position directly for maximum reliability and visibility
        if (ballRef.current) {
            // Use translate3d for GPU acceleration
            ballRef.current.style.transform = `translate3d(${curX}px, ${curY}px, 0) translate(-50%, -50%)`
            ballRef.current.style.display = 'block' // Ensure it's not hidden
            ballRef.current.style.opacity = '1'
        }

        const numCols = Math.ceil(dimensions.width / spacing)
        const numRows = Math.ceil(dimensions.height / spacing)

        for (let col = -1; col <= numCols + 1; col++) {
            for (let row = -1; row <= numRows + 1; row++) {
                const pointX = col * spacing
                const pointY = row * spacing
                const dx = curX - pointX
                const dy = curY - pointY
                const distance = Math.sqrt(dx * dx + dy * dy)

                const angle = Math.atan2(dy, dx)
                const maxDist = 350
                const intensity = Math.max(0, 1 - distance / maxDist)

                if (intensity > 0) {
                    ctx.beginPath()
                    ctx.moveTo(pointX, pointY)

                    const length = strokeLength + (intensity * 12)
                    ctx.lineTo(pointX - Math.cos(angle) * length, pointY - Math.sin(angle) * length)

                    // Alterne as cores do efeito do fundo com azul e marrom
                    const isBlue = (col + row) % 2 === 0
                    const color = isBlue ? '15, 30, 56' : '184, 155, 118'

                    ctx.strokeStyle = `rgba(${color}, ${0.08 + intensity * 0.25})`
                    ctx.lineWidth = strokeWidth + (intensity * 0.8)
                    ctx.stroke()
                }
            }
        }

        animationFrameRef.current = requestAnimationFrame(animate)
    }, [dimensions, spacing, strokeLength, strokeWidth])

    // Global mouse tracking
    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            targetPos.current = { x: e.clientX, y: e.clientY }
        }

        window.addEventListener('mousemove', handleGlobalMouseMove)
        return () => window.removeEventListener('mousemove', handleGlobalMouseMove)
    }, [])

    useEffect(() => {
        animationFrameRef.current = requestAnimationFrame(animate)
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
        }
    }, [animate])

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                zIndex: 0,
                ...style
            }}
            {...props}
        >
            <canvas
                ref={canvasRef}
                width={dimensions.width}
                height={dimensions.height}
                className="absolute inset-0"
            />
            {/* The interactive ball - forced visible with direct styles */}
            <div
                ref={ballRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#b89b76',
                    boxShadow: '0 0 30px rgba(184, 155, 118, 1)',
                    zIndex: 1000,
                    pointerEvents: 'none',
                    willChange: 'transform'
                }}
            />
        </div>
    )
}

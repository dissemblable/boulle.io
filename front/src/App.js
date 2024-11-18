import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

const App = () => {
  const [tabData, setTabData] = useState([]);
    const [tabFeed, setTabFeed] = useState([])
    const meRef = useRef(null)
    const mousePositionRef = useRef({ x: 960, y: 540, rad : 20 });
    const canvasRef = useRef(null);
    const gameAreaSize = 10000;
    let lastPosition = { x: 0, y: 0 };
    let animationFrameId;
  
    useEffect(() => {
        socket.emit('init-player')
        socket.on('init-player-ok', (data) => {
            meRef.current = {x: 960, y: 540, rad: 20 , ...data}
            if (meRef.current){
                setTabData([meRef.current])
            }
        });
        return () => {
            socket.off('init-player-ok')
        }
    }, []);

    useEffect(() => {
        socket.emit('init-feed')
        socket.on('init-feed-ok', (data) => {
            const newData = {...data}
            setTabFeed(newData)
        })
        return () => {
            socket.off('init-feed-ok')
        }
            
    }, [])

    useEffect(() => {
        socket.on("new-player", (data) => {
            setTabData((prev) => {
                return data.player.reduce((acc, next) => {
                  const exist = prev.find(({ id }) => id === next.id);
                  if (exist) {
                    return [...acc, exist];
                  }
                  return [...acc, { id: next.id, x: 960, y: 540, rad: 20, color: next.color}];
                }, []);
            });
        });
        return () => {
            socket.off("new-player");
        };
    }, [])

    useEffect(() => {
        socket.on('playerDisconnected', (playerId) => {
            setTabData((prevPlayers) => {
                return prevPlayers.filter(player => player.id !== playerId);
            });
        });
        return () => {
            socket.off('playerDisconnected');
        };
    }, [])

    useEffect(() => {
        socket.on('new_coordonne', (data) => {
            setTabData((prev) => {
                return prev.map((p) => {
                    if (p.id === data.id) {
                        return {
                            ...p, x: data.x, y: data.y };
                    }
                    return p;
                });
            });
        });
        return () => {
            socket.off("new_coordonne");
        };
    }, [])

    useEffect(() => {
        const handleMouseMove = (event) => {
          mousePositionRef.current = {
            x: event.clientX,
            y: event.clientY,
          };
        };
    
        window.addEventListener("mousemove", handleMouseMove);
    
        return () => {
          window.removeEventListener("mousemove", handleMouseMove);
        };
    }, []);

    const hasMovedSignificantly = (newX, newY) => {
        const distance = Math.sqrt(Math.pow(newX - lastPosition.x, 2) + Math.pow(newY - lastPosition.y, 2));
        return distance > 5;
    };
    
    useEffect(() => {
        const moveBall = () => {
            setTabData((prev) => {
                return prev.map((p) => {
                    if (p.id === socket.id) {
                        const { x: mouseX, y: mouseY } = mousePositionRef.current;
    
                        const me = p;
    
                        const canvasWidth = window.innerWidth;
                        const canvasHeight = window.innerHeight;
    
                        const cameraOffsetX = me.x - canvasWidth / 2;
                        const cameraOffsetY = me.y - canvasHeight / 2;
    
                        const targetX = mouseX + cameraOffsetX;
                        const targetY = mouseY + cameraOffsetY;
    
                        const deltaX = targetX - me.x;
                        const deltaY = targetY - me.y;
                        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                        const newDistance = distance < 50 ? distance : 50;
    
                        const speed = 2;
    
                        if (distance > 1) {
                            const directionX = deltaX / distance;
                            const directionY = deltaY / distance;
    
                            let newX = me.x + directionX * ((speed)/me.rad) * newDistance;
                            let newY = me.y + directionY * ((speed)/me.rad) * newDistance;
    
                            newX = Math.max(0, Math.min(gameAreaSize, newX));
                            newY = Math.max(0, Math.min(gameAreaSize, newY));

                            if (hasMovedSignificantly(newX, newY)) {
                                lastPosition = { x: newX, y: newY };
                                socket.emit("coordonne", { x: newX, y: newY });
                            }

                            return { ...p, x: newX, y: newY };
                        }
                    }
                    return p;
                });
            });
            requestAnimationFrame(moveBall);
        };
        moveBall();
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        const render = () => {
            context.clearRect(0, 0, canvas.width, canvas.height);

            const gridSize = 100;
            context.strokeStyle = '#000000';
            context.lineWidth = 0.5;

            const me = tabData.find(player => player.id === socket.id);
            const offsetX = me ? me.x - canvas.width / 2 : 0;
            const offsetY = me ? me.y - canvas.height / 2 : 0;

            for (let x = -offsetX % gridSize; x < canvas.width; x += gridSize) {
                context.beginPath();
                context.moveTo(x, 0);
                context.lineTo(x, canvas.height);
                context.stroke();
            }

            for (let y = -offsetY % gridSize; y < canvas.height; y += gridSize) {
                context.beginPath();
                context.moveTo(0, y);
                context.lineTo(canvas.width, y);
                context.stroke();
            }

            if (me) {
                const offsetX = canvas.width / 2 - me.x;
                const offsetY = canvas.height / 2 - me.y;

                context.save();
                context.translate(offsetX, offsetY);
                
                tabData.forEach((item) => {
                    context.beginPath();
                    context.arc(item.x, item.y, item.rad, 0, Math.PI * 2);
                    context.fillStyle = item.color;
                    context.fill();
                });

                Object.entries(tabFeed).forEach((item) => {
                    item[1].forEach((items) => {
                        context.beginPath();
                        context.arc(items.x, items.y, items.rad, 0, Math.PI * 2);
                        context.fillStyle = 'rgb(255,0,0)';
                        context.fill();
                    })
                })
                context.restore();
            }
            animationFrameId = requestAnimationFrame(render);
            
        };
        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };

    }, [tabData]);
  
    return (
        <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} style={{ background: '#FFFFFF', position: 'relative', overflow: 'hidden' }} />
    )
}

export default App;

const config = {
    title: "404",
    subtitle: "¡Vaya! Parece que te has salido del camino",
    message: "La página que buscas no se encuentra disponible. Mientras la localizamos, te invitamos a explorar nuestra exclusiva colección de vehículos.",
    buttonText: "Volver al inicio",
    animationSettings: {
        carSpeed: 8,
        sparkleCount: 20
    }
};

// Aplicar textos al DOM
document.getElementById('error-title').textContent = config.title;
document.getElementById('error-subtitle').textContent = config.subtitle;
document.getElementById('error-message').textContent = config.message;
document.getElementById('error-button').textContent = config.buttonText;

// Ajustar velocidad del coche
const car = document.querySelector('.car');
if (car) {
    car.style.animationDuration = `${config.animationSettings.carSpeed}s`;
}

// Crear efectos de brillo aleatorios
function createSparkles(count = 20) {
    const body = document.body;
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    for (let i = 0; i < count; i++) {
        const sparkle = document.createElement('div');
        sparkle.classList.add('sparkle');
        
        sparkle.style.left = Math.random() * width + 'px';
        sparkle.style.top = Math.random() * height * 0.7 + 'px';
        sparkle.style.animationDelay = Math.random() * 3 + 's';
        
        body.appendChild(sparkle);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    createSparkles(config.animationSettings.sparkleCount);
});
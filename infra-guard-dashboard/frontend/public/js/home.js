// ============== HOME PAGE SPECIFIC JAVASCRIPT ==============

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Mobile menu toggle
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    navToggle.innerHTML = navMenu.classList.contains('active') ?
        '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
});

// Close mobile menu when clicking a link
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        navToggle.innerHTML = '<i class="fas fa-bars"></i>';
    });
});

// Active link highlighting
const sections = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').includes(current)) {
            link.classList.add('active');
        }
    });
});

// Particles animation
function createParticles() {
    const particles = document.getElementById('particles');
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 5 + 2}px;
            height: ${Math.random() * 5 + 2}px;
            background: rgba(255, 255, 255, ${Math.random() * 0.5 + 0.2});
            border-radius: 50%;
            top: ${Math.random() * 100}%;
            left: ${Math.random() * 100}%;
            animation: float-particle ${Math.random() * 10 + 10}s linear infinite;
            opacity: ${Math.random() * 0.5 + 0.2};
        `;
        particles.appendChild(particle);
    }
}

// Add particle animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes float-particle {
        from {
            transform: translateY(0) translateX(0);
        }
        to {
            transform: translateY(-100vh) translateX(${Math.random() * 200 - 100}px);
        }
    }
`;
document.head.appendChild(style);

createParticles();

// Mini graph initialization
const ctx = document.getElementById('miniGraph').getContext('2d');
const miniChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: ['1m', '2m', '3m', '4m', '5m', '6m'],
        datasets: [{
            label: 'Tilt Angle',
            data: [1.2, 2.1, 1.8, 2.5, 2.3, 2.8],
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            tension: 0.4,
            fill: true
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)'
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)'
                }
            }
        }
    }
});

// Live data simulation (replace with actual WebSocket later)
function updateLiveData() {
    // Simulate random data changes
    const tilt = (Math.random() * 3 + 1).toFixed(1);
    const temp = (Math.random() * 10 + 25).toFixed(0);
    const humidity = (Math.random() * 20 + 60).toFixed(0);
    const light = Math.random() > 0.5 ? 'ON' : 'OFF';

    document.getElementById('liveTilt').textContent = tilt + '°';
    document.getElementById('liveTemp').textContent = temp + '°C';

    // Update mini sensors
    document.getElementById('miniTilt').textContent = tilt + '°';
    document.getElementById('miniTemp').textContent = temp + '°C';
    document.getElementById('miniHumidity').textContent = humidity + '%';
    document.getElementById('miniLight').textContent = light;

    // Update chart
    miniChart.data.datasets[0].data.shift();
    miniChart.data.datasets[0].data.push(parseFloat(tilt));
    miniChart.update();

    // Update risk based on tilt
    const riskElement = document.getElementById('liveRisk').querySelector('.risk-badge');
    if (parseFloat(tilt) > 4) {
        riskElement.textContent = 'WARNING';
        riskElement.className = 'risk-badge warning';
    } else if (parseFloat(tilt) > 3) {
        riskElement.textContent = 'CAUTION';
        riskElement.className = 'risk-badge caution';
    } else {
        riskElement.textContent = 'SAFE';
        riskElement.className = 'risk-badge safe';
    }
}

// Update every 3 seconds
setInterval(updateLiveData, 3000);

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.feature-card, .about-content, .about-image').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s ease-out';
    observer.observe(el);
});
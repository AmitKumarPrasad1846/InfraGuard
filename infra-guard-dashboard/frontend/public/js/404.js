// ============== 404 PAGE FUNCTIONALITY ==============

// Update current time in footer
function updateTime() {
    const timeElement = document.getElementById('currentTime');
    if (!timeElement) return;

    const now = new Date();
    const options = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
    };

    timeElement.textContent = now.toLocaleTimeString('en-IN', options);
}

// Update time every second
setInterval(updateTime, 1000);

// Go back function
function goBack() {
    if (document.referrer) {
        window.history.back();
    } else {
        window.location.href = '/';
    }
}

// Search functionality
function searchPage() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim().toLowerCase();

    if (!query) {
        showToast('Please enter a search term', 'info');
        return;
    }

    // List of available pages
    const pages = [
        { name: 'home', url: '/', keywords: ['home', 'main', 'landing'] },
        { name: 'dashboard', url: '/dashboard', keywords: ['dashboard', 'live', 'data'] },
        { name: 'analytics', url: '/analytics', keywords: ['analytics', 'charts', 'graphs'] },
        { name: 'alerts', url: '/alerts', keywords: ['alerts', 'notifications', 'warnings'] },
        { name: 'map', url: '/map', keywords: ['map', 'location', 'nodes'] },
        { name: 'settings', url: '/settings', keywords: ['settings', 'configuration', 'preferences'] },
        { name: 'profile', url: '/profile', keywords: ['profile', 'account', 'user'] },
        { name: 'login', url: '/login', keywords: ['login', 'signin', 'authentication'] }
    ];

    // Search for matching page
    const matchedPage = pages.find(page =>
        page.name.includes(query) ||
        page.keywords.some(keyword => keyword.includes(query))
    );

    if (matchedPage) {
        window.location.href = matchedPage.url;
    } else {
        showToast('No matching page found. Try home or dashboard', 'error');
    }
}

// Toast notification function
function showToast(message, type = 'info') {
    // Check if toast container exists
    let toastContainer = document.querySelector('.toast-container');

    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);

        // Add styles for toast container if not exists
        const style = document.createElement('style');
        style.textContent = `
            .toast-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
            }
            
            .toast {
                background: white;
                border-radius: 10px;
                padding: 1rem 1.5rem;
                margin-bottom: 0.5rem;
                box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
                display: flex;
                align-items: center;
                gap: 0.75rem;
                min-width: 300px;
                animation: slideIn 0.3s ease;
                border-left: 4px solid;
            }
            
            .toast.success {
                border-left-color: #22c55e;
            }
            
            .toast.error {
                border-left-color: #ef4444;
            }
            
            .toast.info {
                border-left-color: #3b82f6;
            }
            
            .toast i {
                font-size: 1.2rem;
            }
            
            .toast.success i {
                color: #22c55e;
            }
            
            .toast.error i {
                color: #ef4444;
            }
            
            .toast.info i {
                color: #3b82f6;
            }
            
            .toast-content {
                flex: 1;
            }
            
            .toast-title {
                font-weight: 600;
                font-size: 0.9rem;
                margin-bottom: 0.2rem;
            }
            
            .toast-message {
                font-size: 0.85rem;
                color: #64748b;
            }
            
            .toast-close {
                background: none;
                border: none;
                color: #94a3b8;
                cursor: pointer;
                padding: 0.25rem;
                transition: color 0.3s;
            }
            
            .toast-close:hover {
                color: #1e293b;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @media (prefers-color-scheme: dark) {
                .toast {
                    background: #1e293b;
                }
                
                .toast-message {
                    color: #94a3b8;
                }
                
                .toast-close:hover {
                    color: #f1f5f9;
                }
            }
        `;
        document.head.appendChild(style);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? 'fa-check-circle' :
        type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';

    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <div class="toast-content">
            <div class="toast-title">${type.toUpperCase()}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    toastContainer.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 3000);
}

// Add enter key handler for search
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchPage();
            }
        });
    }

    // Add cool animation for digits
    const digits = document.querySelectorAll('.digit');
    digits.forEach((digit, index) => {
        digit.style.animationDelay = `${index * 0.2}s`;
    });
});

// Track 404 error (optional - can be sent to analytics)
function track404() {
    const errorData = {
        page: window.location.href,
        referrer: document.referrer || 'direct',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
    };

    console.log('404 Error:', errorData);

    // Optional: Send to server for analytics
    // fetch('/api/track-404', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(errorData)
    // }).catch(err => console.error('Failed to track 404:', err));
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateTime();
    track404();
});

// Export functions
window.goBack = goBack;
window.searchPage = searchPage;
window.showToast = showToast;
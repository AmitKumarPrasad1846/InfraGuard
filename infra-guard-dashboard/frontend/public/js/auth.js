// Authentication check
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token && !window.location.pathname.includes('login.html')) {
        window.location.href = '/login.html';
        return false;
    }
    return token;
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// Get current user
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Update username in header
function updateUserDisplay() {
    const user = getCurrentUser();
    if (user && document.getElementById('username')) {
        document.getElementById('username').textContent = user.username;
    }
}

// Check auth on page load
document.addEventListener('DOMContentLoaded', () => {
    if (!window.location.pathname.includes('login.html')) {
        checkAuth();
        updateUserDisplay();
    }

    // Load dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        const toggle = document.getElementById('darkModeToggle');
        if (toggle) toggle.checked = true;
    }
});

// Dark mode toggle
document.addEventListener('change', (e) => {
    if (e.target.id === 'darkModeToggle') {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', e.target.checked);
    }
});
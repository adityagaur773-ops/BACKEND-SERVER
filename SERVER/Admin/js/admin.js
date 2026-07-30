// ==========================
// KAIRA ADMIN DASHBOARD JS
// Complete Admin Functionality
// ==========================

const API_URL = window.KAIRA_API_URL || 'http://localhost:5000/api';

// ==========================
// AUTH TOKEN MANAGEMENT
// ==========================

function getToken() {
    return localStorage.getItem('adminToken');
}

function setToken(token) {
    localStorage.setItem('adminToken', token);
}

function removeToken() {
    localStorage.removeItem('adminToken');
}

function isAuthenticated() {
    return !!getToken();
}

// ==========================
// API CALLS
// ==========================

async function apiCall(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json();

    if (response.status === 401) {
        // Token expired or invalid
        removeToken();
        window.location.href = 'login.html';
        return null;
    }

    return data;
}

// ==========================
// LOGIN
// ==========================

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMsg');

    try {
        const data = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (data.success) {
            setToken(data.token);
            window.location.href = 'index.html';
        } else {
            errorMsg.style.display = 'block';
            errorMsg.textContent = data.message || 'Login failed';
        }
    } catch (error) {
        errorMsg.style.display = 'block';
        errorMsg.textContent = 'Network error. Please try again.';
    }
}

// ==========================
// LOAD DASHBOARD
// ==========================

async function loadDashboard() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const data = await apiCall('/analytics/dashboard');

        if (data.success) {
            const stats = data.stats;
            document.getElementById('totalOrders').textContent = stats.totalOrders;
            document.getElementById('totalRevenue').textContent = '₹' + stats.totalRevenue.toLocaleString();
            document.getElementById('totalCustomers').textContent = stats.totalCustomers;
            document.getElementById('totalProducts').textContent = stats.totalProducts;
            document.getElementById('pendingOrders').textContent = stats.pendingOrders;

            // Render recent orders
            renderOrders(data.recentOrders);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// ==========================
// RENDER ORDERS
// ==========================

function renderOrders(orders) {
    const container = document.getElementById('recentOrders');
    if (!container) return;

    if (!orders || orders.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;padding:30px;color:var(--text-secondary);">
                    No orders found
                </td>
            </tr>
        `;
        return;
    }

    container.innerHTML = orders.map(order => `
        <tr>
            <td>${order.orderId}</td>
            <td>${order.user ? order.user.name : 'Guest'}</td>
            <td>₹${order.total.toLocaleString()}</td>
            <td><span class="status-badge ${order.status}">${order.status}</span></td>
            <td>${new Date(order.createdAt).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

// ==========================
// LOAD PRODUCTS
// ==========================

async function loadProducts() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const data = await apiCall('/products');

        if (data.success) {
            renderProductGrid(data.products);
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function renderProductGrid(products) {
    const container = document.getElementById('productGrid');
    if (!container) return;

    if (!products || products.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px;color:var(--text-secondary);">
                <i class="ri-box-3-line" style="font-size:48px;opacity:0.3;"></i>
                <p style="margin-top:12px;">No products added yet</p>
            </div>
        `;
        return;
    }

    container.innerHTML = products.map(product => `
        <div class="product-card-admin">
            <div class="product-image">
                <img src="${product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/200'}" alt="${product.name}">
            </div>
            <div class="product-info">
                <div class="name">${product.name}</div>
                <div class="price">₹${product.price.toLocaleString()}</div>
                <div class="stock">${product.inStock ? 'In Stock' : 'Out of Stock'}</div>
                <div class="actions">
                    <button onclick="editProduct('${product._id}')">Edit</button>
                    <button class="danger" onclick="deleteProduct('${product._id}')">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

// ==========================
// LOAD CUSTOMERS
// ==========================

async function loadCustomers() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const data = await apiCall('/customers');

        if (data.success) {
            renderCustomerTable(data.customers);
        }
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

function renderCustomerTable(customers) {
    const container = document.getElementById('customerTableBody');
    if (!container) return;

    if (!customers || customers.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;padding:30px;color:var(--text-secondary);">
                    No customers found
                </td>
            </tr>
        `;
        return;
    }

    container.innerHTML = customers.map(customer => `
        <tr>
            <td>${customer.name}</td>
            <td>${customer.email}</td>
            <td>${customer.phone || '-'}</td>
            <td>${new Date(customer.createdAt).toLocaleDateString()}</td>
            <td><span class="status-badge ${customer.isActive ? 'delivered' : 'cancelled'}">${customer.isActive ? 'Active' : 'Inactive'}</span></td>
        </tr>
    `).join('');
}

// ==========================
// LOAD ORDERS (Admin Orders Page)
// ==========================

async function loadAdminOrders() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const data = await apiCall('/orders');

        if (data.success) {
            renderAdminOrders(data.orders);
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function renderAdminOrders(orders) {
    const container = document.getElementById('ordersTableBody');
    if (!container) return;

    if (!orders || orders.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:30px;color:var(--text-secondary);">
                    No orders found
                </td>
            </tr>
        `;
        return;
    }

    container.innerHTML = orders.map(order => `
        <tr>
            <td>${order.orderId}</td>
            <td>${order.user ? order.user.name : 'Guest'}</td>
            <td>₹${order.total.toLocaleString()}</td>
            <td>
                <select class="status-badge" style="background:transparent;border:1px solid var(--border-color);padding:4px 8px;border-radius:6px;color:var(--text-primary);" onchange="updateOrderStatus('${order._id}', this.value)">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                    <option value="packed" ${order.status === 'packed' ? 'selected' : ''}>Packed</option>
                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
            <td>${new Date(order.createdAt).toLocaleDateString()}</td>
            <td>
                <button style="background:transparent;border:1px solid var(--border-color);border-radius:6px;padding:4px 12px;color:var(--text-secondary);cursor:pointer;" onclick="viewOrder('${order._id}')">View</button>
            </td>
        </tr>
    `).join('');
}

// ==========================
// UPDATE ORDER STATUS
// ==========================

async function updateOrderStatus(orderId, status) {
    try {
        const data = await apiCall(`/orders/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });

        if (data.success) {
            showToast('Order status updated successfully!', 'success');
        }
    } catch (error) {
        showToast('Error updating order status', 'error');
    }
}

// ==========================
// TOAST NOTIFICATIONS
// ==========================

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#22c55e' : '#ef4444'};
        color: white;
        border-radius: 8px;
        font-weight: 500;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        z-index: 9999;
        animation: slideUp 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================
// SIDEBAR TOGGLE (Mobile)
// ==========================

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('open');
}

// ==========================
// LOGOUT
// ==========================

function logout() {
    removeToken();
    window.location.href = 'login.html';
}

// ==========================
// INITIALIZATION
// ==========================

// Run on page load
document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname;

    if (path.includes('login.html')) {
        // Login page - attach form handler
        const form = document.getElementById('loginForm');
        if (form) {
            form.addEventListener('submit', handleLogin);
        }
    } else if (path.includes('index.html') || path === '/admin/' || path === '/admin') {
        loadDashboard();
    } else if (path.includes('products.html')) {
        loadProducts();
    } else if (path.includes('customers.html')) {
        loadCustomers();
    } else if (path.includes('orders.html')) {
        loadAdminOrders();
    }

    // Set active nav item
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.getAttribute('href') === window.location.pathname.split('/').pop()) {
            item.classList.add('active');
        }
    });
});

console.log('🚀 KAIRA Admin Dashboard Loaded');

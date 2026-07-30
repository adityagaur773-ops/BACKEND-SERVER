// ==========================
// KAIRA Admin - API Configuration
// ==========================

// ✅ USE YOUR NEW RENDER URL
const API_BASE_URL = 'https://backend-server-4-p7h3.onrender.com/api';
const API_URL = API_BASE_URL + '/api';

// Make available globally
window.KAIRA_API_URL = API_URL;
window.KAIRA_BASE_URL = API_BASE_URL;

localStorage.setItem('adminApiUrl', API_URL);

console.log('🔧 Admin Panel Configuration:');
console.log(`   API URL: ${API_URL}`);
console.log(`   Base URL: ${API_BASE_URL}`);
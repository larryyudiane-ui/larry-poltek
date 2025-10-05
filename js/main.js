// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyADHE8vdkVxIEFOHtajw2gQQT36qPOtNG0",
  authDomain: "biosferikesi-b9751.firebaseapp.com",
  projectId: "biosferikesi-b9751",
  storageBucket: "biosferikesi-b9751.firebasestorage.app",
  messagingSenderId: "904667765155",
  appId: "1:904667765155:web:8e52d7543214ff6742e216",
  measurementId: "G-QHPTKEY4E4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// --- Logika Autentikasi dan Umum ---
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');
    const userNameEl = document.getElementById('user-name');
    const userRoleEl = document.getElementById('user-role');

    

    // Sidebar
    const sidebar = document.querySelector(".sidebar");
    const sidebarBtn = document.querySelector("#btn-sidebar");
    if (sidebarBtn) {
        sidebarBtn.addEventListener("click", () => {
            sidebar.classList.toggle("open");
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => {
                window.location.href = 'index.html';
            });
        });
    }

    // Cek status autentikasi dan inisialisasi halaman
    auth.onAuthStateChanged(user => {
        const path = window.location.pathname;
        const isProtectedPage = path.includes('user_page.html') || path.includes('admin_page.html');

        if (!user && isProtectedPage) {
            window.location.href = 'index.html';
            return;
        }

        if (user) {
            db.ref('users/' + user.uid).once('value').then(snapshot => {
                const userData = snapshot.val();
                if (!userData) {
                    console.error("User data not found in database.");
                    auth.signOut();
                    return;
                }
                
                // Tampilkan username dan role di dashboard jika tersedia
                if (userNameEl) {
                    userNameEl.textContent = userData.username || userData.email || userData.userId; 
                }
                if (userRoleEl) {
                    userRoleEl.textContent = userData.role;
                }
                
                // Logika utama untuk menginisialisasi halaman berdasarkan peran
                if (userData.role === 'admin') {
                    if (path.includes('user_page.html')) {
                        // Admin boleh melihat user_page
                        initializeUserPage();
                    } else if (path.includes('admin_page.html')) {
                        initializeAdminPage(); 
                    }
                } else { // Role adalah 'user'
                    if (path.includes('admin_page.html')) {
                        window.location.href = 'user_page.html';
                    } else if (path.includes('user_page.html')) {
                        initializeUserPage();
                    }
                }
            }).catch(error => {
                console.error("Error fetching user data:", error);
                auth.signOut();
            });
        }
    });

    // Login dengan Nomor ID
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const userIdInput = loginForm['login-email'].value;
            const password = loginForm['login-password'].value;
            db.ref('users').orderByChild('userId').equalTo(userIdInput).once('value')
                .then(snapshot => {
                    if (snapshot.exists()) {
                        const userData = Object.values(snapshot.val())[0];
                        const email = userData.email;
                        const role = userData.role;
                        return auth.signInWithEmailAndPassword(email, password)
                            .then(() => {
                                if (role === 'admin') {
                                    window.location.href = 'admin_page.html';
                                } else {
                                    window.location.href = 'user_page.html';
                                }
                            });
                    } else {
                        throw new Error("Nomor ID tidak ditemukan.");
                    }
                })
                .catch(err => {
                    alert(err.message);
                });
        });
    }
    
    // Pendaftaran
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = registerForm['register-email'].value;
            const password = registerForm['register-password'].value;
            const username = registerForm['register-username'].value;
            const userId = registerForm['register-id'].value;
            const role = registerForm['register-role'].value;

            auth.createUserWithEmailAndPassword(email, password)
                .then(cred => {
                    return db.ref('users/' + cred.user.uid).set({
                        userId: userId,
                        username: username,
                        role: role,
                        email: email,
                        password : password

                    });
                })
                .then(() => {
                    alert('Registrasi berhasil!');
                    window.location.href = 'index.html';
                })
                .catch(err => {
                    alert(err.message);
                });
        });
    }
});

// --- Fungsi Inisialisasi Halaman User dan Admin ---

function initializeUserPage() {
    const chartsContainer = document.querySelector('.charts-container');
    const chartParameters = ['pH', 'COD', 'TSS', 'NH3-N', 'Flowmeter'];
    const charts = {};

    auth.onAuthStateChanged(user => {
        if (user) {
            const urlParams = new URLSearchParams(window.location.search);
            const userIdFromUrl = urlParams.get('userId');

            if (userIdFromUrl) {
                createAndRenderCharts(userIdFromUrl, charts, chartParameters, chartsContainer);
            } else {
                db.ref('users/' + user.uid).once('value').then(snapshot => {
                    const userData = snapshot.val();
                    if (userData && userData.userId) {
                        createAndRenderCharts(userData.userId, charts, chartParameters, chartsContainer);
                    } else {
                        console.warn("User data or userId not found in database.");
                    }
                }).catch(error => {
                    console.error("Error fetching user data:", error);
                });
            }
        } else {
            window.location.href = 'index.html';
        }
    });
}

function createAndRenderCharts(userIdToUse, charts, chartParameters, chartsContainer) {
    const headerTitleEl = document.querySelector('.header .page-title');
    if (headerTitleEl) {
        headerTitleEl.textContent = `Dashboard ${userIdToUse}`;
    }

    chartsContainer.innerHTML = '';

    chartParameters.forEach(param => {
        const chartBox = document.createElement('div');
        chartBox.className = 'chart-box';
        chartBox.innerHTML = `
            <h2>${param} Level</h2>
            <p>Real-time ${param} value of the water.</p>
            <div style="height: 250px;"><canvas id="chart-${param}-${userIdToUse}"></canvas></div>
        `;
        chartsContainer.appendChild(chartBox);
        
        const ctx = document.getElementById(`chart-${param}-${userIdToUse}`).getContext('2d');
        charts[param] = new Chart(ctx, { 
            type: 'line',
            data: { 
                labels: [], 
                datasets: [{ 
                    label: `Nilai ${param}`, 
                    data: [], 
                    borderColor: 'rgb(75, 192, 192)', 
                    tension: 0.1, 
                    fill: true 
                }] 
            },
            options: {  
                responsive: true,
                maintainAspectRatio: false,
                scales: {  
                    y: { beginAtZero: true }, 
                    x: { ticks: { maxTicksLimit: 10, autoSkip: true } } 
                }  
            }
        });
    });

    fetchAndRenderUserCharts(userIdToUse, charts, chartParameters);
}

function fetchAndRenderUserCharts(userId, charts, chartParameters) {
    let isDummyMode = false;
    let updateInterval;

    db.ref(`data/${userId}`).on('value', snapshot => {
        const data = snapshot.val();
        if (data) {
            // Real data available, use it and stop dummy mode if active
            chartParameters.forEach(param => {
                const labels = Object.keys(data[param] || {});
                const values = Object.values(data[param] || {});
                if (charts[param]) {
                    charts[param].data.labels = labels;
                    charts[param].data.datasets[0].data = values;
                    charts[param].update();
                }
            });
            if (isDummyMode) {
                clearInterval(updateInterval);
                isDummyMode = false;
            }
        } else if (!isDummyMode) {
            // No real data, initialize dummy mode
            const dummyData = generateDummyData(10);
            chartParameters.forEach(param => {
                const labels = Object.keys(dummyData[param]);
                const values = Object.values(dummyData[param]);
                if (charts[param]) {
                    charts[param].data.labels = labels;
                    charts[param].data.datasets[0].data = values;
                    charts[param].update();
                }
            });
            isDummyMode = true;

            // Simulate real-time updates every 5 seconds
            updateInterval = setInterval(() => {
                const now = new Date().toISOString().slice(11, 16); // HH:MM
                chartParameters.forEach(param => {
                    if (charts[param]) {
                        const newValue = generateNewDummyValue(param);
                        charts[param].data.labels.push(now);
                        charts[param].data.datasets[0].data.push(newValue);
                        // Keep only the last 20 points for performance
                        if (charts[param].data.labels.length > 20) {
                            charts[param].data.labels.shift();
                            charts[param].data.datasets[0].data.shift();
                        }
                        charts[param].update();
                    }
                });
            }, 5000);
        }
    });
}

function initializeAdminPage() {
    const adminChartsContainer = document.getElementById('admin-charts-container');
    const chartParameters = ['pH', 'COD', 'TSS', 'NH3-N', 'Flowmeter'];
    const chartColors = ['rgb(75, 192, 192)', 'rgb(255, 99, 132)', 'rgb(54, 162, 235)', 'rgb(255, 205, 86)', 'rgb(153, 102, 255)'];

    adminChartsContainer.innerHTML = '';

    db.ref('users').once('value', snapshot => {
        const allUsers = snapshot.val();
        if (allUsers) {
            const sortedUsers = Object.values(allUsers)
                .filter(user => user.role !== 'admin')
                .sort((a, b) => parseInt(a.userId) - parseInt(b.userId));

            sortedUsers.forEach(user => {
                const userId = user.userId;
                
                const chartBox = document.createElement('div');
                chartBox.className = 'chart-box';
                chartBox.innerHTML = `
                    <h2>Area ${userId}</h2>
                    <p>Real-time water quality metrics for Area ${userId}.</p>
                    <div style="height: 200px;"><canvas id="admin-chart-${userId}"></canvas></div>
                    <a href="user_page.html?userId=${userId}" class="view-details">View Details</a>
                `;
                adminChartsContainer.appendChild(chartBox);
                
                const ctx = document.getElementById(`admin-chart-${userId}`).getContext('2d');
                const datasets = chartParameters.map(param => ({
                    label: param,
                    data: [],
                    borderColor: getChartColor(param),
                    tension: 0.1,
                    fill: false,
                }));
                const adminChart = new Chart(ctx, {
                    type: 'line',
                    data: { labels: [], datasets: datasets },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: { beginAtZero: true },
                            x: { ticks: { maxTicksLimit: 10, autoSkip: true } }
                        }
                    }
                });

                let isDummyMode = false;
                let updateInterval;

                db.ref(`data/${userId}`).on('value', dataSnapshot => {
                    const data = dataSnapshot.val();
                    if (data) {
                        // Real data available, use it and stop dummy mode if active
                        const labels = Object.keys(data.pH || {});
                        adminChart.data.labels = labels;
                        chartParameters.forEach((param, index) => {
                            adminChart.data.datasets[index].data = Object.values(data[param] || {});
                        });
                        adminChart.update();
                        if (isDummyMode) {
                            clearInterval(updateInterval);
                            isDummyMode = false;
                        }
                    } else if (!isDummyMode) {
                        // No real data, initialize dummy mode
                        const dummyData = generateDummyData(10);
                        const labels = Object.keys(dummyData.pH);
                        adminChart.data.labels = labels;
                        chartParameters.forEach((param, index) => {
                            adminChart.data.datasets[index].data = Object.values(dummyData[param]);
                        });
                        adminChart.update();
                        isDummyMode = true;

                        // Simulate real-time updates every 5 seconds
                        updateInterval = setInterval(() => {
                            const now = new Date().toISOString().slice(11, 16); // HH:MM
                            chartParameters.forEach((param, index) => {
                                const newValue = generateNewDummyValue(param);
                                adminChart.data.labels.push(now);
                                adminChart.data.datasets[index].data.push(newValue);
                                // Keep only the last 20 points for performance
                                if (adminChart.data.labels.length > 20) {
                                    adminChart.data.labels.shift();
                                    chartParameters.forEach((_, idx) => {
                                        adminChart.data.datasets[idx].data.shift();
                                    });
                                }
                            });
                            adminChart.update();
                        }, 5000);
                    }
                });
            });
        }
    });
}

function getChartColor(param) {
    const colors = {
        pH: 'rgb(75, 192, 192)',
        COD: 'rgb(255, 99, 132)',
        TSS: 'rgb(54, 162, 235)',
        'NH3-N': 'rgb(255, 205, 86)',
        Flowmeter: 'rgb(153, 102, 255)'
    };
    return colors[param] || 'rgb(0,0,0)';
}

// Generate dummy data for demonstration if no real data in Firebase
function generateDummyData(numPoints = 10) {
    const now = new Date();
    const data = {};
    const parameters = ['pH', 'COD', 'TSS', 'NH3-N', 'Flowmeter'];
    const ranges = {
        pH: { min: 6.5, max: 8.5 },
        COD: { min: 20, max: 100 },
        TSS: { min: 10, max: 200 },
        'NH3-N': { min: 0.1, max: 5 },
        Flowmeter: { min: 100, max: 1000 }
    };

    parameters.forEach(param => {
        data[param] = {};
        for (let i = numPoints - 1; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 3600000); // 1 hour apart
            const timestamp = time.toISOString().slice(11, 16); // HH:MM
            const value = (Math.random() * (ranges[param].max - ranges[param].min) + ranges[param].min).toFixed(2);
            data[param][timestamp] = parseFloat(value);
        }
    });
    return data;
}

// Generate a single new dummy value for a parameter
function generateNewDummyValue(param) {
    const ranges = {
        pH: { min: 6.5, max: 8.5 },
        COD: { min: 20, max: 100 },
        TSS: { min: 10, max: 200 },
        'NH3-N': { min: 0.1, max: 5 },
        Flowmeter: { min: 100, max: 1000 }
    };
    const range = ranges[param] || { min: 0, max: 100 };
    return parseFloat((Math.random() * (range.max - range.min) + range.min).toFixed(2));
}


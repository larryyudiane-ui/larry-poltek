// Gantilah konfigurasi ini dengan data proyek Firebase Anda sendiri
const firebaseConfig = {
    apiKey: "AIzaSyDY6dPJPCWngMiLJ0viv-E49VAX5W1FBgc",
    authDomain: "sparing-e624d.firebaseapp.com",
    databaseURL: "https://sparing-e624d-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "sparing-e624d",
    storageBucket: "sparing-e624d.appspot.com",
    messagingSenderId: "Ganti dengan sender ID Anda",
    appId: "Ganti dengan app ID Anda"
};

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
                
                if (userNameEl) {
                    userNameEl.textContent = userData.username || userData.email || userData.userId; 
                }
                if (userRoleEl) {
                    userRoleEl.textContent = userData.role;
                }
                
                if (userData.role === 'admin') {
                    if (path.includes('user_page.html')) {
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
                setInterval(() => {
                    updateDummyCharts(charts, chartParameters);
                }, 5000); 
            } else {
                db.ref('users/' + user.uid).once('value').then(snapshot => {
                    const userData = snapshot.val();
                    if (userData && userData.userId) {
                        createAndRenderCharts(userData.userId, charts, chartParameters, chartsContainer);
                        setInterval(() => {
                            updateDummyCharts(charts, chartParameters);
                        }, 5000);
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
}

function updateDummyCharts(charts, chartParameters) {
    chartParameters.forEach(param => {
        const data = charts[param].data.datasets[0].data;
        const labels = charts[param].data.labels;
        
        if (data.length > 10) {
            data.shift();
            labels.shift();
        }

        const newValue = generateDummyData(param);
        const newLabel = new Date().toLocaleTimeString('en-US', { hour12: false });
        
        data.push(newValue);
        labels.push(newLabel);

        charts[param].update();
    });
}

function initializeAdminPage() {
    const adminChartsContainer = document.getElementById('admin-charts-container');
    const chartParameters = ['pH', 'COD', 'TSS', 'NH3-N', 'Flowmeter'];
    const chartColors = ['rgb(75, 192, 192)', 'rgb(255, 99, 132)', 'rgb(54, 162, 235)', 'rgb(255, 205, 86)', 'rgb(153, 102, 255)'];

    adminChartsContainer.innerHTML = '';
    const charts = {};

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
                
                charts[userId] = new Chart(ctx, {
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
            });

            setInterval(() => {
                updateAdminDummyCharts(charts, sortedUsers, chartParameters);
            }, 5000);
        }
    });
}

function updateAdminDummyCharts(charts, users, chartParameters) {
    users.forEach(user => {
        const userId = user.userId;
        const chart = charts[userId];
        
        if (chart) {
            const labels = chart.data.labels;
            if (labels.length > 10) {
                labels.shift();
            }
            const newLabel = new Date().toLocaleTimeString('en-US', { hour12: false });
            labels.push(newLabel);

            chartParameters.forEach((param, index) => {
                const data = chart.data.datasets[index].data;
                if (data.length > 10) {
                    data.shift();
                }
                const newValue = generateDummyData(param);
                data.push(newValue);
            });
            chart.update();
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

function generateDummyData(parameter) {
    const ranges = {
        'pH': { min: 6.5, max: 8.5, fluctuation: 0.2 },
        'COD': { min: 150, max: 500, fluctuation: 50 },
        'TSS': { min: 80, max: 250, fluctuation: 30 },
        'NH3-N': { min: 10, max: 30, fluctuation: 1.5 },
        'Flowmeter': { min: 10, max: 30, fluctuation: 5 }
    };

    const range = ranges[parameter];
    if (!range) {
        return null;
    }

    let value = (Math.random() * (range.max - range.min)) + range.min;
    value = value + (Math.random() - 0.5) * range.fluctuation;
    return parseFloat(Math.max(range.min, Math.min(range.max, value)).toFixed(2));
}
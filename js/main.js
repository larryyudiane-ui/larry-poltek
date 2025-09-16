// Gantilah konfigurasi ini dengan data proyek Firebase Anda sendiri
const firebaseConfig = {
    apiKey: "AIzaSyDY6dPJPCWngMiLJ0viv-E49VAX5W1FBgc",
    authDomain: "sparing-e624d.firebaseapp.com",
    databaseURL: "https://sparing-e624d-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "sparing-e624d",
    storageBucket: "sparing-e624d.appspot.com",
    messagingSenderId: "Ganti dengan sender ID Anda", // Perbarui ini
    appId: "Ganti dengan app ID Anda" // Perbarui ini
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

    // Cek status autentikasi dan arahkan ke halaman yang benar
    auth.onAuthStateChanged(user => {
        const path = window.location.pathname;
        const isAuthPage = path.includes('index.html') || path.includes('register.html');
        const isProtectedPage = path.includes('user_page.html') || path.includes('admin_page.html');

        if (!user && isProtectedPage) {
            window.location.href = 'index.html';
        }

        if (user) {
            db.ref('users/' + user.uid).once('value').then(snapshot => {
                const userData = snapshot.val();
                if (userNameEl && userData) {
                    userNameEl.textContent = userData.email;
                    userRoleEl.textContent = userData.role;
                }
                
                if (path.includes('admin_page.html') && userData.role !== 'admin') {
                    window.location.href = 'user_page.html';
                }
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
            const userId = registerForm['register-id'].value;
            const role = registerForm['register-role'].value;

            auth.createUserWithEmailAndPassword(email, password)
                .then(cred => {
                    return db.ref('users/' + cred.user.uid).set({
                        userId: userId,
                        role: role,
                        email: email
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

// --- Logika Halaman Admin & User ---
const path = window.location.pathname;
if (path.includes('user_page.html')) {
    initializeUserPage();
} else if (path.includes('admin_page.html')) {
    initializeAdminPage();
}

function initializeUserPage() {
    const chartsContainer = document.querySelector('.charts-container');
    const chartParameters = ['pH', 'COD', 'TSS', 'NH3-N', 'Flowmeter'];
    const charts = {};

    chartParameters.forEach(param => {
        const chartBox = document.createElement('div');
        chartBox.className = 'chart-box';
        chartBox.innerHTML = `
            <h2>${param} Level</h2>
            <p>Real-time ${param} value of the water.</p>
            <canvas id="chart-${param}"></canvas>
        `;
        chartsContainer.appendChild(chartBox);
        const ctx = document.getElementById(`chart-${param}`).getContext('2d');
        charts[param] = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: `Nilai ${param}`, data: [], borderColor: 'rgb(75, 192, 192)', tension: 0.1, fill: true }] },
            options: { 
                responsive: true, 
                scales: { 
                    y: { beginAtZero: true },
                    x: {
                        ticks: {
                            maxTicksLimit: 10,
                            autoSkip: true
                        }
                    }
                } 
            }
        });
    });

    const urlParams = new URLSearchParams(window.location.search);
    const userIdFromUrl = urlParams.get('userId');

    auth.onAuthStateChanged(user => {
        if (user) {
            let userIdToFetch;
            if (userIdFromUrl) {
                userIdToFetch = userIdFromUrl;
                fetchAndRenderUserCharts(userIdToFetch, charts, chartParameters);
            } else {
                db.ref('users/' + user.uid).once('value').then(snapshot => {
                    const userData = snapshot.val();
                    if (userData) {
                        userIdToFetch = userData.userId;
                        fetchAndRenderUserCharts(userIdToFetch, charts, chartParameters);
                    }
                });
            }
        }
    });
}

function fetchAndRenderUserCharts(userId, charts, chartParameters) {
    const dataRef = db.ref(`data/${userId}`);
    dataRef.on('value', snapshot => {
        const data = snapshot.val();
        if (data) {
            chartParameters.forEach(param => {
                const labels = Object.keys(data[param] || {});
                const values = Object.values(data[param] || {});
                charts[param].data.labels = labels;
                charts[param].data.datasets[0].data = values;
                charts[param].update();
            });
        }
    });
}

function initializeAdminPage() {
    const adminChartsContainer = document.getElementById('admin-charts-container');
    const chartParameters = ['pH', 'COD', 'TSS', 'NH3-N', 'Flowmeter'];
    const chartColors = ['rgb(75, 192, 192)', 'rgb(255, 99, 132)', 'rgb(54, 162, 235)', 'rgb(255, 205, 86)', 'rgb(153, 102, 255)'];

  db.ref('users').once('value', snapshot => {
    const allUsers = snapshot.val();
    if (allUsers) {
        // Ubah ke array dan urutkan berdasarkan userId numerik
        const sortedUsers = Object.values(allUsers)
            .map(user => ({
                uid: user.uid,
                userId: user.userId,
                role: user.role
            }))
            .sort((a, b) => {
                return parseInt(a.userId) - parseInt(b.userId);
            });

        // Tambahkan kartu sesuai urutan
        sortedUsers.forEach(user => {
            const userId = user.userId;

            const chartBox = document.createElement('div');
            chartBox.className = 'chart-box';
            chartBox.innerHTML = `
                <h2>Area ${userId}</h2>
                <p>Real-time water quality metrics for Area ${userId}.</p>
                <canvas id="admin-chart-${userId}"></canvas>
                <a href="user_page.html?userId=${userId}" class="view-details">View Details</a>
            `;
            adminChartsContainer.appendChild(chartBox);

            // Buat chart
            const ctx = document.getElementById(`admin-chart-${userId}`).getContext('2d');
            const datasets = ['pH', 'COD', 'TSS', 'NH3-N', 'Flowmeter'].map(param => ({
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
                    scales: {
                        y: { beginAtZero: true },
                        x: {
                            ticks: {
                                maxTicksLimit: 10,
                                autoSkip: true
                            }
                        }
                    }
                }
            });

            // Update chart data dari Firebase
            db.ref(`data/${userId}`).on('value', dataSnapshot => {
                const data = dataSnapshot.val();
                if (data) {
                    const labels = Object.keys(data.pH || {});
                    adminChart.data.labels = labels;
                    ['pH', 'COD', 'TSS', 'NH3-N', 'Flowmeter'].forEach((param, index) => {
                        adminChart.data.datasets[index].data = Object.values(data[param] || {});
                    });
                    adminChart.update();
                }
            });
        });
    }
});

// Fungsi warna untuk dataset
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
}

function initializeUserPage() {
    const chartsContainer = document.querySelector('.charts-container');
    const chartParameters = ['pH', 'COD', 'TSS', 'NH3-N', 'Flowmeter'];
    const charts = {};
    const headerTitleEl = document.querySelector('.header .page-title'); // Elemen judul dashboard

    // --- Bagian Baru: Ambil dan Tampilkan Nomor ID di Judul ---
    auth.onAuthStateChanged(user => {
        if (user) {
            const urlParams = new URLSearchParams(window.location.search);
            const userIdFromUrl = urlParams.get('userId');

            if (userIdFromUrl) {
                // Jika ada parameter userId di URL, gunakan itu
                if (headerTitleEl) {
                    headerTitleEl.textContent = `${userIdFromUrl} Dashboard`;
                }
                fetchAndRenderUserCharts(userIdFromUrl, charts, chartParameters);
            } else {
                // Jika tidak, ambil userId dari database berdasarkan user yang login
                db.ref('users/' + user.uid).once('value').then(snapshot => {
                    const userData = snapshot.val();
                    if (userData && userData.userId) {
                        const loggedInUserId = userData.userId;
                        if (headerTitleEl) {
                            headerTitleEl.textContent = `${loggedInUserId} Dashboard`;
                        }
                        fetchAndRenderUserCharts(loggedInUserId, charts, chartParameters);
                    } else {
                        console.warn("User data or userId not found in database.");
                        if (headerTitleEl) {
                            headerTitleEl.textContent = `User Dashboard`; // Fallback
                        }
                    }
                }).catch(error => {
                    console.error("Error fetching user data:", error);
                    if (headerTitleEl) {
                        headerTitleEl.textContent = `User Dashboard`; // Fallback
                    }
                });
            }
        } else {
            // Jika tidak ada user yang login, redirect ke halaman login
            window.location.href = 'index.html';
        }
    });
    // --- Akhir Bagian Baru ---

    // Membuat chart seperti sebelumnya (tidak diubah)
    chartParameters.forEach(param => {
        const chartBox = document.createElement('div');
        chartBox.className = 'chart-box';
        chartBox.innerHTML = `
            <h2>${param} Level</h2>
            <p>Real-time ${param} value of the water.</p>
            <canvas id="chart-${param}"></canvas>
        `;
        chartsContainer.appendChild(chartBox);
        const ctx = document.getElementById(`chart-${param}`).getContext('2d');
        charts[param] = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: `Nilai ${param}`, data: [], borderColor: 'rgb(75, 192, 192)', tension: 0.1, fill: true }] },
            options: { 
                responsive: true, 
                scales: { 
                    y: { beginAtZero: true },
                    x: {
                        ticks: {
                            maxTicksLimit: 10,
                            autoSkip: true
                        }
                    }
                } 
            }
        });
    });
}
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, updateDoc, Timestamp, getDoc, deleteDoc, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { firebaseConfig } from './firebase-config.js';

// --- INICIALIZACIÓN ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const mainContent = document.getElementById('main-content');
const pageTitle = document.getElementById('page-title');
const bottomNav = document.getElementById('bottom-nav');
const btnLogout = document.getElementById('btn-logout');

// --- SISTEMA DE RUTA (SPA) ---
window.router = (route) => {
    // Marcar botón activo en el menú
    const buttons = document.querySelectorAll('#bottom-nav button');
    buttons.forEach(btn => btn.classList.remove('nav-active'));
    
    mainContent.innerHTML = `<div class="flex justify-center py-20"><div class="animate-spin rounded-full h-10 w-10 border-b-4 border-blue-600"></div></div>`;
    
    if (route === 'dashboard') renderDashboard();
    if (route === 'clientes') renderClientes();
    if (route === 'prestamos') renderPrestamos();
    if (route === 'cobros') renderCobros();
};

// --- CONTROL DE SESIÓN ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        bottomNav.classList.remove('hidden');
        btnLogout.classList.remove('hidden');
        router('dashboard');
    } else {
        bottomNav.classList.add('hidden');
        btnLogout.classList.add('hidden');
        renderLogin();
    }
});

// --- PANTALLA: LOGIN ---
function renderLogin() {
    pageTitle.innerText = "ACCESO";
    mainContent.innerHTML = `
        <div class="bg-white p-8 rounded-[2.5rem] shadow-2xl mt-4 border-b-8 border-blue-600">
            <h2 class="text-3xl font-black text-slate-800 mb-2 italic">HOLA 👋</h2>
            <p class="text-slate-400 text-xs font-bold uppercase mb-8">Ingresa para administrar tus cobros</p>
            <form id="login-form" class="space-y-4 text-left">
                <div>
                    <label class="text-[10px] font-black text-slate-400 uppercase ml-2">Email</label>
                    <input type="email" id="l-email" placeholder="tu@correo.com" class="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50 font-bold focus:border-blue-600 outline-none" required>
                </div>
                <div>
                    <label class="text-[10px] font-black text-slate-400 uppercase ml-2">Contraseña</label>
                    <input type="password" id="l-pass" placeholder="••••••" class="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50 font-bold focus:border-blue-600 outline-none" required>
                </div>
                <button type="submit" class="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase shadow-xl active:scale-95 transition-all">Entrar al Sistema</button>
            </form>
        </div>`;
    
    document.getElementById('login-form').onsubmit = async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, document.getElementById('l-email').value, document.getElementById('l-pass').value);
        } catch (error) {
            alert("Acceso denegado: Verifica tus datos");
        }
    };
}

// --- PANTALLA: DASHBOARD (NUEVA LÓGICA DE SALDOS) ---
async function renderDashboard() {
    pageTitle.innerText = "INICIO";
    mainContent.innerHTML = `
        <div class="grid grid-cols-2 gap-3 mb-6">
            <div class="bg-white p-5 rounded-3xl shadow-sm border-l-4 border-green-500">
                <p class="text-slate-400 text-[10px] font-black uppercase mb-1">Cobrado Hoy</p>
                <p id="dash-cobrado" class="text-2xl font-black text-green-600">$0.00</p>
            </div>
            <div class="bg-white p-5 rounded-3xl shadow-sm border-l-4 border-blue-500">
                <p class="text-slate-400 text-[10px] font-black uppercase mb-1">Por Cobrar</p>
                <p id="dash-acobrar" class="text-2xl font-black text-blue-500">$0.00</p>
            </div>
        </div>

        <div class="bg-slate-900 p-6 rounded-[2rem] shadow-xl mb-6 text-white relative overflow-hidden">
            <p class="text-slate-400 text-[10px] font-black uppercase mb-1">Capital Total en la Calle</p>
            <p id="dash-total" class="text-3xl font-black">$0.00</p>
            <i class="fas fa-vault absolute -right-4 -bottom-4 text-8xl opacity-10"></i>
        </div>

        <div class="grid grid-cols-1 gap-3">
            <button onclick="router('cobros')" class="w-full bg-blue-600 text-white p-5 rounded-2xl font-black shadow-lg flex items-center justify-between active:scale-95 transition-all">
                <div class="flex items-center gap-4"><i class="fas fa-route text-xl"></i><span>RUTA DE COBRO</span></div>
                <i class="fas fa-chevron-right"></i>
            </button>
            <button onclick="router('clientes')" class="w-full bg-white border-2 p-5 rounded-2xl font-black text-slate-700 flex items-center justify-between active:scale-95 transition-all">
                <div class="flex items-center gap-4"><i class="fas fa-user-plus text-xl text-blue-600"></i><span>NUEVO CLIENTE</span></div>
                <i class="fas fa-chevron-right text-slate-300"></i>
            </button>
        </div>
    `;

    // Lógica de cálculo (Optimizada)
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const snapP = await getDocs(query(collection(db, "prestamos"), where("cobradorId", "==", auth.currentUser.uid)));
    
    let cobradoHoy = 0, porCobrarHoy = 0, deudaTotal = 0;

    snapP.forEach(d => {
        const p = d.data();
        if (p.estado === "activo") {
            deudaTotal += p.saldoActual;
            
            // Verificar si el próximo pago es hoy
            const proxPago = p.proximoPago.toDate(); proxPago.setHours(0,0,0,0);
            if (proxPago.getTime() <= hoy.getTime()) {
                porCobrarHoy += p.cuotaMonto;
            }
        }
    });

    // Buscar abonos hechos hoy
    const snapA = await getDocs(query(collection(db, "abonos"), where("cobradorId", "==", auth.currentUser.uid)));
    snapA.forEach(d => {
        const a = d.data();
        if (a.fecha.toDate().toDateString() === hoy.toDateString()) {
            cobradoHoy += a.monto;
        }
    });

    document.getElementById('dash-cobrado').innerText = `$${cobradoHoy.toFixed(2)}`;
    document.getElementById('dash-acobrar').innerText = `$${porCobrarHoy.toFixed(2)}`;
    document.getElementById('dash-total').innerText = `$${deudaTotal.toFixed(2)}`;
}

// --- LOGOUT ---
btnLogout.onclick = () => { if(confirm("¿Cerrar sesión?")) signOut(auth); };

// FUNCIONES TEMPORALES PARA EVITAR ERRORES
function renderClientes() { mainContent.innerHTML = `<p class="p-10 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">Próximo paso: Gestión de Clientes</p>`; }
function renderPrestamos() { mainContent.innerHTML = `<p class="p-10 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">Próximo paso: Gestión de Préstamos</p>`; }
function renderCobros() { mainContent.innerHTML = `<p class="p-10 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">Próximo paso: Ruta de Cobro</p>`; }
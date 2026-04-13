import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, updateDoc, Timestamp, getDoc, deleteDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const mainContent = document.getElementById('main-content');
const pageTitle = document.getElementById('page-title');
const bottomNav = document.getElementById('bottom-nav');
const btnLogout = document.getElementById('btn-logout');

// --- SISTEMA DE RUTA ---
window.router = (route) => {
    mainContent.innerHTML = `<div class="flex justify-center py-20"><div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>`;
    if (route === 'dashboard') renderDashboard();
    if (route === 'clientes') renderClientes();
    if (route === 'prestamos') renderPrestamos();
};

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

function renderLogin() {
    pageTitle.innerText = "Siscop 2.0 - Acceso";
    mainContent.innerHTML = `
        <div class="bg-white p-8 rounded-[2rem] shadow-xl mt-6 text-center border-b-4 border-blue-600">
            <h2 class="text-3xl font-black text-blue-600 mb-6 uppercase italic">Entrar</h2>
            <form id="login-form" class="space-y-4">
                <input type="email" id="l-email" placeholder="Correo" class="w-full p-4 border rounded-2xl font-bold bg-gray-50 outline-none focus:border-blue-600" required>
                <input type="password" id="l-pass" placeholder="Contraseña" class="w-full p-4 border rounded-2xl font-bold bg-gray-50 outline-none focus:border-blue-600" required>
                <button type="submit" class="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase shadow-lg">Ingresar</button>
            </form>
        </div>`;
    document.getElementById('login-form').onsubmit = async (e) => {
        e.preventDefault();
        try { await signInWithEmailAndPassword(auth, document.getElementById('l-email').value, document.getElementById('l-pass').value); } 
        catch (error) { alert("Usuario o clave incorrectos"); }
    };
}

// --- DASHBOARD ---
async function renderDashboard() {
    pageTitle.innerText = "Inicio";
    mainContent.innerHTML = `
        <div class="grid grid-cols-2 gap-3 mb-6 px-2">
            <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-green-500 text-center">
                <p class="text-gray-400 text-[9px] font-black uppercase">Cobrado Hoy</p>
                <p id="s-cobrado" class="text-xl font-black text-green-600">$0.00</p>
            </div>
            <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-blue-500 text-center">
                <p class="text-gray-400 text-[9px] font-black uppercase">En la Calle</p>
                <p id="s-total" class="text-xl font-black text-blue-600">$0.00</p>
            </div>
        </div>
        <div class="px-2 space-y-3">
            <button onclick="router('clientes')" class="w-full bg-blue-600 text-white p-5 rounded-3xl font-black shadow-lg uppercase tracking-widest active:scale-95 transition-all">NUEVO PRÉSTAMO</button>
            <button onclick="router('prestamos')" class="w-full bg-white border-2 p-5 rounded-3xl font-black text-gray-700 shadow-sm active:scale-95 transition-all uppercase text-xs">Ver Historial</button>
        </div>`;

    // Cálculo rápido
    const snapP = await getDocs(query(collection(db, "prestamos"), where("cobradorId", "==", auth.currentUser.uid), where("estado", "==", "activo")));
    let deudaTotal = 0;
    snapP.forEach(d => deudaTotal += d.data().saldoActual);
    document.getElementById('s-total').innerText = `$${deudaTotal.toFixed(2)}`;
}

// --- MÓDULO CLIENTES ---
function renderClientes() {
    pageTitle.innerText = "Clientes";
    mainContent.innerHTML = `
        <div class="flex gap-2 mb-4 px-2">
            <input type="text" id="busc-cli" placeholder="Buscar cliente..." class="w-full p-4 border rounded-2xl font-bold outline-none">
            <button onclick="document.getElementById('mod-c').classList.remove('hidden')" class="bg-blue-600 text-white p-4 rounded-2xl shadow-lg"><i class="fas fa-plus"></i></button>
        </div>
        <div id="lista-c" class="space-y-2 pb-24 px-2"></div>

        <!-- Modal Nuevo Cliente -->
        <div id="mod-c" class="fixed inset-0 bg-black/50 backdrop-blur-sm hidden flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
                <form id="f-c-nuevo" class="space-y-4 text-left">
                    <h3 class="font-black text-center uppercase text-gray-700">Registrar Cliente</h3>
                    <label class="text-[10px] font-black text-gray-400 uppercase ml-2">Nombre</label>
                    <input type="text" id="cnom" placeholder="Nombre completo" class="w-full p-4 border rounded-xl font-bold bg-gray-50 outline-none" required>
                    <label class="text-[10px] font-black text-gray-400 uppercase ml-2">WhatsApp</label>
                    <input type="tel" id="ctel" placeholder="809-000-0000" class="w-full p-4 border rounded-xl font-bold bg-gray-50 outline-none" required>
                    <button type="submit" class="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase shadow-lg">Guardar</button>
                    <button type="button" onclick="document.getElementById('mod-c').classList.add('hidden')" class="w-full text-gray-400 font-bold uppercase text-[10px] py-2">Cancelar</button>
                </form>
            </div>
        </div>`;
    
    cargarClientes();
    
    document.getElementById('f-c-nuevo').onsubmit = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "clientes"), {
                nombre: document.getElementById('cnom').value,
                telefono: document.getElementById('ctel').value,
                cobradorId: auth.currentUser.uid,
                fecha: new Date()
            });
            document.getElementById('mod-c').classList.add('hidden');
            renderClientes();
        } catch (e) { alert("Error al guardar"); }
    };
}

async function cargarClientes() {
    const cont = document.getElementById('lista-c');
    const snap = await getDocs(query(collection(db, "clientes"), where("cobradorId", "==", auth.currentUser.uid), orderBy("nombre", "asc")));
    cont.innerHTML = "";
    snap.forEach(d => {
        const c = d.data();
        cont.innerHTML += `
        <div class="bg-white p-4 rounded-2xl border flex justify-between items-center mb-2 shadow-sm animate-nudge active:bg-gray-50" onclick="verPerfil('${d.id}', '${c.nombre}', '${c.telefono}')">
            <div class="flex-1">
                <p class="font-black text-gray-800 uppercase text-sm">${c.nombre}</p>
                <p class="text-[10px] text-gray-400 font-bold">${c.telefono}</p>
            </div>
            <i class="fas fa-chevron-right text-blue-600"></i>
        </div>`;
    });
}

// --- PERFIL CLIENTE Y PRÉSTAMOS ---
window.verPerfil = async (id, nombre, telefono) => {
    pageTitle.innerText = "Perfil";
    mainContent.innerHTML = `
        <div class="space-y-4 pb-24 px-2">
            <div class="bg-white p-8 rounded-[2.5rem] shadow-xl text-center border-b-4 border-blue-600">
                <h3 class="font-black text-xl text-gray-800 uppercase mb-4">${nombre}</h3>
                <div class="flex gap-2">
                    <button onclick="document.getElementById('mod-p').classList.remove('hidden')" class="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black text-xs shadow-lg">+ PRÉSTAMO</button>
                    <a href="https://wa.me/${telefono}" class="bg-green-500 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"><i class="fab fa-whatsapp"></i></a>
                </div>
            </div>
            <div id="lista-prestamos-cliente" class="space-y-3"></div>
        </div>

        <!-- Modal Nuevo Préstamo -->
        <div id="mod-p" class="fixed inset-0 bg-black/50 backdrop-blur-sm hidden flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
                <form id="f-p-nuevo" class="space-y-3 text-left">
                    <h3 class="font-black text-center text-gray-800 uppercase mb-4">Detalles del Préstamo</h3>
                    <label class="text-[10px] font-black text-gray-400 uppercase">Monto Entregado ($)</label>
                    <input type="number" id="p-monto" placeholder="Ej: 5000" class="w-full p-4 border rounded-xl font-bold bg-gray-50 outline-none" required>
                    <label class="text-[10px] font-black text-gray-400 uppercase">Interés (%)</label>
                    <input type="number" id="p-interes" value="20" class="w-full p-4 border rounded-xl font-bold bg-gray-50 outline-none" required>
                    <label class="text-[10px] font-black text-gray-400 uppercase">Modalidad</label>
                    <select id="p-mod" class="w-full p-4 border rounded-xl font-bold bg-gray-50 outline-none">
                        <option value="Diario">Diario</option>
                        <option value="Semanal">Semanal</option>
                        <option value="Quincenal">Quincenal</option>
                        <option value="Mensual">Mensual</option>
                    </select>
                    <button type="submit" class="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase shadow-lg mt-2">Crear Préstamo</button>
                    <button type="button" onclick="document.getElementById('mod-p').classList.add('hidden')" class="w-full text-gray-400 font-bold text-[10px] uppercase py-2">Cerrar</button>
                </form>
            </div>
        </div>`;

    document.getElementById('f-p-nuevo').onsubmit = async (e) => {
        e.preventDefault();
        const m = parseFloat(document.getElementById('p-monto').value);
        const i = parseFloat(document.getElementById('p-interes').value);
        const total = m + (m * (i / 100));
        
        await addDoc(collection(db, "prestamos"), {
            clienteId: id,
            montoInicial: m,
            totalConInteres: total,
            saldoActual: total,
            modalidad: document.getElementById('p-mod').value,
            estado: "activo",
            cobradorId: auth.currentUser.uid,
            fecha: new Date()
        });
        alert("PRÉSTAMO CREADO");
        verPerfil(id, nombre, telefono);
    };

    // Cargar préstamos del cliente
    const snapP = await getDocs(query(collection(db, "prestamos"), where("clienteId", "==", id), where("estado", "==", "activo")));
    const contP = document.getElementById('lista-prestamos-cliente');
    snapP.forEach(d => {
        const p = d.data();
        contP.innerHTML += `
            <div class="bg-white p-5 rounded-3xl border-2 border-blue-50 shadow-sm">
                <p class="text-[10px] font-black text-gray-400 uppercase">Saldo Pendiente</p>
                <p class="text-3xl font-black text-blue-600 mb-4">$${p.saldoActual.toFixed(2)}</p>
                <div class="flex gap-2">
                    <input type="number" id="abono-${d.id}" placeholder="Monto" class="w-1/2 p-3 border rounded-xl font-bold bg-gray-50 outline-none">
                    <button onclick="registrarAbono('${d.id}', '${id}', '${nombre}', '${telefono}')" class="flex-1 bg-green-600 text-white rounded-xl font-black text-xs uppercase shadow-md">Abonar Pago</button>
                </div>
            </div>`;
    });
};

window.registrarAbono = async (pId, cId, cNom, cTel) => {
    const monto = parseFloat(document.getElementById(`abono-${pId}`).value);
    if (!monto || monto <= 0) return alert("Escribe un monto válido");

    const pDoc = doc(db, "prestamos", pId);
    const snap = await getDoc(pDoc);
    const nuevoSaldo = snap.data().saldoActual - monto;

    await updateDoc(pDoc, { 
        saldoActual: nuevoSaldo,
        estado: nuevoSaldo <= 0 ? "pagado" : "activo"
    });

    await addDoc(collection(db, "abonos"), {
        prestamoId: pId,
        monto: monto,
        fecha: new Date(),
        cobradorId: auth.currentUser.uid
    });

    alert("PAGO REGISTRADO");
    verPerfil(cId, cNom, cTel);
};

// --- MÓDULO PRÉSTAMOS (HISTORIAL) ---
async function renderPrestamos() {
    pageTitle.innerText = "Historial";
    mainContent.innerHTML = `<div id="lista-p" class="space-y-3 pb-24 px-2"></div>`;
    const snap = await getDocs(query(collection(db, "prestamos"), where("cobradorId", "==", auth.currentUser.uid), orderBy("fecha", "desc")));
    const cont = document.getElementById('lista-p');
    snap.forEach(async d => {
        const p = d.data();
        const cliS = await getDoc(doc(db, "clientes", p.clienteId));
        cont.innerHTML += `
            <div class="bg-white p-5 rounded-3xl shadow-sm border mb-3 flex justify-between items-center">
                <div>
                    <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">${cliS.data() ? cliS.data().nombre : '---'}</p>
                    <p class="text-xl font-black text-blue-600">$${p.totalConInteres.toFixed(2)}</p>
                    <p class="text-[8px] font-bold text-gray-400 uppercase">Saldo: $${p.saldoActual.toFixed(2)}</p>
                </div>
                <button onclick="deleteP('${d.id}')" class="text-red-300 p-2"><i class="fas fa-trash-alt"></i></button>
            </div>`;
    });
}

window.deleteP = async (id) => { if(confirm("¿Borrar préstamo?")) { await deleteDoc(doc(db, "prestamos", id)); renderPrestamos(); } };
btnLogout.onclick = () => signOut(auth);
function renderCobros() { alert("Módulo en construcción"); }
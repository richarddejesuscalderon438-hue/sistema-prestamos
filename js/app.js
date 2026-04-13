import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, updateDoc, Timestamp, getDoc, deleteDoc, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const mainContent = document.getElementById('main-content');
const pageTitle = document.getElementById('page-title');
const bottomNav = document.getElementById('bottom-nav');
const btnLogout = document.getElementById('btn-logout');

// --- SISTEMA DE RUTA RÁPIDA ---
window.router = (route) => {
    mainContent.innerHTML = `<div class="flex justify-center py-20"><div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>`;
    setTimeout(() => {
        if (route === 'dashboard') renderDashboard();
        if (route === 'clientes') renderClientes();
        if (route === 'prestamos') renderPrestamos();
        if (route === 'cobros') renderCobros();
        if (route === 'morosos') renderMorosos();
        if (route === 'reportes') renderReportes();
    }, 50);
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
    pageTitle.innerText = "Entrar";
    mainContent.innerHTML = `
        <div class="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl mt-6 text-center">
            <h2 class="text-3xl font-black text-blue-600 mb-6 uppercase">Siscop</h2>
            <form id="login-form" class="space-y-4">
                <input type="email" id="l-email" placeholder="Correo" class="w-full p-4 border rounded-2xl font-bold" required>
                <input type="password" id="l-pass" placeholder="Contraseña" class="w-full p-4 border rounded-2xl font-bold" required>
                <button type="submit" class="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase">Entrar</button>
            </form>
        </div>`;
    document.getElementById('login-form').onsubmit = async (e) => {
        e.preventDefault();
        try { await signInWithEmailAndPassword(auth, document.getElementById('l-email').value, document.getElementById('l-pass').value); } 
        catch (error) { alert("Error al entrar: " + error.message); }
    };
}

// --- DASHBOARD OPTIMIZADO ---
async function renderDashboard() {
    pageTitle.innerText = "Siscop";
    mainContent.innerHTML = `
        <div class="grid grid-cols-2 gap-3 mb-6">
            <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-green-500">
                <p class="text-gray-400 text-[9px] font-black uppercase">Cobrado Hoy</p>
                <p id="s-cobrado" class="text-xl font-black text-green-600">$0.00</p>
            </div>
            <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-blue-500">
                <p class="text-gray-400 text-[9px] font-black uppercase">Por Cobrar</p>
                <p id="s-acobrar" class="text-xl font-black text-blue-500">$0.00</p>
            </div>
        </div>
        <button onclick="router('cobros')" class="w-full bg-blue-600 text-white p-5 rounded-3xl font-black shadow-lg mb-6 active:scale-95 transition-all">
             <i class="fas fa-calendar-check mr-2"></i> RUTA DE COBRO
        </button>
        <div class="grid grid-cols-2 gap-3">
            <button onclick="router('clientes')" class="bg-white border p-4 rounded-2xl font-bold text-gray-700 text-xs uppercase shadow-sm">Clientes</button>
            <button onclick="router('morosos')" class="bg-white border p-4 rounded-2xl font-bold text-red-500 text-xs uppercase shadow-sm">Morosos</button>
        </div>`;

    try {
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        const snapC = await getDocs(query(collection(db, "cuotas"), where("cobradorId", "==", auth.currentUser.uid)));
        let cob = 0, acob = 0;
        snapC.forEach(d => {
            const c = d.data();
            const f = c.fecha.toDate(); f.setHours(0,0,0,0);
            if (f.getTime() === hoy.getTime()) {
                if (c.estado === "pagado") cob += c.monto; else acob += c.monto;
            }
        });
        document.getElementById('s-cobrado').innerText = `$${cob.toFixed(2)}`;
        document.getElementById('s-acobrar').innerText = `$${acob.toFixed(2)}`;
    } catch (e) { console.error(e); }
}

// --- CLIENTES (FIX DE ERROR DE GUARDADO) ---
function renderClientes() {
    pageTitle.innerText = "Clientes";
    mainContent.innerHTML = `
        <div class="flex gap-2 mb-4">
            <input type="text" id="busc-cli" placeholder="Buscar..." class="w-full p-4 border rounded-2xl font-bold outline-none">
            <button onclick="abrirModalCliente()" class="bg-blue-600 text-white p-4 rounded-2xl shadow-lg"><i class="fas fa-plus"></i></button>
        </div>
        <div id="lista-c" class="space-y-2 pb-24"></div>
        <div id="mod-c" class="fixed inset-0 bg-black/50 backdrop-blur-sm hidden flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
                <form id="f-c" class="space-y-4">
                    <h3 id="mod-c-title" class="font-black text-center uppercase text-gray-700">Nuevo Cliente</h3>
                    <input type="hidden" id="cid-edit">
                    <input type="text" id="cnom" placeholder="Nombre completo" class="w-full p-4 border rounded-xl font-bold bg-gray-50" required>
                    <input type="tel" id="ctel" placeholder="Teléfono" class="w-full p-4 border rounded-xl font-bold bg-gray-50" required>
                    <button type="submit" id="mod-c-btn" class="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase shadow-lg">Guardar</button>
                    <button type="button" onclick="document.getElementById('mod-c').classList.add('hidden')" class="w-full text-gray-400 font-bold uppercase text-[10px] mt-2">Cerrar</button>
                </form>
            </div>
        </div>`;
    cargarClientes();
    document.getElementById('f-c').onsubmit = guardarOActualizarCliente;
}

async function cargarClientes() {
    const cont = document.getElementById('lista-c');
    try {
        const snap = await getDocs(query(collection(db, "clientes"), where("cobradorId", "==", auth.currentUser.uid)));
        cont.innerHTML = "";
        snap.forEach(d => {
            const c = d.data();
            cont.innerHTML += `
            <div class="bg-white p-4 rounded-2xl border flex justify-between items-center mb-2 shadow-sm">
                <div onclick="verDetalleCliente('${d.id}', '${c.nombre}', '${c.telefono}')" class="flex-1">
                    <p class="font-black text-gray-800 uppercase text-sm">${c.nombre}</p>
                    <p class="text-[10px] text-gray-400 font-bold">${c.telefono}</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="prepararEdicion('${d.id}', '${c.nombre}', '${c.telefono}')" class="text-blue-500 p-2"><i class="fas fa-edit"></i></button>
                    <button onclick="eliminarCliente('${d.id}')" class="text-red-400 p-2"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        });
    } catch (e) { alert("Error al cargar clientes"); }
}

async function guardarOActualizarCliente(e) {
    e.preventDefault();
    const btn = document.getElementById('mod-c-btn');
    btn.disabled = true; btn.innerText = "Guardando...";
    
    const id = document.getElementById('cid-edit').value;
    const datos = {
        nombre: document.getElementById('cnom').value,
        telefono: document.getElementById('ctel').value,
        cobradorId: auth.currentUser.uid,
        fecha: new Date()
    };

    try {
        if (id) {
            await updateDoc(doc(db, "clientes", id), { nombre: datos.nombre, telefono: datos.telefono });
        } else {
            await addDoc(collection(db, "clientes"), datos);
        }
        document.getElementById('mod-c').classList.add('hidden');
        renderClientes();
    } catch (error) {
        alert("Error crítico: " + error.message);
    } finally {
        btn.disabled = false; btn.innerText = "Guardar";
    }
}

// --- PRÉSTAMOS ---
async function renderPrestamos() {
    pageTitle.innerText = "Historial";
    mainContent.innerHTML = `<div id="lista-p" class="space-y-3 pb-24"></div>`;
    const snap = await getDocs(query(collection(db, "prestamos"), where("cobradorId", "==", auth.currentUser.uid)));
    const cont = document.getElementById('lista-p');
    if (snap.empty) { cont.innerHTML = `<p class="text-center py-20 text-gray-400">Sin préstamos</p>`; return; }
    snap.forEach(async d => {
        const p = d.data();
        cont.innerHTML += `<div class="bg-white p-5 rounded-3xl shadow-sm border mb-3 flex justify-between items-center">
            <div><p class="text-2xl font-black text-blue-600">$${p.total.toFixed(2)}</p><p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">${p.modalidad}</p></div>
            <button onclick="eliminarPrestamo('${d.id}')" class="text-red-300 p-2"><i class="fas fa-trash-alt"></i></button>
        </div>`;
    });
}

// --- PERFIL Y COBROS ---
window.verDetalleCliente = async (id, nombre, telefono) => {
    pageTitle.innerText = "Perfil";
    mainContent.innerHTML = `
        <div class="space-y-4 pb-24 px-2">
            <div class="bg-white p-6 rounded-[2rem] shadow-xl text-center border-b-4 border-blue-600">
                <h3 class="font-black text-xl text-gray-800 uppercase mb-4">${nombre}</h3>
                <div class="flex gap-2">
                    <button onclick="document.getElementById('mod-p').classList.remove('hidden')" class="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black text-xs shadow-lg">NUEVO PRÉSTAMO</button>
                    <a href="https://wa.me/${telefono}" class="bg-green-500 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"><i class="fab fa-whatsapp"></i></a>
                </div>
            </div>
            <div id="lista-cuotas-cliente" class="space-y-2"></div>
        </div>

        <div id="mod-p" class="fixed inset-0 bg-black/50 backdrop-blur-sm hidden flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
                <form id="f-p" class="space-y-3">
                    <input type="hidden" id="pid" value="${id}">
                    <input type="number" id="p_m" placeholder="Monto $" class="w-full p-4 border rounded-xl font-bold bg-gray-50" required>
                    <input type="number" id="p_i" value="20" placeholder="Interés %" class="w-full p-4 border rounded-xl font-bold bg-gray-50" required>
                    <input type="number" id="p_c" value="20" placeholder="Cuotas" class="w-full p-4 border rounded-xl font-bold bg-gray-50" required>
                    <select id="p_mod" class="w-full p-4 border rounded-xl font-bold bg-gray-50">
                        <option value="diario">Diario</option>
                        <option value="semanal">Semanal</option>
                        <option value="quincenal">Quincenal</option>
                        <option value="mensual">Mensual</option>
                    </select>
                    <button type="submit" id="btn-p" class="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase shadow-lg">Crear</button>
                    <button type="button" onclick="document.getElementById('mod-p').classList.add('hidden')" class="w-full text-gray-400 font-bold text-xs pt-2">Cerrar</button>
                </form>
            </div>
        </div>`;

    document.getElementById('f-p').onsubmit = guardarPrestamo;
    const snapC = await getDocs(query(collection(db, "cuotas"), where("clienteId", "==", id), orderBy("n", "asc")));
    const contC = document.getElementById('lista-cuotas-cliente');
    contC.innerHTML = snapC.empty ? `<p class="text-center py-10 text-gray-400 text-xs font-black uppercase">Sin cuotas</p>` : "";
    snapC.forEach(d => {
        const c = d.data();
        if (c.estado === "pendiente") {
            contC.innerHTML += `
                <div class="bg-white p-4 rounded-2xl shadow-sm border flex justify-between items-center mb-2">
                    <p class="font-black text-gray-800 text-sm">$${c.monto.toFixed(2)} <span class="text-[9px] text-gray-400 ml-2">#${c.n}</span></p>
                    <button onclick="registrarCobro('${d.id}', '${id}', '${nombre}', '${telefono}', '${c.monto.toFixed(2)}', '${c.n}')" class="bg-green-600 text-white px-5 py-2 rounded-xl font-black text-[10px]">COBRAR</button>
                </div>`;
        }
    });
};

window.registrarCobro = async (id, cid, cnom, ctel, monto, n) => {
    if (!confirm(`Cobrar $${monto}?`)) return;
    try {
        await updateDoc(doc(db, "cuotas", id), { estado: "pagado" });
        const msg = `🧾 *SISCOP - RECIBO DE PAGO*%0A👤 *Cliente:* ${cnom}%0A💰 *Monto:* $${monto}%0A🔢 *Cuota:* #${n}%0A📅 *Fecha:* ${new Date().toLocaleDateString()}`;
        window.open(`https://wa.me/${ctel}?text=${msg}`, '_blank');
        verDetalleCliente(cid, cnom, ctel);
    } catch (e) { alert("Error al cobrar"); }
};

async function renderCobros() {
    pageTitle.innerText = "Hoy";
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    mainContent.innerHTML = `<div id="lc" class="space-y-3 pb-24"></div>`;
    const snap = await getDocs(query(collection(db, "cuotas"), where("fecha", "==", Timestamp.fromDate(hoy)), where("estado", "==", "pendiente"), where("cobradorId", "==", auth.currentUser.uid)));
    const cont = document.getElementById('lc');
    if(snap.empty) { cont.innerHTML = `<p class="text-center py-20 text-gray-400 font-bold uppercase text-xs">🏖️ Libre</p>`; return; }
    for (const d of snap.docs) {
        const c = d.data(); const cliSnap = await getDoc(doc(db, "clientes", c.clienteId));
        cont.innerHTML += `<div class="bg-white p-5 rounded-3xl shadow-md border-l-8 border-blue-600 flex justify-between items-center">
            <p class="font-black text-gray-800 uppercase text-xs">${cliSnap.data().nombre}</p>
            <p class="text-blue-600 font-black text-lg">$${c.monto.toFixed(2)}</p>
            <button onclick="registrarCobro('${d.id}', '${c.clienteId}', '${cliSnap.data().nombre}', '${cliSnap.data().telefono}', '${c.monto.toFixed(2)}', '${c.n}')" class="bg-green-600 text-white px-5 py-2 rounded-xl font-black text-xs">OK</button>
        </div>`;
    }
}

async function renderMorosos() {
    pageTitle.innerText = "Atrasados";
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    mainContent.innerHTML = `<div id="lm" class="space-y-3 pb-24"></div>`;
    const snap = await getDocs(query(collection(db, "cuotas"), where("fecha", "<", Timestamp.fromDate(hoy)), where("estado", "==", "pendiente"), where("cobradorId", "==", auth.currentUser.uid)));
    const cont = document.getElementById('lm');
    if(snap.empty) { cont.innerHTML = `<p class="text-center py-20 text-gray-400 font-bold uppercase text-xs tracking-widest italic">Todo al día 👏</p>`; return; }
    for (const d of snap.docs) {
        const c = d.data(); const cliSnap = await getDoc(doc(db, "clientes", c.clienteId));
        cont.innerHTML += `<div class="bg-white p-5 rounded-3xl shadow-md border-l-8 border-red-600 flex justify-between items-center">
            <p class="font-black text-gray-800 uppercase text-xs">${cliSnap.data().nombre}</p>
            <p class="text-red-600 font-black text-lg">$${c.monto.toFixed(2)}</p>
            <button onclick="registrarCobro('${d.id}', '${c.clienteId}', '${cliSnap.data().nombre}', '${cliSnap.data().telefono}', '${c.monto.toFixed(2)}', '${c.n}')" class="bg-red-600 text-white px-5 py-2 rounded-xl font-black text-xs">OK</button>
        </div>`;
    }
}

async function guardarPrestamo(e) {
    e.preventDefault();
    const b = document.getElementById('btn-p'); b.disabled = true; b.innerText = "...";
    const cid = document.getElementById('pid').value, m = parseFloat(document.getElementById('p_m').value), i = parseFloat(document.getElementById('p_i').value), c = parseInt(document.getElementById('p_c').value), mod = document.getElementById('p_mod').value;
    const total = m * (1 + i / 100), vc = total / c;
    try {
        const pref = await addDoc(collection(db, "prestamos"), { clienteId: cid, total, vCuota: vc, modalidad: mod, estado: "activo", cobradorId: auth.currentUser.uid, fecha: new Date() });
        for (let j = 1; j <= c; j++) {
            let f = new Date(); f.setHours(0,0,0,0);
            if (mod === "diario") f.setDate(f.getDate() + j);
            else if (mod === "semanal") f.setDate(f.getDate() + (j * 7));
            else if (mod === "quincenal") f.setDate(f.getDate() + (j * 15));
            else if (mod === "mensual") f.setMonth(f.getMonth() + j);
            await addDoc(collection(db, "cuotas"), { prestamoId: pref.id, clienteId: cid, n: j, monto: vc, fecha: Timestamp.fromDate(f), estado: "pendiente", cobradorId: auth.currentUser.uid });
        }
        alert("PRESTAMO CREADO"); router('dashboard');
    } catch (err) { alert("Error al crear préstamo"); b.disabled = false; }
}

window.abrirModalCliente = () => { document.getElementById('mod-c').classList.remove('hidden'); document.getElementById('cid-edit').value = ""; document.getElementById('f-c').reset(); };
window.prepararEdicion = (id, n, t) => { document.getElementById('mod-c').classList.remove('hidden'); document.getElementById('cid-edit').value = id; document.getElementById('cnom').value = n; document.getElementById('ctel').value = t; };
window.eliminarCliente = async (id) => { if(confirm("¿Borrar?")) { await deleteDoc(doc(db, "clientes", id)); renderClientes(); } };
window.eliminarPrestamo = async (id) => { if(confirm("¿Borrar préstamo?")) { await deleteDoc(doc(db, "prestamos", id)); router('dashboard'); } };
btnLogout.onclick = () => signOut(auth);
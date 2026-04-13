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

// --- ENRUTADOR ---
window.router = (route) => {
    mainContent.innerHTML = `<div class="flex justify-center py-20"><div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>`;
    if (route === 'dashboard') renderDashboard();
    if (route === 'clientes') renderClientes();
    if (route === 'prestamos') renderPrestamos();
    if (route === 'cobros') renderCobros();
    if (route === 'morosos') renderMorosos();
    if (route === 'reportes') renderReportes();
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
    pageTitle.innerText = "Siscop - Entrar";
    mainContent.innerHTML = `
        <div class="max-w-md mx-auto bg-white p-8 rounded-[2rem] shadow-xl mt-6 text-center border-b-4 border-blue-600">
            <h2 class="text-3xl font-black text-blue-600 mb-6 uppercase italic">Siscop</h2>
            <form id="login-form" class="space-y-4 text-left">
                <input type="email" id="l-email" placeholder="Correo" class="w-full p-4 border rounded-2xl font-bold bg-gray-50 outline-none" required>
                <input type="password" id="l-pass" placeholder="Contraseña" class="w-full p-4 border rounded-2xl font-bold bg-gray-50 outline-none" required>
                <button type="submit" class="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase shadow-lg active:scale-95 transition-all">Entrar</button>
            </form>
        </div>`;
    document.getElementById('login-form').onsubmit = async (e) => {
        e.preventDefault();
        try { await signInWithEmailAndPassword(auth, document.getElementById('l-email').value, document.getElementById('l-pass').value); } 
        catch (error) { alert("Usuario o clave incorrectos"); }
    };
}

// --- DASHBOARD OPTIMIZADO ---
async function renderDashboard() {
    pageTitle.innerText = "Siscop";
    mainContent.innerHTML = `
        <div class="grid grid-cols-2 gap-3 mb-6 px-2">
            <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-green-500 text-center">
                <p class="text-gray-400 text-[9px] font-black uppercase">Cobrado Hoy</p>
                <p id="s-cobrado" class="text-xl font-black text-green-600">$0.00</p>
            </div>
            <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-blue-500 text-center">
                <p class="text-gray-400 text-[9px] font-black uppercase">Por Cobrar</p>
                <p id="s-acobrar" class="text-xl font-black text-blue-500">$0.00</p>
            </div>
            <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-orange-500 text-center">
                <p class="text-gray-400 text-[9px] font-black uppercase">Ganancia Hoy</p>
                <p id="s-ganancia" class="text-xl font-black text-orange-500">$0.00</p>
            </div>
            <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-red-500 text-center">
                <p class="text-gray-400 text-[9px] font-black uppercase">Deuda Calle</p>
                <p id="s-total" class="text-xl font-black text-red-500">$0.00</p>
            </div>
        </div>
        <div class="px-2 space-y-3">
            <button onclick="router('cobros')" class="w-full bg-blue-600 text-white p-5 rounded-3xl font-black shadow-lg active:scale-95 transition-all">RUTA DE COBRO</button>
            <button onclick="router('prestamos')" class="w-full bg-white border-2 p-4 rounded-2xl font-bold text-gray-700 text-xs uppercase shadow-sm">Historial de Préstamos</button>
        </div>`;

    try {
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        const snapC = await getDocs(query(collection(db, "cuotas"), where("cobradorId", "==", auth.currentUser.uid)));
        let cob = 0, acob = 0, gan = 0, deudaCalle = 0;
        snapC.forEach(d => {
            const c = d.data(); if(!c.fecha) return;
            const f = c.fecha.toDate(); f.setHours(0,0,0,0);
            if (c.estado === "pendiente") {
                deudaCalle += c.monto;
                if (f.getTime() === hoy.getTime()) acob += c.monto;
            } else if (c.estado === "pagado" && f.getTime() === hoy.getTime()) {
                cob += c.monto; gan += (c.monto * 0.166);
            }
        });
        document.getElementById('s-cobrado').innerText = `$${cob.toFixed(2)}`;
        document.getElementById('s-acobrar').innerText = `$${acob.toFixed(2)}`;
        document.getElementById('s-ganancia').innerText = `$${gan.toFixed(2)}`;
        document.getElementById('s-total').innerText = `$${deudaCalle.toFixed(2)}`;
    } catch (e) { console.error(e); }
}

// --- CLIENTES (FUNCIONES ÚNICAS) ---
function renderClientes() {
    pageTitle.innerText = "Clientes";
    mainContent.innerHTML = `
        <div class="flex gap-2 mb-4 px-2">
            <input type="text" id="busc-cli" placeholder="Buscar..." class="w-full p-4 border rounded-2xl font-bold">
            <button onclick="abrirModalCliente()" class="bg-blue-600 text-white p-4 rounded-2xl shadow-lg"><i class="fas fa-plus"></i></button>
        </div>
        <div id="lista-c" class="space-y-2 pb-24 px-2"></div>
        <div id="mod-c" class="fixed inset-0 bg-black/50 backdrop-blur-sm hidden flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
                <form id="f-c" class="space-y-4">
                    <h3 id="mod-c-title" class="font-black text-center uppercase">Cliente</h3>
                    <input type="hidden" id="cid-edit">
                    <input type="text" id="cnom" placeholder="Nombre completo" class="w-full p-4 border rounded-xl font-bold bg-gray-50" required>
                    <input type="tel" id="ctel" placeholder="WhatsApp" class="w-full p-4 border rounded-xl font-bold bg-gray-50" required>
                    <button type="submit" id="mod-c-btn" class="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase">Guardar</button>
                    <button type="button" onclick="document.getElementById('mod-c').classList.add('hidden')" class="w-full text-gray-400 font-bold uppercase text-[10px] mt-2">Cerrar</button>
                </form>
            </div>
        </div>`;
    cargarClientes();
    document.getElementById('f-c').onsubmit = guardarOActualizarCliente;
}

async function cargarClientes() {
    const cont = document.getElementById('lista-c');
    const snap = await getDocs(query(collection(db, "clientes"), where("cobradorId", "==", auth.currentUser.uid), orderBy("nombre", "asc")));
    cont.innerHTML = "";
    snap.forEach(d => {
        const c = d.data();
        cont.innerHTML += `
        <div class="bg-white p-4 rounded-2xl border flex justify-between items-center mb-2 shadow-sm">
            <div onclick="verDetalleCliente('${d.id}', '${c.nombre}', '${c.telefono}')" class="flex-1 cursor-pointer">
                <p class="font-black text-gray-800 uppercase text-sm">${c.nombre}</p>
                <p class="text-[10px] text-gray-400 font-bold tracking-widest">${c.telefono}</p>
            </div>
            <div class="flex gap-2">
                <button onclick="prepararEdicion('${d.id}', '${c.nombre}', '${c.telefono}')" class="text-blue-500 bg-blue-50 w-10 h-10 rounded-full flex items-center justify-center"><i class="fas fa-edit"></i></button>
                <button onclick="eliminarCliente('${d.id}')" class="text-red-400 bg-red-50 w-10 h-10 rounded-full flex items-center justify-center"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    });
}

async function guardarOActualizarCliente(e) {
    e.preventDefault();
    const id = document.getElementById('cid-edit').value;
    const datos = { nombre: document.getElementById('cnom').value, telefono: document.getElementById('ctel').value, cobradorId: auth.currentUser.uid, fecha: new Date() };
    if (id) await updateDoc(doc(db, "clientes", id), { nombre: datos.nombre, telefono: datos.telefono });
    else await addDoc(collection(db, "clientes"), datos);
    document.getElementById('mod-c').classList.add('hidden');
    renderClientes();
}

// --- PRÉSTAMOS (HISTORIAL COMPLETO) ---
async function renderPrestamos() {
    pageTitle.innerText = "Historial";
    mainContent.innerHTML = `<div id="lista-p" class="space-y-4 pb-24 px-2"></div>`;
    const cont = document.getElementById('lista-p');
    const snapP = await getDocs(query(collection(db, "prestamos"), where("cobradorId", "==", auth.currentUser.uid), orderBy("fecha", "desc")));
    
    if (snapP.empty) { cont.innerHTML = `<p class="text-center py-20 text-gray-400 font-black uppercase text-xs">Sin préstamos</p>`; return; }

    for (const d of snapP.docs) {
        const p = d.data();
        const cliS = await getDoc(doc(db, "clientes", p.clienteId));
        const qC = query(collection(db, "cuotas"), where("prestamoId", "==", d.id));
        const snapC = await getDocs(qC);
        let pagadas = 0, saldo = 0;
        snapC.forEach(cd => { if(cd.data().estado === "pagado") pagadas++; else saldo += cd.data().monto; });

        cont.innerHTML += `
            <div class="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 mb-3">
                <div class="flex justify-between items-start mb-2">
                    <div><p class="text-blue-600 font-black uppercase text-xs">${cliS.exists() ? cliS.data().nombre : '---'}</p><p class="text-[9px] font-bold text-gray-400 uppercase">${p.modalidad}</p></div>
                    <button onclick="eliminarPrestamo('${d.id}')" class="text-red-300"><i class="fas fa-trash-alt"></i></button>
                </div>
                <div class="flex justify-between items-end border-t pt-2">
                    <div><p class="text-[9px] font-black text-gray-400 uppercase">Deben aún</p><p class="text-xl font-black text-gray-800">$${saldo.toFixed(2)}</p></div>
                    <p class="text-xs font-black text-green-600">${pagadas} / ${snapC.size} <span class="text-[9px] text-gray-400 uppercase">Cuotas</span></p>
                </div>
            </div>`;
    }
}

// --- PERFIL Y COBRO ---
window.verDetalleCliente = async (id, nombre, telefono) => {
    pageTitle.innerText = "Perfil";
    mainContent.innerHTML = `
        <div class="space-y-4 pb-24 px-2">
            <div class="bg-white p-8 rounded-[2.5rem] shadow-xl text-center border-b-4 border-blue-600">
                <h3 class="font-black text-xl text-gray-800 uppercase mb-4">${nombre}</h3>
                <div class="flex gap-2">
                    <button onclick="document.getElementById('mod-p').classList.remove('hidden')" class="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black text-xs shadow-lg">+ NUEVO PRÉSTAMO</button>
                    <a href="https://wa.me/${telefono}" class="bg-green-500 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"><i class="fab fa-whatsapp"></i></a>
                </div>
            </div>
            <div id="lista-cuotas-cliente" class="space-y-2"></div>
        </div>
        <div id="mod-p" class="fixed inset-0 bg-black/50 backdrop-blur-sm hidden flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
                <form id="f-p" class="space-y-3 text-left">
                    <input type="hidden" id="pid" value="${id}">
                    <label class="text-[10px] font-black text-gray-400 uppercase ml-2">Monto ($)</label>
                    <input type="number" id="p_m" placeholder="5000" class="w-full p-4 border rounded-xl font-bold bg-gray-50 outline-none" required>
                    <label class="text-[10px] font-black text-gray-400 uppercase ml-2">Interés (%)</label>
                    <input type="number" id="p_i" value="20" class="w-full p-4 border rounded-xl font-bold bg-gray-50 outline-none" required>
                    <label class="text-[10px] font-black text-gray-400 uppercase ml-2">Cuotas</label>
                    <input type="number" id="p_c" value="20" class="w-full p-4 border rounded-xl font-bold bg-gray-50 outline-none" required>
                    <label class="text-[10px] font-black text-gray-400 uppercase ml-2">Frecuencia</label>
                    <select id="p_mod" class="w-full p-4 border rounded-xl font-bold bg-gray-50 outline-none">
                        <option value="Diario">Diario</option><option value="Semanal">Semanal</option><option value="Quincenal">Quincenal</option><option value="Mensual">Mensual</option>
                    </select>
                    <button type="submit" id="btn-p" class="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase shadow-lg">Crear</button>
                    <button type="button" onclick="document.getElementById('mod-p').classList.add('hidden')" class="w-full text-gray-400 font-bold text-[10px] uppercase py-2">Cancelar</button>
                </form>
            </div>
        </div>`;
    document.getElementById('f-p').onsubmit = guardarPrestamo;
    const snapC = await getDocs(query(collection(db, "cuotas"), where("clienteId", "==", id), orderBy("n", "asc")));
    const contC = document.getElementById('lista-cuotas-cliente');
    snapC.forEach(d => {
        const c = d.data();
        if (c.estado === "pendiente") {
            contC.innerHTML += `<div class="bg-white p-4 rounded-2xl shadow-sm border flex justify-between items-center mb-2 animate-nudge">
                <p class="font-black text-gray-800 text-sm">$${c.monto.toFixed(2)} <span class="text-[9px] text-gray-400 ml-2">#${c.n}</span></p>
                <button onclick="registrarCobro('${d.id}', '${id}', '${nombre}', '${telefono}', '${c.monto.toFixed(2)}', '${c.n}')" class="bg-green-600 text-white px-5 py-2 rounded-xl font-black text-[10px] shadow-md">COBRAR</button>
            </div>`;
        }
    });
};

window.registrarCobro = async (id, cid, cnom, ctel, monto, n) => {
    if (!confirm(`¿Cobrar cuota #${n}?`)) return;
    try {
        await updateDoc(doc(db, "cuotas", id), { estado: "pagado" });
        window.open(`https://wa.me/${ctel}?text=🧾 *SISCOP* Recibo de Pago%0A👤 ${cnom}%0A💰 $${monto}%0A🔢 Cuota #${n}`, '_blank');
        verDetalleCliente(cid, cnom, ctel);
    } catch (e) { alert("Error"); }
};

// --- MÓDULOS DE RUTA ---
async function renderCobros() {
    pageTitle.innerText = "Hoy";
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    mainContent.innerHTML = `<div id="lc" class="space-y-3 pb-24 px-2"></div>`;
    const snap = await getDocs(query(collection(db, "cuotas"), where("fecha", "==", Timestamp.fromDate(hoy)), where("estado", "==", "pendiente"), where("cobradorId", "==", auth.currentUser.uid)));
    const cont = document.getElementById('lc');
    if(snap.empty) { cont.innerHTML = `<p class="text-center py-20 text-gray-400 font-bold uppercase text-[10px]">Libre hoy🏖️</p>`; return; }
    for (const d of snap.docs) {
        const c = d.data(); const cliSnap = await getDoc(doc(db, "clientes", c.clienteId));
        cont.innerHTML += `<div class="bg-white p-5 rounded-3xl shadow-md border-l-8 border-blue-600 flex justify-between items-center mb-2">
            <p class="font-black text-gray-800 uppercase text-xs">${cliSnap.data().nombre}</p>
            <p class="text-blue-600 font-black text-lg">$${c.monto.toFixed(2)}</p>
            <button onclick="registrarCobro('${d.id}', '${c.clienteId}', '${cliSnap.data().nombre}', '${cliSnap.data().telefono}', '${c.monto.toFixed(2)}', '${c.n}')" class="bg-green-600 text-white px-5 py-2 rounded-xl font-black text-xs shadow-lg">OK</button>
        </div>`;
    }
}

async function renderMorosos() {
    pageTitle.innerText = "Atrasados";
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    mainContent.innerHTML = `<div id="lm" class="space-y-3 pb-24 px-2"></div>`;
    const snap = await getDocs(query(collection(db, "cuotas"), where("fecha", "<", Timestamp.fromDate(hoy)), where("estado", "==", "pendiente"), where("cobradorId", "==", auth.currentUser.uid)));
    const cont = document.getElementById('lm');
    if(snap.empty) { cont.innerHTML = `<p class="text-center py-20 text-gray-400 font-bold uppercase text-[10px]">Al día👏</p>`; return; }
    for (const d of snap.docs) {
        const c = d.data(); const cliSnap = await getDoc(doc(db, "clientes", c.clienteId));
        cont.innerHTML += `<div class="bg-white p-5 rounded-3xl shadow-md border-l-8 border-red-600 flex justify-between items-center mb-2">
            <p class="font-black text-gray-800 uppercase text-xs">${cliSnap.data().nombre}</p>
            <p class="text-red-600 font-black text-lg">$${c.monto.toFixed(2)}</p>
            <button onclick="registrarCobro('${d.id}', '${c.clienteId}', '${cliSnap.data().nombre}', '${cliSnap.data().telefono}', '${c.monto.toFixed(2)}', '${c.n}')" class="bg-red-600 text-white px-5 py-2 rounded-xl font-black text-xs shadow-lg">OK</button>
        </div>`;
    }
}

// --- AUXILIARES ---
window.abrirModalCliente = () => { document.getElementById('mod-c').classList.remove('hidden'); document.getElementById('cid-edit').value = ""; document.getElementById('f-c').reset(); };
window.prepararEdicion = (id, n, t) => { document.getElementById('mod-c').classList.remove('hidden'); document.getElementById('cid-edit').value = id; document.getElementById('cnom').value = n; document.getElementById('ctel').value = t; };
window.eliminarCliente = async (id) => { if(confirm("¿Borrar?")) { await deleteDoc(doc(db, "clientes", id)); renderClientes(); } };
window.eliminarPrestamo = async (id) => { if(confirm("¿Borrar Préstamo?")) { await deleteDoc(doc(db, "prestamos", id)); const s = await getDocs(query(collection(db, "cuotas"), where("prestamoId", "==", id))); s.forEach(async (c) => await deleteDoc(doc(db, "cuotas", c.id))); renderPrestamos(); } };
async function guardarPrestamo(e) {
    e.preventDefault();
    const b = document.getElementById('btn-p'); b.disabled = true; b.innerText = "...";
    const cid = document.getElementById('pid').value, m = parseFloat(document.getElementById('p_m').value), i = parseFloat(document.getElementById('p_i').value), c = parseInt(document.getElementById('p_c').value), mod = document.getElementById('p_mod').value;
    const total = m * (1 + i / 100), vc = total / c;
    try {
        const pref = await addDoc(collection(db, "prestamos"), { clienteId: cid, total, monto: m, interes: i, vCuota: vc, modalidad: mod, estado: "activo", cobradorId: auth.currentUser.uid, fecha: new Date() });
        for (let j = 1; j <= c; j++) {
            let f = new Date(); f.setHours(0,0,0,0);
            if (mod === "Diario") f.setDate(f.getDate() + j);
            else if (mod === "Semanal") f.setDate(f.getDate() + (j * 7));
            else if (mod === "Quincenal") f.setDate(f.getDate() + (j * 15));
            else if (mod === "Mensual") f.setMonth(f.getMonth() + j);
            await addDoc(collection(db, "cuotas"), { prestamoId: pref.id, clienteId: cid, n: j, monto: vc, fecha: Timestamp.fromDate(f), estado: "pendiente", cobradorId: auth.currentUser.uid });
        }
        alert("CREADO"); router('dashboard');
    } catch (err) { b.disabled = false; }
}
function renderReportes() { router('dashboard'); } // Simplificado por velocidad
btnLogout.onclick = () => signOut(auth);
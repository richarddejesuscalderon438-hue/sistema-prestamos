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
    const currentRoute = route || window.location.hash.replace('#', '') || 'dashboard';
    if (route) window.location.hash = route;
    mainContent.innerHTML = `<div class="flex justify-center py-20"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>`;
    
    if (currentRoute === 'dashboard') uiDashboard();
    if (currentRoute === 'clientes') uiClientes();
    if (currentRoute === 'prestamos') uiPrestamos();
    if (currentRoute === 'cobros') uiCobros();
    if (currentRoute.startsWith('perfil-')) uiCargarPerfilDesdeURL(currentRoute.split('-')[1]);
};

window.addEventListener('hashchange', () => router());
onAuthStateChanged(auth, (user) => {
    if (user) { bottomNav.classList.remove('hidden'); btnLogout.classList.remove('hidden'); router(); } 
    else { bottomNav.classList.add('hidden'); btnLogout.classList.add('hidden'); uiLogin(); }
});

function uiLogin() {
    pageTitle.innerText = "Siscop - Entrar";
    mainContent.innerHTML = `<div class="max-w-md mx-auto bg-white p-8 rounded-[2rem] shadow-xl mt-6 text-center border-b-4 border-blue-600">
        <h2 class="text-3xl font-black text-blue-600 mb-6 uppercase italic">Entrar</h2>
        <form id="f-login" class="space-y-4">
            <input type="email" id="log-email" placeholder="Correo" class="w-full p-4 border rounded-2xl font-bold bg-gray-50 outline-none focus:border-blue-600" required>
            <input type="password" id="log-pass" placeholder="Contraseña" class="w-full p-4 border rounded-2xl font-bold bg-gray-50 outline-none focus:border-blue-600" required>
            <button type="submit" class="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase shadow-lg">Ingresar</button>
        </form>
    </div>`;
    document.getElementById('f-login').onsubmit = async (e) => {
        e.preventDefault();
        try { await signInWithEmailAndPassword(auth, document.getElementById('log-email').value, document.getElementById('log-pass').value); } 
        catch (error) { alert("Acceso denegado"); }
    };
}

// --- DASHBOARD ---
async function uiDashboard() {
    pageTitle.innerText = "Inicio";
    mainContent.innerHTML = `
        <div class="grid grid-cols-2 gap-3 mb-6 px-2">
            <div class="bg-white p-4 rounded-3xl shadow-sm border-l-4 border-green-500 text-center">
                <p class="text-gray-400 text-[9px] font-black uppercase">Cobrado Hoy</p>
                <p id="d-cobrado" class="text-xl font-black text-green-600">$0.00</p>
            </div>
            <div class="bg-white p-4 rounded-3xl shadow-sm border-l-4 border-blue-500 text-center">
                <p class="text-gray-400 text-[9px] font-black uppercase">En la Calle</p>
                <p id="d-total" class="text-xl font-black text-blue-600">$0.00</p>
            </div>
        </div>
        <div class="px-2 space-y-4">
            <button onclick="router('cobros')" class="w-full bg-blue-600 text-white p-6 rounded-[2rem] font-black shadow-xl flex items-center justify-between active:scale-95 transition-all">
                <span>RUTA DE COBRO</span>
                <i class="fas fa-route text-xl"></i>
            </button>
            <button onclick="router('clientes')" class="w-full bg-white border-2 p-6 rounded-[2rem] font-black text-gray-700 flex items-center justify-between active:scale-95 transition-all">
                <span>CLIENTES</span>
                <i class="fas fa-users text-xl text-blue-600"></i>
            </button>
        </div>`;

    const snap = await getDocs(query(collection(db, "prestamos"), where("cobradorId", "==", auth.currentUser.uid), where("estado", "==", "activo")));
    let tot = 0; snap.forEach(d => tot += d.data().saldoActual);
    document.getElementById('d-total').innerText = `$${tot.toFixed(2)}`;

    const snapA = await getDocs(query(collection(db, "abonos"), where("cobradorId", "==", auth.currentUser.uid)));
    let cob = 0; const hoy = new Date().toDateString();
    snapA.forEach(d => { if(d.data().fecha.toDate().toDateString() === hoy) cob += d.data().monto; });
    document.getElementById('d-cobrado').innerText = `$${cob.toFixed(2)}`;
}

// --- CLIENTES ---
function uiClientes() {
    pageTitle.innerText = "Clientes";
    mainContent.innerHTML = `
        <div class="flex gap-2 mb-4 px-2">
            <input type="text" id="b-cli" placeholder="Buscar..." class="w-full p-4 border rounded-2xl font-bold outline-none bg-white shadow-sm">
            <button onclick="document.getElementById('m-c').classList.remove('hidden')" class="bg-blue-600 text-white p-4 rounded-2xl shadow-lg"><i class="fas fa-plus"></i></button>
        </div>
        <div id="l-c" class="space-y-2 pb-24 px-2"></div>
        <div id="m-c" class="fixed inset-0 bg-black/40 backdrop-blur-sm hidden flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl">
                <form id="f-c-nuevo" class="space-y-4">
                    <h3 class="font-black text-center uppercase text-gray-700">Nuevo Cliente</h3>
                    <input type="text" id="n-nom" placeholder="Nombre" class="w-full p-4 border rounded-xl font-bold bg-gray-50 outline-none" required>
                    <input type="tel" id="n-tel" placeholder="WhatsApp" class="w-full p-4 border rounded-xl font-bold bg-gray-50 outline-none" required>
                    <button type="submit" id="b-save-c" class="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase shadow-lg">Guardar</button>
                    <button type="button" onclick="document.getElementById('m-c').classList.add('hidden')" class="w-full text-gray-400 font-bold text-[10px] uppercase mt-2">Cerrar</button>
                </form>
            </div>
        </div>`;
    const loadC = async () => {
        const snap = await getDocs(query(collection(db, "clientes"), where("cobradorId", "==", auth.currentUser.uid), orderBy("nombre", "asc")));
        const cont = document.getElementById('l-c'); cont.innerHTML = "";
        snap.forEach(d => {
            const c = d.data();
            cont.innerHTML += `<div class="bg-white p-5 rounded-[2rem] border flex justify-between items-center mb-2 shadow-sm active:bg-gray-50" onclick="router('perfil-${d.id}')">
                <div class="flex-1"><p class="font-black text-gray-800 uppercase text-sm">${c.nombre}</p><p class="text-[10px] text-gray-400 font-bold">${c.telefono}</p></div>
                <button onclick="event.stopPropagation(); deleteC('${d.id}')" class="text-red-300 p-2"><i class="fas fa-trash-alt"></i></button>
            </div>`;
        });
    };
    loadC();
    document.getElementById('f-c-nuevo').onsubmit = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, "clientes"), { nombre: document.getElementById('n-nom').value, telefono: document.getElementById('n-tel').value, cobradorId: auth.currentUser.uid, fecha: new Date() });
        document.getElementById('m-c').classList.add('hidden'); uiClientes();
    };
}

// --- PERFIL Y COBROS ---
window.verPerfil = async (id, nombre, telefono) => {
    window.location.hash = `perfil-${id}`;
    pageTitle.innerText = "Perfil";
    mainContent.innerHTML = `
        <div class="space-y-4 pb-24 px-2">
            <div class="bg-white p-10 rounded-[3rem] shadow-xl text-center border-b-[10px] border-blue-600">
                <h3 class="font-black text-2xl text-gray-800 uppercase mb-6 tracking-tight">${nombre}</h3>
                <div class="flex gap-3 justify-center">
                    <button onclick="document.getElementById('mod-p').classList.remove('hidden')" class="flex-1 bg-blue-600 text-white p-5 rounded-2xl font-black text-xs shadow-lg uppercase tracking-widest">+ PRÉSTAMO</button>
                    <a href="https://wa.me/${telefono}" class="bg-green-500 text-white w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shadow-lg"><i class="fab fa-whatsapp"></i></a>
                </div>
            </div>
            <div id="l-p-c" class="space-y-3"></div>
        </div>
        <div id="mod-p" class="fixed inset-0 bg-black/50 backdrop-blur-sm hidden flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
                <form id="f-p-final" class="space-y-3">
                    <h3 class="font-black text-center text-gray-700 uppercase mb-4 text-xl">Nuevo Préstamo</h3>
                    <input type="number" id="p-m" placeholder="Monto $" class="w-full p-4 border rounded-xl font-bold bg-gray-50 outline-none" required>
                    <input type="number" id="p-i" value="20" class="w-full p-4 border rounded-xl font-bold bg-gray-50 outline-none" required>
                    <input type="number" id="p-c" value="20" class="w-full p-4 border rounded-xl font-bold bg-gray-50 outline-none" required>
                    <select id="p-mod" class="w-full p-4 border rounded-xl font-bold bg-gray-50 outline-none">
                        <option value="Diario">Diario</option><option value="Semanal">Semanal</option><option value="Quincenal">Quincenal</option><option value="Mensual">Mensual</option>
                    </select>
                    <div id="p-calc" class="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100 text-center my-4">
                        <p id="res-total" class="font-black text-gray-800 text-lg">Total: $0.00</p>
                        <p id="res-cuota" class="font-bold text-blue-500 text-sm">Cuotas de: $0.00</p>
                    </div>
                    <button type="submit" id="btn-p-save" class="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase shadow-xl mt-2">Crear</button>
                </form>
            </div>
        </div>`;

    const inM = document.getElementById('p-m'), inI = document.getElementById('p-i'), inC = document.getElementById('p-c'), rT = document.getElementById('res-total'), rC = document.getElementById('res-cuota');
    const updateCalc = () => {
        const m = parseFloat(inM.value) || 0, i = parseFloat(inI.value) || 0, c = parseInt(inC.value) || 1;
        const total = m + (m * (i/100)); rT.innerText = `Total: $${total.toFixed(2)}`; rC.innerText = `Cuotas de: $${(total/c).toFixed(2)}`;
    };
    inM.oninput = updateCalc; inI.oninput = updateCalc; inC.oninput = updateCalc;

    document.getElementById('f-p-final').onsubmit = async (e) => {
        e.preventDefault();
        const m = parseFloat(inM.value), i = parseFloat(inI.value), c = parseInt(inC.value), mod = document.getElementById('p-mod').value, total = m + (m * (i/100));
        let prox = new Date(); prox.setHours(0,0,0,0); prox.setDate(prox.getDate() + 1);
        await addDoc(collection(db, "prestamos"), { clienteId: id, totalConInteres: total, saldoActual: total, cuotaMonto: total/c, modalidad: mod, proximoPago: Timestamp.fromDate(prox), estado: "activo", cobradorId: auth.currentUser.uid, fecha: new Date() });
        alert("PRÉSTAMO CREADO"); router('prestamos');
    };

    const contP = document.getElementById('l-p-c'); contP.innerHTML = "";
    const snapP = await getDocs(query(collection(db, "prestamos"), where("clienteId", "==", id), where("estado", "==", "activo")));
    snapP.forEach(d => {
        const p = d.data();
        contP.innerHTML += `<div class="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-50 text-left animate-nudge">
            <p class="text-[10px] font-black text-gray-400 uppercase mb-1">Saldo Pendiente</p>
            <p class="text-4xl font-black text-blue-600 mb-6">$${p.saldoActual.toFixed(2)}</p>
            <div class="flex gap-3">
                <input type="number" id="abono-${d.id}" placeholder="Monto" class="w-1/2 p-5 border-2 border-gray-50 rounded-2xl font-black bg-gray-50 outline-none">
                <button onclick="regAbono('${d.id}', '${id}', '${nombre}', '${telefono}')" class="flex-1 bg-green-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg">Abonar</button>
            </div>
        </div>`;
    });
};

window.regAbono = async (pId, cId, cNom, cTel) => {
    const val = document.getElementById(`abono-${pId}`).value;
    if (!val || val <= 0) return alert("Escribe un monto");
    const pDoc = doc(db, "prestamos", pId); const snap = await getDoc(pDoc);
    const pData = snap.data();
    const nuevoSaldo = pData.saldoActual - parseFloat(val);
    
    // Calcular proxima fecha segun modalidad
    let nProx = pData.proximoPago.toDate();
    if(pData.modalidad === "Diario") nProx.setDate(nProx.getDate() + 1);
    else if(pData.modalidad === "Semanal") nProx.setDate(nProx.getDate() + 7);
    else if(pData.modalidad === "Quincenal") nProx.setDate(nProx.getDate() + 15);
    else if(pData.modalidad === "Mensual") nProx.setMonth(nProx.getMonth() + 1);

    await updateDoc(pDoc, { saldoActual: nuevoSaldo, estado: nuevoSaldo <= 0 ? "pagado" : "activo", proximoPago: Timestamp.fromDate(nProx) });
    await addDoc(collection(db, "abonos"), { prestamoId: pId, monto: parseFloat(val), fecha: new Date(), cobradorId: auth.currentUser.uid });
    alert("PAGO REGISTRADO"); 
    window.open(`https://wa.me/${cTel}?text=🧾 *SISCOP* Recibo de Pago%0A👤 ${cNom}%0A💰 $${val}%0A✅ Saldo: $${nuevoSaldo.toFixed(2)}`, '_blank');
    verPerfil(cId, cNom, cTel);
};

// --- MÓDULO COBROS (RUTA DEL DÍA) ---
async function uiCobros() {
    pageTitle.innerText = "Ruta de Hoy";
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const snap = await getDocs(query(collection(db, "prestamos"), where("cobradorId", "==", auth.currentUser.uid), where("estado", "==", "activo")));
    const cont = document.getElementById('main-content');
    cont.innerHTML = `<div id="lc" class="space-y-3 pb-24 px-2"></div>`;
    let count = 0;
    for (const d of snap.docs) {
        const p = d.data();
        if (p.proximoPago.toDate() <= hoy) {
            count++;
            const cliS = await getDoc(doc(db, "clientes", p.clienteId));
            const c = cliS.data();
            document.getElementById('lc').innerHTML += `<div class="bg-white p-6 rounded-[2rem] shadow-md border-l-8 border-blue-600 flex justify-between items-center mb-2 animate-nudge">
                <div class="flex-1"><p class="font-black text-gray-800 uppercase text-sm">${c.nombre}</p><p class="text-blue-600 font-black text-lg">$${p.cuotaMonto.toFixed(2)}</p></div>
                <button onclick="verPerfil('${p.clienteId}', '${c.nombre}', '${c.telefono}')" class="bg-green-600 text-white h-14 px-6 rounded-2xl font-black text-xs shadow-lg uppercase">Cobrar</button>
            </div>`;
        }
    }
    if(count === 0) document.getElementById('lc').innerHTML = `<p class="text-center py-20 text-gray-400 font-black uppercase text-xs">🏝️ No hay cobros para hoy</p>`;
}

async function uiPrestamos() {
    pageTitle.innerText = "Historial";
    const snap = await getDocs(query(collection(db, "prestamos"), where("cobradorId", "==", auth.currentUser.uid), orderBy("fecha", "desc")));
    const cont = document.getElementById('main-content');
    cont.innerHTML = `<div id="l-his" class="space-y-4 pb-24 px-2"></div>`;
    if(snap.empty) { document.getElementById('l-his').innerHTML = `<p class="text-center py-20 text-gray-400 font-black uppercase text-xs">Sin registros</p>`; return; }
    for (const d of snap.docs) {
        const p = d.data(); const cliS = await getDoc(doc(db, "clientes", p.clienteId));
        const c = cliS.data() || {nombre: "---"};
        document.getElementById('l-his').innerHTML += `
        <div class="bg-white p-6 rounded-[2rem] shadow-sm border flex justify-between items-center mb-3">
            <div class="flex-1" onclick="verPerfil('${p.clienteId}', '${c.nombre}', '${c.telefono}')">
                <p class="text-blue-600 font-black uppercase text-[10px]">${c.nombre}</p>
                <p class="text-xl font-black text-gray-800">$${p.totalConInteres.toFixed(2)}</p>
                <p class="text-[9px] font-bold text-gray-400 uppercase">Saldo: $${p.saldoActual.toFixed(2)} | ${p.modalidad}</p>
            </div>
            <button onclick="deleteP('${d.id}')" class="text-red-300 p-2"><i class="fas fa-trash-alt"></i></button>
        </div>`;
    }
}

async function uiCargarPerfilDesdeURL(id) {
    const cliDoc = await getDoc(doc(db, "clientes", id));
    if (cliDoc.exists()) { const c = cliDoc.data(); verPerfil(id, c.nombre, c.telefono); } 
    else { router('clientes'); }
}

window.deleteC = async (id) => { if(confirm("¿Borrar cliente?")) { await deleteDoc(doc(db, "clientes", id)); uiClientes(); } };
window.deleteP = async (id) => { if(confirm("¿Borrar préstamo?")) { await deleteDoc(doc(db, "prestamos", id)); uiPrestamos(); } };
btnLogout.onclick = () => signOut(auth);
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

// --- NAVEGADOR ---
window.router = (route) => {
    mainContent.innerHTML = `<div class="flex justify-center py-20"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>`;
    if (route === 'dashboard') uiDashboard();
    if (route === 'clientes') uiClientes();
    if (route === 'prestamos') uiHistorial();
    if (route === 'cobros') uiCobros();
    if (route === 'morosos') uiMorosos();
};

onAuthStateChanged(auth, (user) => {
    if (user) { 
        bottomNav.classList.remove('hidden'); 
        btnLogout.classList.remove('hidden'); 
        router('dashboard'); 
    } else { 
        bottomNav.classList.add('hidden'); 
        btnLogout.classList.add('hidden'); 
        uiLogin(); 
    }
});

function uiLogin() {
    pageTitle.innerText = "Entrar";
    mainContent.innerHTML = `
        <div class="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl mt-6 text-center">
            <h2 class="text-3xl font-black text-blue-600 mb-6 uppercase">Siscop</h2>
            <form id="f-login" class="space-y-4">
                <input type="email" id="log-email" placeholder="Correo" class="w-full p-4 border rounded-2xl font-bold bg-gray-50" required>
                <input type="password" id="log-pass" placeholder="Clave" class="w-full p-4 border rounded-2xl font-bold bg-gray-50" required>
                <button type="submit" class="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase shadow-lg">Entrar</button>
            </form>
        </div>`;
    document.getElementById('f-login').onsubmit = async (e) => {
        e.preventDefault();
        try { await signInWithEmailAndPassword(auth, document.getElementById('log-email').value, document.getElementById('log-pass').value); } 
        catch (error) { alert("Error: Usuario incorrecto"); }
    };
}

// --- DASHBOARD (RÁPIDO) ---
async function uiDashboard() {
    pageTitle.innerText = "Siscop";
    mainContent.innerHTML = `
        <div class="grid grid-cols-2 gap-3 mb-6">
            <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-green-500 text-center">
                <p class="text-gray-400 text-[9px] font-black uppercase">Cobrado Hoy</p>
                <p id="d-cobrado" class="text-xl font-black text-green-600">$0.00</p>
            </div>
            <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-blue-500 text-center">
                <p class="text-gray-400 text-[9px] font-black uppercase">En la Calle</p>
                <p id="d-total" class="text-xl font-black text-blue-600">$0.00</p>
            </div>
        </div>
        <button onclick="router('cobros')" class="w-full bg-blue-600 text-white p-5 rounded-3xl font-black shadow-lg mb-6 active:scale-95 transition-all">RUTA DE COBRO</button>
        <div class="grid grid-cols-2 gap-2">
            <button onclick="router('clientes')" class="bg-gray-100 p-4 rounded-2xl font-bold text-gray-700 text-[10px] uppercase">Directorio</button>
            <button onclick="router('prestamos')" class="bg-gray-100 p-4 rounded-2xl font-bold text-gray-700 text-[10px] uppercase">Historial</button>
        </div>`;

    const snap = await getDocs(query(collection(db, "cuotas"), where("cobradorId", "==", auth.currentUser.uid)));
    let cob = 0, tot = 0;
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    snap.forEach(d => {
        const c = d.data();
        if(c.estado === "pendiente") tot += c.monto;
        if(c.estado === "pagado" && c.fecha.toDate().toDateString() === hoy.toDateString()) cob += c.monto;
    });
    document.getElementById('d-cobrado').innerText = `$${cob.toFixed(2)}`;
    document.getElementById('d-total').innerText = `$${tot.toFixed(2)}`;
}

// --- CLIENTES (FIX DEFINITIVO) ---
function uiClientes() {
    pageTitle.innerText = "Mis Clientes";
    mainContent.innerHTML = `
        <div class="flex gap-2 mb-4 px-2">
            <input type="text" id="b-cli" placeholder="Buscar..." class="w-full p-4 border rounded-2xl font-bold">
            <button onclick="document.getElementById('m-c').classList.remove('hidden')" class="bg-blue-600 text-white p-4 rounded-2xl shadow-lg"><i class="fas fa-plus"></i></button>
        </div>
        <div id="l-c" class="space-y-2 pb-24 px-2"></div>
        <div id="m-c" class="fixed inset-0 bg-black/50 backdrop-blur-sm hidden flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
                <form id="f-c-nuevo">
                    <h3 class="font-black text-center uppercase text-gray-700 mb-4">Registrar Cliente</h3>
                    <input type="text" id="n-nom" placeholder="Nombre" class="w-full p-4 border rounded-xl font-bold bg-gray-50 mb-3" required>
                    <input type="tel" id="n-tel" placeholder="WhatsApp" class="w-full p-4 border rounded-xl font-bold bg-gray-50 mb-4" required>
                    <button type="submit" id="b-save-c" class="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase shadow-lg">Guardar</button>
                    <button type="button" onclick="document.getElementById('m-c').classList.add('hidden')" class="w-full text-gray-400 font-bold uppercase text-[10px] mt-4">Cancelar</button>
                </form>
            </div>
        </div>`;
    
    // Función para listar
    const loadC = async () => {
        const snap = await getDocs(query(collection(db, "clientes"), where("cobradorId", "==", auth.currentUser.uid)));
        const cont = document.getElementById('l-c');
        cont.innerHTML = "";
        snap.forEach(d => {
            const c = d.data();
            cont.innerHTML += `
            <div class="bg-white p-4 rounded-2xl border flex justify-between items-center mb-2 shadow-sm">
                <div onclick="verPerfil('${d.id}', '${c.nombre}', '${c.telefono}')" class="flex-1 cursor-pointer">
                    <p class="font-black text-gray-800 uppercase text-sm">${c.nombre}</p>
                    <p class="text-[10px] text-gray-400 font-bold">${c.telefono}</p>
                </div>
                <button onclick="deleteC('${d.id}')" class="text-red-300 p-2"><i class="fas fa-trash"></i></button>
            </div>`;
        });
    };
    loadC();

    document.getElementById('f-c-nuevo').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('b-save-c');
        btn.disabled = true; btn.innerText = "...";
        try {
            await addDoc(collection(db, "clientes"), {
                nombre: document.getElementById('n-nom').value,
                telefono: document.getElementById('n-tel').value,
                cobradorId: auth.currentUser.uid,
                fecha: new Date()
            });
            document.getElementById('m-c').classList.add('hidden');
            uiClientes();
        } catch (err) { alert("Error al guardar cliente"); }
    };
}

// --- PERFIL Y PRÉSTAMOS ---
window.verPerfil = async (id, nombre, telefono) => {
    pageTitle.innerText = "Perfil";
    mainContent.innerHTML = `
        <div class="space-y-4 pb-24 px-2">
            <div class="bg-white p-8 rounded-[2.5rem] shadow-xl text-center">
                <h3 class="font-black text-xl text-gray-800 uppercase mb-4">${nombre}</h3>
                <div class="flex gap-2">
                    <button onclick="document.getElementById('m-p').classList.remove('hidden')" class="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black text-xs shadow-lg">+ PRÉSTAMO</button>
                    <a href="https://wa.me/${telefono}" class="bg-green-500 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg text-xl"><i class="fab fa-whatsapp"></i></a>
                </div>
            </div>
            <div id="l-cuotas" class="space-y-2"></div>
        </div>
        <div id="m-p" class="fixed inset-0 bg-black/50 backdrop-blur-sm hidden flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
                <form id="f-p-nuevo" class="space-y-3">
                    <input type="number" id="p-m" placeholder="Monto $" class="w-full p-4 border rounded-xl font-bold bg-gray-50" required>
                    <input type="number" id="p-i" value="20" placeholder="Interés %" class="w-full p-4 border rounded-xl font-bold bg-gray-50" required>
                    <input type="number" id="p_cuo" value="20" placeholder="Cuotas" class="w-full p-4 border rounded-xl font-bold bg-gray-50" required>
                    <select id="p_modal" class="w-full p-4 border rounded-xl font-bold bg-gray-50">
                        <option value="Diario">Diario</option><option value="Semanal">Semanal</option><option value="Quincenal">Quincenal</option><option value="Mensual">Mensual</option>
                    </select>
                    <button type="submit" id="b-p-save" class="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase shadow-lg">Crear Préstamo</button>
                    <button type="button" onclick="document.getElementById('m-p').classList.add('hidden')" class="w-full text-gray-400 font-bold text-[10px] uppercase mt-2">Cerrar</button>
                </form>
            </div>
        </div>`;

    const snapC = await getDocs(query(collection(db, "cuotas"), where("clienteId", "==", id), orderBy("n", "asc")));
    const cont = document.getElementById('l-cuotas');
    snapC.forEach(d => {
        const c = d.data();
        if (c.estado === "pendiente") {
            cont.innerHTML += `<div class="bg-white p-4 rounded-2xl shadow-sm border flex justify-between items-center mb-2">
                <p class="font-black text-gray-800 text-sm">$${c.monto.toFixed(2)} <span class="text-[9px] text-gray-400 ml-2">#${c.n}</span></p>
                <button onclick="pay('${d.id}', '${id}', '${nombre}', '${telefono}', '${c.monto.toFixed(2)}', '${c.n}')" class="bg-green-600 text-white px-5 py-2 rounded-xl font-black text-[10px] shadow-md">COBRAR</button>
            </div>`;
        }
    });

    document.getElementById('f-p-nuevo').onsubmit = async (e) => {
        e.preventDefault();
        const m = parseFloat(document.getElementById('p-m').value), i = parseFloat(document.getElementById('p-i').value), c = parseInt(document.getElementById('p_cuo').value), mod = document.getElementById('p_modal').value;
        const total = m * (1 + i / 100), vc = total / c;
        const pref = await addDoc(collection(db, "prestamos"), { clienteId: id, total, vCuota: vc, modalidad: mod, estado: "activo", cobradorId: auth.currentUser.uid, fecha: new Date() });
        for (let j = 1; j <= c; j++) {
            let f = new Date(); f.setHours(0,0,0,0);
            if (mod === "Diario") f.setDate(f.getDate() + j);
            else if (mod === "Semanal") f.setDate(f.getDate() + (j * 7));
            else if (mod === "Quincenal") f.setDate(f.getDate() + (j * 15));
            else if (mod === "Mensual") f.setMonth(f.getMonth() + j);
            await addDoc(collection(db, "cuotas"), { prestamoId: pref.id, clienteId: id, n: j, monto: vc, fecha: Timestamp.fromDate(f), estado: "pendiente", cobradorId: auth.currentUser.uid });
        }
        alert("PRÉSTAMO CREADO"); verPerfil(id, nombre, telefono);
    };
};

window.pay = async (id, cid, cnom, ctel, monto, n) => {
    if (!confirm(`¿Cobrar $${monto}?`)) return;
    await updateDoc(doc(db, "cuotas", id), { estado: "pagado" });
    window.open(`https://wa.me/${ctel}?text=🧾 *SISCOP* Recibo%0A👤 ${cnom}%0A💰 $${monto}%0A🔢 Cuota #${n}`, '_blank');
    verPerfil(cid, cnom, ctel);
};

// --- RUTA Y MOROSOS ---
async function uiCobros() {
    pageTitle.innerText = "Hoy";
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const snap = await getDocs(query(collection(db, "cuotas"), where("fecha", "==", Timestamp.fromDate(hoy)), where("estado", "==", "pendiente"), where("cobradorId", "==", auth.currentUser.uid)));
    const cont = document.getElementById('main-content');
    cont.innerHTML = `<div id="lc" class="space-y-3 pb-24 px-2"></div>`;
    if(snap.empty) { document.getElementById('lc').innerHTML = `<p class="text-center py-20 text-gray-400 font-black uppercase text-[10px]">Libre hoy🏖️</p>`; return; }
    for (const d of snap.docs) {
        const c = d.data(); const cliS = await getDoc(doc(db, "clientes", c.clienteId));
        document.getElementById('lc').innerHTML += `<div class="bg-white p-5 rounded-3xl shadow-md border-l-8 border-blue-600 flex justify-between items-center mb-2">
            <p class="font-black text-gray-800 uppercase text-xs">${cliS.data().nombre}</p>
            <p class="text-blue-600 font-black text-lg">$${c.monto.toFixed(2)}</p>
            <button onclick="pay('${d.id}', '${c.clienteId}', '${cliS.data().nombre}', '${cliS.data().telefono}', '${c.monto.toFixed(2)}', '${c.n}')" class="bg-green-600 text-white px-5 py-2 rounded-xl font-black text-xs shadow-lg">OK</button>
        </div>`;
    }
}

async function uiMorosos() {
    pageTitle.innerText = "Atrasados";
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const snap = await getDocs(query(collection(db, "cuotas"), where("fecha", "<", Timestamp.fromDate(hoy)), where("estado", "==", "pendiente"), where("cobradorId", "==", auth.currentUser.uid)));
    const cont = document.getElementById('main-content');
    cont.innerHTML = `<div id="lm" class="space-y-3 pb-24 px-2"></div>`;
    if(snap.empty) { document.getElementById('lm').innerHTML = `<p class="text-center py-20 text-gray-400 font-bold uppercase text-[10px]">Al día👏</p>`; return; }
    for (const d of snap.docs) {
        const c = d.data(); const cliS = await getDoc(doc(db, "clientes", c.clienteId));
        document.getElementById('lm').innerHTML += `<div class="bg-white p-5 rounded-3xl shadow-md border-l-8 border-red-600 flex justify-between items-center mb-2">
            <p class="font-black text-gray-800 uppercase text-xs">${cliS.data().nombre}</p>
            <p class="text-red-600 font-black text-lg">$${c.monto.toFixed(2)}</p>
            <button onclick="pay('${d.id}', '${c.clienteId}', '${cliS.data().nombre}', '${cliS.data().telefono}', '${c.monto.toFixed(2)}', '${c.n}')" class="bg-red-600 text-white px-5 py-2 rounded-xl font-black text-xs shadow-lg">OK</button>
        </div>`;
    }
}

async function uiHistorial() {
    pageTitle.innerText = "Historial";
    const snapP = await getDocs(query(collection(db, "prestamos"), where("cobradorId", "==", auth.currentUser.uid)));
    const cont = document.getElementById('main-content');
    cont.innerHTML = `<div id="l-his" class="space-y-4 pb-24 px-2"></div>`;
    snapP.forEach(async d => {
        const p = d.data(); const cliS = await getDoc(doc(db, "clientes", p.clienteId));
        document.getElementById('l-his').innerHTML += `
        <div class="bg-white p-5 rounded-[2rem] shadow-sm border mb-3 flex justify-between items-center">
            <div><p class="text-blue-600 font-black uppercase text-xs">${cliS.data() ? cliS.data().nombre : '---'}</p><p class="text-xl font-black">$${p.total.toFixed(2)}</p></div>
            <button onclick="deleteP('${d.id}')" class="text-red-300 p-2"><i class="fas fa-trash-alt"></i></button>
        </div>`;
    });
}

window.deleteC = async (id) => { if(confirm("¿Borrar cliente?")) { await deleteDoc(doc(db, "clientes", id)); uiClientes(); } };
window.deleteP = async (id) => { if(confirm("¿Borrar préstamo?")) { await deleteDoc(doc(db, "prestamos", id)); uiHistorial(); } };
function uiReportes() { router('dashboard'); }
btnLogout.onclick = () => signOut(auth);
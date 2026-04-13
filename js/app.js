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

// --- NAVEGACIÓN ---
window.router = (route) => {
    mainContent.innerHTML = "";
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
        <div class="max-w-md mx-auto bg-white p-10 rounded-[2rem] shadow-2xl mt-10 text-center">
            <div class="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg shadow-blue-200">
                <i class="fas fa-sack-dollar"></i>
            </div>
            <h2 class="text-3xl font-black text-gray-800 uppercase tracking-tighter mb-2">Siscop</h2>
            <p class="text-gray-400 text-sm mb-8 font-bold uppercase tracking-widest">Control de Préstamos</p>
            <form id="login-form" class="space-y-4 text-left">
                <input type="email" id="l-email" placeholder="Correo" class="w-full p-5 border-2 border-gray-100 rounded-2xl bg-gray-50 font-bold focus:border-blue-600 outline-none transition-all" required>
                <input type="password" id="l-pass" placeholder="Contraseña" class="w-full p-5 border-2 border-gray-100 rounded-2xl bg-gray-50 font-bold focus:border-blue-600 outline-none transition-all" required>
                <button type="submit" class="w-full bg-blue-600 text-white p-5 rounded-2xl font-black shadow-xl active:scale-95 transition-all uppercase tracking-widest">Entrar</button>
            </form>
        </div>
    `;
    document.getElementById('login-form').onsubmit = async (e) => {
        e.preventDefault();
        try { await signInWithEmailAndPassword(auth, document.getElementById('l-email').value, document.getElementById('l-pass').value); } 
        catch (error) { alert("Acceso denegado"); }
    };
}

// --- DASHBOARD ---
async function renderDashboard() {
    pageTitle.innerText = "Mi Negocio";
    mainContent.innerHTML = `
        <div class="grid grid-cols-2 gap-3 mb-6">
            <div class="bg-white p-5 rounded-3xl shadow-sm border-l-[6px] border-green-500">
                <p class="text-gray-400 text-[9px] font-black uppercase mb-1">Cobrado Hoy</p>
                <p id="s-cobrado" class="text-2xl font-black text-green-600">$0.00</p>
            </div>
            <div class="bg-white p-5 rounded-3xl shadow-sm border-l-[6px] border-blue-500">
                <p class="text-gray-400 text-[9px] font-black uppercase mb-1">Por Cobrar</p>
                <p id="s-acobrar" class="text-2xl font-black text-blue-500">$0.00</p>
            </div>
            <div class="bg-white p-5 rounded-3xl shadow-sm border-l-[6px] border-orange-500">
                <p class="text-gray-400 text-[9px] font-black uppercase mb-1">Ganancia Hoy</p>
                <p id="s-ganancia" class="text-2xl font-black text-orange-500">$0.00</p>
            </div>
            <div class="bg-white p-5 rounded-3xl shadow-sm border-l-[6px] border-red-500">
                <p class="text-gray-400 text-[9px] font-black uppercase mb-1">Deuda Calle</p>
                <p id="s-total" class="text-2xl font-black text-red-500">$0.00</p>
            </div>
        </div>
        <div class="space-y-3">
            <button onclick="router('cobros')" class="w-full bg-blue-600 text-white p-6 rounded-[2rem] font-black shadow-xl flex items-center justify-between active:scale-95 transition-all">
                <div class="flex items-center gap-4"><i class="fas fa-hand-holding-dollar text-2xl"></i><span>GESTIONAR COBROS</span></div>
                <i class="fas fa-arrow-right"></i>
            </button>
            <button onclick="router('reportes')" class="w-full bg-white border-2 p-6 rounded-[2rem] font-black text-gray-700 flex items-center justify-between active:scale-95 transition-all">
                <div class="flex items-center gap-4"><i class="fas fa-chart-line text-2xl text-blue-600"></i><span>VER REPORTES</span></div>
                <i class="fas fa-arrow-right"></i>
            </button>
        </div>
    `;

    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const snapC = await getDocs(query(collection(db, "cuotas"), where("cobradorId", "==", auth.currentUser.uid)));
    
    let cobHoy = 0, porCobHoy = 0, ganTotal = 0, deudaCalle = 0;
    snapC.forEach(d => {
        const c = d.data(); const f = c.fecha.toDate(); f.setHours(0,0,0,0);
        if (c.estado === "pendiente") {
            deudaCalle += c.monto;
            if (f.getTime() === hoy.getTime()) porCobHoy += c.monto;
        } else if (c.estado === "pagado") {
            if (f.getTime() === hoy.getTime()) {
                cobHoy += c.monto;
                ganTotal += c.monto * 0.166; 
            }
        }
    });

    document.getElementById('s-cobrado').innerText = `$${cobHoy.toFixed(2)}`;
    document.getElementById('s-acobrar').innerText = `$${porCobHoy.toFixed(2)}`;
    document.getElementById('s-ganancia').innerText = `$${ganTotal.toFixed(2)}`;
    document.getElementById('s-total').innerText = `$${deudaCalle.toFixed(2)}`;
}

// --- CLIENTES CON BUSCADOR ---
function renderClientes() {
    pageTitle.innerText = "Directorio";
    mainContent.innerHTML = `
        <div class="flex gap-2 mb-4">
            <input type="text" id="busc-cli" placeholder="Buscar por nombre..." class="w-full p-5 border-2 border-gray-100 rounded-2xl shadow-sm outline-none font-bold focus:border-blue-600">
            <button onclick="abrirModalCliente()" class="bg-blue-600 text-white p-5 rounded-2xl shadow-lg active:scale-90 transition-all"><i class="fas fa-plus"></i></button>
        </div>
        <div id="lista-c" class="space-y-3 pb-24"></div>
        
        <div id="mod-c" class="fixed inset-0 bg-black/60 backdrop-blur-sm hidden flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl">
                <form id="f-c" class="space-y-4">
                    <h3 id="mod-c-title" class="font-black text-center uppercase text-gray-800 text-xl mb-4">Cliente</h3>
                    <input type="hidden" id="cid-edit">
                    <input type="text" id="cnom" placeholder="Nombre completo" class="w-full p-5 border-2 border-gray-50 rounded-2xl font-bold bg-gray-50 outline-none" required>
                    <input type="tel" id="ctel" placeholder="WhatsApp (Ej: 809...)" class="w-full p-5 border-2 border-gray-50 rounded-2xl font-bold bg-gray-50 outline-none" required>
                    <button type="submit" id="mod-c-btn" class="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase shadow-lg">Guardar</button>
                    <button type="button" onclick="document.getElementById('mod-c').classList.add('hidden')" class="w-full text-gray-400 font-bold uppercase text-xs pt-2">Cancelar</button>
                </form>
            </div>
        </div>
    `;
    cargarClientes();
    document.getElementById('busc-cli').oninput = (e) => {
        const val = e.target.value.toLowerCase();
        document.querySelectorAll('.tarjeta-cliente').forEach(el => {
            el.style.display = el.innerText.toLowerCase().includes(val) ? "flex" : "none";
        });
    };
    document.getElementById('f-c').onsubmit = guardarOActualizarCliente;
}

async function cargarClientes() {
    const cont = document.getElementById('lista-c');
    const snap = await getDocs(query(collection(db, "clientes"), where("cobradorId", "==", auth.currentUser.uid), orderBy("nombre", "asc")));
    cont.innerHTML = "";
    snap.forEach(d => {
        const c = d.data();
        cont.innerHTML += `
            <div class="tarjeta-cliente bg-white p-5 rounded-3xl shadow-sm border flex justify-between items-center mb-2 animate-nudge">
                <div onclick="verDetalleCliente('${d.id}', '${c.nombre}', '${c.telefono}')" class="flex items-center gap-4 flex-1 cursor-pointer">
                    <div class="bg-blue-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-md shadow-blue-100">${c.nombre.charAt(0)}</div>
                    <div><p class="font-black text-gray-800 text-lg leading-tight">${c.nombre}</p><p class="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">${c.telefono}</p></div>
                </div>
                <div class="flex gap-2">
                    <button onclick="prepararEdicion('${d.id}', '${c.nombre}', '${c.telefono}')" class="text-blue-500 bg-blue-50 w-10 h-10 rounded-full"><i class="fas fa-edit"></i></button>
                    <button onclick="eliminarCliente('${d.id}')" class="text-red-400 bg-red-50 w-10 h-10 rounded-full"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
    });
}

// --- PERFIL CLIENTE CON LÓGICA DE MODALIDAD QUINCENAL ---
window.verDetalleCliente = async (id, nombre, telefono) => {
    pageTitle.innerText = nombre;
    mainContent.innerHTML = `
        <div class="space-y-4 pb-24">
            <div class="bg-white p-8 rounded-[2.5rem] shadow-xl text-center border-b-8 border-blue-600">
                <h3 class="font-black text-2xl text-gray-800 uppercase mb-4">${nombre}</h3>
                <div class="bg-gray-50 p-5 rounded-[1.5rem] mb-6 flex justify-around border shadow-inner">
                    <div class="text-center">
                        <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pagado</p>
                        <p id="c-pagado" class="font-black text-green-600 text-xl">$0.00</p>
                    </div>
                    <div class="text-center border-l pl-6">
                        <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pendiente</p>
                        <p id="c-pendiente" class="font-black text-red-600 text-xl">$0.00</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="document.getElementById('mod-p').classList.remove('hidden')" class="flex-1 bg-blue-600 text-white p-5 rounded-2xl font-black text-xs shadow-lg shadow-blue-100">+ NUEVO PRÉSTAMO</button>
                    <a href="https://wa.me/${telefono}" class="bg-green-500 text-white w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-green-100"><i class="fab fa-whatsapp"></i></a>
                </div>
            </div>
            <h4 class="text-[10px] font-black text-gray-400 uppercase ml-4 tracking-widest">Cuotas del Préstamo</h4>
            <div id="lista-cuotas-cliente" class="space-y-2 px-2"></div>
        </div>

        <div id="mod-p" class="fixed inset-0 bg-black/60 backdrop-blur-sm hidden flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-[2.5rem] w-full max-w-md p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
                <form id="f-p" class="space-y-3">
                    <h3 class="font-black text-center text-gray-800 uppercase text-xl mb-4">Crear Préstamo</h3>
                    <input type="hidden" id="pid" value="${id}">
                    <label class="text-[10px] font-black text-gray-400 uppercase ml-1">Monto Entregado ($)</label>
                    <input type="number" id="p_m" placeholder="5000" class="w-full p-5 border-2 border-gray-50 rounded-2xl font-black bg-gray-50 outline-none focus:border-blue-600" required>
                    <label class="text-[10px] font-black text-gray-400 uppercase ml-1">Interés (%)</label>
                    <input type="number" id="p_i" value="20" class="w-full p-5 border-2 border-gray-50 rounded-2xl font-black bg-gray-50 outline-none focus:border-blue-600" required>
                    <label class="text-[10px] font-black text-gray-400 uppercase ml-1">Cuotas</label>
                    <input type="number" id="p_c" value="20" class="w-full p-5 border-2 border-gray-50 rounded-2xl font-black bg-gray-50 outline-none" required>
                    <label class="text-[10px] font-black text-gray-400 uppercase ml-1">Modalidad</label>
                    <select id="p_mod" class="w-full p-5 border-2 border-gray-50 rounded-2xl font-black bg-gray-50 outline-none">
                        <option value="diario">Diario</option>
                        <option value="semanal">Semanal</option>
                        <option value="quincenal">Quincenal (15 días)</option>
                        <option value="mensual">Mensual</option>
                    </select>
                    <div id="p_r" class="bg-blue-600 text-white p-5 rounded-2xl text-center font-black text-2xl shadow-lg mt-2">Total: $0.00</div>
                    <button type="submit" id="btn-p" class="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase mt-4 shadow-xl">Crear Préstamo</button>
                    <button type="button" onclick="document.getElementById('mod-p').classList.add('hidden')" class="w-full text-gray-400 font-bold uppercase text-xs pt-2">Cerrar</button>
                </form>
            </div>
        </div>
    `;

    const im = document.getElementById('p_m'), ii = document.getElementById('p_i'), res = document.getElementById('p_r');
    im.oninput = () => { res.innerText = `Total: $${((parseFloat(im.value)||0)*(1+(parseFloat(ii.value)||0)/100)).toFixed(2)}`; };
    ii.oninput = im.oninput;
    document.getElementById('f-p').onsubmit = guardarPrestamo;
    
    const snapC = await getDocs(query(collection(db, "cuotas"), where("clienteId", "==", id), orderBy("n", "asc")));
    const contC = document.getElementById('lista-cuotas-cliente');
    let pagado = 0, pendiente = 0;
    contC.innerHTML = "";
    snapC.forEach(d => {
        const c = d.data();
        if (c.estado === "pagado") { pagado += c.monto; } 
        else {
            pendiente += c.monto;
            contC.innerHTML += `
                <div class="bg-white p-5 rounded-3xl shadow-sm border flex justify-between items-center mb-2">
                    <div>
                        <p class="font-black text-gray-400 text-[10px] uppercase tracking-tighter">CUOTA #${c.n} | ${c.fecha.toDate().toLocaleDateString()}</p>
                        <p class="text-blue-600 font-black text-xl">$${c.monto.toFixed(2)}</p>
                    </div>
                    <button onclick="registrarCobro('${d.id}', '${id}', '${nombre}', '${telefono}', '${c.monto.toFixed(2)}', '${c.n}')" class="bg-green-600 text-white h-12 px-6 rounded-2xl font-black shadow-lg shadow-green-100 uppercase text-[10px]">Cobrar</button>
                </div>`;
        }
    });
    document.getElementById('c-pagado').innerText = `$${pagado.toFixed(2)}`;
    document.getElementById('c-pendiente').innerText = `$${pendiente.toFixed(2)}`;
};

// --- FUNCIÓN DE COBRO CON WHATSAPP ---
window.registrarCobro = async (id, cid, cnom, ctel, monto, n) => {
    if (!confirm(`¿Confirmar pago de $${monto}?`)) return;
    await updateDoc(doc(db, "cuotas", id), { estado: "pagado" });
    const msg = `🧾 *SISCOP - RECIBO DE PAGO*%0A------------------------------%0A👤 *Cliente:* ${cnom}%0A💰 *Monto Pagado:* $${monto}%0A🔢 *Cuota Nro:* ${n}%0A📅 *Fecha:* ${new Date().toLocaleDateString()}%0A✅ *Su pago ha sido procesado con éxito.*`;
    window.open(`https://wa.me/${ctel}?text=${msg}`, '_blank');
    verDetalleCliente(cid, cnom, ctel);
};

// --- REPORTES ---
async function renderReportes() {
    pageTitle.innerText = "Mis Estadísticas";
    mainContent.innerHTML = `<p class="text-center py-20 font-black uppercase text-gray-300">Generando reportes...</p>`;
    const snapP = await getDocs(query(collection(db, "prestamos"), where("cobradorId", "==", auth.currentUser.uid)));
    const snapC = await getDocs(query(collection(db, "cuotas"), where("cobradorId", "==", auth.currentUser.uid), where("estado", "==", "pagado")));
    let tInvertido = 0, tCobrado = 0;
    snapP.forEach(d => tInvertido += d.data().monto);
    snapC.forEach(d => tCobrado += d.data().monto);
    mainContent.innerHTML = `
        <div class="space-y-4 pb-24">
            <div class="bg-white p-8 rounded-[2.5rem] shadow-xl border-t-8 border-blue-600 text-center">
                <p class="text-[10px] font-black text-gray-400 uppercase mb-2">Total Histórico Prestado</p>
                <p class="text-4xl font-black text-blue-600">$${tInvertido.toFixed(2)}</p>
            </div>
            <div class="bg-white p-8 rounded-[2.5rem] shadow-xl border-t-8 border-green-500 text-center">
                <p class="text-[10px] font-black text-gray-400 uppercase mb-2">Total Recuperado</p>
                <p class="text-4xl font-black text-green-600">$${tCobrado.toFixed(2)}</p>
            </div>
            <div class="bg-white p-8 rounded-[2.5rem] shadow-xl border-t-8 border-orange-500 text-center">
                <p class="text-[10px] font-black text-gray-400 uppercase mb-2">Rentabilidad (Intereses)</p>
                <p class="text-4xl font-black text-orange-500">$${(tCobrado * 0.166).toFixed(2)}</p>
            </div>
            <button onclick="router('dashboard')" class="w-full font-black text-gray-400 uppercase text-xs py-4">Volver</button>
        </div>`;
}

// --- OTROS MÓDULOS ---
async function renderPrestamos() {
    pageTitle.innerText = "Historial";
    mainContent.innerHTML = `<div id="lista-p" class="space-y-3 pb-24"></div>`;
    const snap = await getDocs(query(collection(db, "prestamos"), where("cobradorId", "==", auth.currentUser.uid)));
    const cont = document.getElementById('lista-p');
    if (snap.empty) { cont.innerHTML = `<p class="text-center py-20 text-gray-400 font-black text-xs italic">Nada registrado</p>`; return; }
    snap.forEach(async d => {
        const p = d.data(); const cliSnap = await getDoc(doc(db, "clientes", p.clienteId));
        cont.innerHTML += `<div class="bg-white p-6 rounded-[2rem] shadow-sm border flex justify-between items-center mb-3">
            <div><p class="text-[10px] font-black text-gray-400 uppercase mb-1">${cliSnap.data() ? cliSnap.data().nombre : 'Borrado'}</p><p class="text-2xl font-black text-blue-600">$${p.total.toFixed(2)}</p><p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">${p.modalidad}</p></div>
            <button onclick="eliminarPrestamo('${d.id}')" class="bg-red-50 text-red-400 w-12 h-12 rounded-2xl flex items-center justify-center text-lg"><i class="fas fa-trash-alt"></i></button>
        </div>`;
    });
}

window.eliminarPrestamo = async (id) => {
    if (!confirm("¿Eliminar préstamo y todas sus cuotas?")) return;
    await deleteDoc(doc(db, "prestamos", id));
    const s = await getDocs(query(collection(db, "cuotas"), where("prestamoId", "==", id)));
    s.forEach(async (c) => await deleteDoc(doc(db, "cuotas", c.id)));
    renderPrestamos();
};

async function renderCobros() {
    pageTitle.innerText = "Hoy";
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    mainContent.innerHTML = `<div id="lc" class="space-y-3 pb-24"></div>`;
    const snap = await getDocs(query(collection(db, "cuotas"), where("fecha", "==", Timestamp.fromDate(hoy)), where("estado", "==", "pendiente"), where("cobradorId", "==", auth.currentUser.uid)));
    const cont = document.getElementById('lc');
    if(snap.empty) { cont.innerHTML = `<div class="text-center py-20 opacity-30"><i class="fas fa-umbrella-beach text-6xl mb-4"></i><p class="font-black uppercase text-xs">Nada pendiente</p></div>`; return; }
    for (const d of snap.docs) {
        const cuota = d.data(); const cliSnap = await getDoc(doc(db, "clientes", cuota.clienteId));
        cont.innerHTML += `<div class="bg-white p-6 rounded-[2rem] shadow-md border-l-8 border-blue-600 flex justify-between items-center animate-nudge">
            <div><p class="font-black text-gray-800 uppercase text-lg">${cliSnap.data().nombre}</p><p class="text-blue-600 font-black text-2xl tracking-tighter">$${cuota.monto.toFixed(2)}</p></div>
            <button onclick="registrarCobro('${d.id}', '${cuota.clienteId}', '${cliSnap.data().nombre}', '${cliSnap.data().telefono}', '${cuota.monto.toFixed(2)}', '${cuota.n}')" class="bg-green-600 text-white h-16 px-6 rounded-2xl font-black shadow-lg active:scale-90 transition-all uppercase text-[10px]">Cobrar</button>
        </div>`;
    }
}

async function renderMorosos() {
    pageTitle.innerText = "Atrasados";
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    mainContent.innerHTML = `<div id="lm" class="space-y-3 pb-24"></div>`;
    const snap = await getDocs(query(collection(db, "cuotas"), where("fecha", "<", Timestamp.fromDate(hoy)), where("estado", "==", "pendiente"), where("cobradorId", "==", auth.currentUser.uid)));
    const cont = document.getElementById('lm');
    if(snap.empty) { cont.innerHTML = `<p class="text-center py-20 text-gray-400 font-black uppercase text-[10px]">Todo en orden👏</p>`; return; }
    for (const d of snap.docs) {
        const c = d.data(); const cliSnap = await getDoc(doc(db, "clientes", c.clienteId));
        cont.innerHTML += `<div class="bg-white p-6 rounded-[2rem] shadow-md border-l-8 border-red-600 flex justify-between items-center">
            <div><p class="font-black text-gray-800 uppercase text-lg">${cliSnap.data().nombre}</p><p class="text-red-600 font-black text-2xl tracking-tighter">$${c.monto.toFixed(2)}</p><p class="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-1">Venció: ${c.fecha.toDate().toLocaleDateString()}</p></div>
            <button onclick="registrarCobro('${d.id}', '${c.clienteId}', '${cliSnap.data().nombre}', '${cliSnap.data().telefono}', '${c.monto.toFixed(2)}', '${c.n}')" class="bg-red-600 text-white h-16 px-6 rounded-2xl font-black shadow-lg uppercase text-[10px]">Cobrar</button>
        </div>`;
    }
}

async function guardarPrestamo(e) {
    e.preventDefault();
    const b = document.getElementById('btn-p'); b.disabled = true; b.innerText = "ESPERE...";
    const cid = document.getElementById('pid').value, m = parseFloat(document.getElementById('p_m').value), i = parseFloat(document.getElementById('p_i').value), c = parseInt(document.getElementById('p_c').value), mod = document.getElementById('p_mod').value;
    const total = m * (1 + i / 100), vc = total / c;
    try {
        const pref = await addDoc(collection(db, "prestamos"), { clienteId: cid, monto: m, total, interes: i, vCuota: vc, modalidad: mod, estado: "activo", cobradorId: auth.currentUser.uid, fecha: new Date() });
        for (let j = 1; j <= c; j++) {
            let f = new Date(); f.setHours(0,0,0,0);
            if (mod === "diario") f.setDate(f.getDate() + j);
            else if (mod === "semanal") f.setDate(f.getDate() + (j * 7));
            else if (mod === "quincenal") f.setDate(f.getDate() + (j * 15));
            else if (mod === "mensual") f.setMonth(f.getMonth() + j);
            await addDoc(collection(db, "cuotas"), { prestamoId: pref.id, clienteId: cid, n: j, monto: vc, fecha: Timestamp.fromDate(f), estado: "pendiente", cobradorId: auth.currentUser.uid });
        }
        alert("PRESTAMO CREADO"); router('dashboard');
    } catch (err) { alert("Error"); b.disabled = false; }
}

window.abrirModalCliente = () => { document.getElementById('mod-c').classList.remove('hidden'); document.getElementById('cid-edit').value = ""; document.getElementById('f-c').reset(); };
window.prepararEdicion = (id, n, t) => { document.getElementById('mod-c').classList.remove('hidden'); document.getElementById('cid-edit').value = id; document.getElementById('cnom').value = n; document.getElementById('ctel').value = t; };
async function guardarOActualizarCliente(e) { e.preventDefault(); const id = document.getElementById('cid-edit').value, n = document.getElementById('cnom').value, t = document.getElementById('ctel').value; if(id) await updateDoc(doc(db, "clientes", id), {nombre: n, telefono: t}); else await addDoc(collection(db, "clientes"), {nombre: n, telefono: t, cobradorId: auth.currentUser.uid, fecha: new Date()}); document.getElementById('mod-c').classList.add('hidden'); renderClientes(); }
window.eliminarCliente = async (id) => { if(confirm("¿Borrar?")) { await deleteDoc(doc(db, "clientes", id)); renderClientes(); } };
btnLogout.onclick = () => { if(confirm("¿Cerrar sesión?")) signOut(auth); };
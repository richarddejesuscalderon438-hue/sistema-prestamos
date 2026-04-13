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
        <div class="max-w-md mx-auto bg-white p-10 rounded-[2.5rem] shadow-2xl mt-10 text-center border-b-8 border-blue-600">
            <h2 class="text-4xl font-black text-blue-600 mb-2 italic tracking-tighter">SISCOP</h2>
            <p class="text-gray-400 text-xs font-bold uppercase tracking-widest mb-8">Gestión de Capital</p>
            <form id="login-form" class="space-y-4">
                <input type="email" id="l-email" placeholder="Usuario / Correo" class="w-full p-5 border-2 border-gray-50 rounded-2xl bg-gray-50 font-bold focus:border-blue-600 outline-none transition-all" required>
                <input type="password" id="l-pass" placeholder="Contraseña" class="w-full p-5 border-2 border-gray-50 rounded-2xl bg-gray-50 font-bold focus:border-blue-600 outline-none transition-all" required>
                <button type="submit" class="w-full bg-blue-600 text-white p-5 rounded-2xl font-black shadow-xl uppercase tracking-widest active:scale-95 transition-all">Ingresar</button>
            </form>
        </div>
    `;
    document.getElementById('login-form').onsubmit = async (e) => {
        e.preventDefault();
        try { await signInWithEmailAndPassword(auth, document.getElementById('l-email').value, document.getElementById('l-pass').value); } 
        catch (error) { alert("Credenciales incorrectas"); }
    };
}

// --- DASHBOARD ---
async function renderDashboard() {
    pageTitle.innerText = "Panel de Control";
    mainContent.innerHTML = `
        <div class="grid grid-cols-2 gap-3 mb-6">
            <div class="bg-white p-5 rounded-3xl shadow-sm border-l-4 border-green-500">
                <p class="text-gray-400 text-[9px] font-black uppercase mb-1">Cobrado Hoy</p>
                <p id="s-cobrado" class="text-2xl font-black text-green-600">$0.00</p>
            </div>
            <div class="bg-white p-5 rounded-3xl shadow-sm border-l-4 border-blue-500">
                <p class="text-gray-400 text-[9px] font-black uppercase mb-1">Por Cobrar</p>
                <p id="s-acobrar" class="text-2xl font-black text-blue-500">$0.00</p>
            </div>
            <div class="bg-white p-5 rounded-3xl shadow-sm border-l-4 border-orange-500">
                <p class="text-gray-400 text-[9px] font-black uppercase mb-1">Ganancia Hoy</p>
                <p id="s-ganancia" class="text-2xl font-black text-orange-500">$0.00</p>
            </div>
            <div class="bg-white p-5 rounded-3xl shadow-sm border-l-4 border-red-600">
                <p class="text-gray-400 text-[9px] font-black uppercase mb-1">En la Calle</p>
                <p id="s-total" class="text-2xl font-black text-red-600">$0.00</p>
            </div>
        </div>
        
        <div class="space-y-3">
            <button onclick="router('cobros')" class="w-full bg-blue-600 text-white p-6 rounded-[2rem] font-black shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                <i class="fas fa-money-bill-trend-up text-2xl"></i> RUTA DE COBRO
            </button>
            <div class="grid grid-cols-2 gap-3">
                <button onclick="router('morosos')" class="bg-red-500 text-white p-5 rounded-3xl font-black text-xs shadow-lg uppercase">Atrasados</button>
                <button onclick="router('reportes')" class="bg-gray-800 text-white p-5 rounded-3xl font-black text-xs shadow-lg uppercase">Reportes</button>
            </div>
        </div>

        <h4 class="text-[10px] font-black text-gray-400 uppercase mt-8 mb-4 ml-2 tracking-widest italic">Últimos movimientos</h4>
        <div id="historial-reciente" class="space-y-2 pb-24"></div>
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

    // Cargar últimos 5 cobros
    const snapHist = await getDocs(query(collection(db, "cuotas"), where("cobradorId", "==", auth.currentUser.uid), where("estado", "==", "pagado"), limit(5)));
    const contH = document.getElementById('historial-reciente');
    snapHist.forEach(async d => {
        const h = d.data();
        const cliS = await getDoc(doc(db, "clientes", h.clienteId));
        contH.innerHTML += `
            <div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-gray-50">
                <div class="flex items-center gap-3">
                    <div class="bg-green-100 text-green-600 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"><i class="fas fa-check"></i></div>
                    <div><p class="font-bold text-gray-800 text-xs uppercase">${cliS.data().nombre}</p><p class="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Cuota #${h.n}</p></div>
                </div>
                <p class="font-black text-green-600">$${h.monto.toFixed(2)}</p>
            </div>
        `;
    });
}

// --- CLIENTES ---
function renderClientes() {
    pageTitle.innerText = "Clientes";
    mainContent.innerHTML = `
        <div class="flex gap-2 mb-4">
            <input type="text" id="busc-cli" placeholder="Buscar..." class="w-full p-5 border-2 border-gray-100 rounded-2xl shadow-sm font-bold focus:border-blue-600 outline-none">
            <button onclick="abrirModalCliente()" class="bg-blue-600 text-white p-5 rounded-2xl shadow-lg"><i class="fas fa-plus"></i></button>
        </div>
        <div id="lista-c" class="space-y-3 pb-24"></div>
        
        <div id="mod-c" class="fixed inset-0 bg-black/50 backdrop-blur-sm hidden flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
                <form id="f-c" class="space-y-4">
                    <h3 id="mod-c-title" class="font-black text-center uppercase text-gray-800">Gestionar Cliente</h3>
                    <input type="hidden" id="cid-edit">
                    <input type="text" id="cnom" placeholder="Nombre" class="w-full p-4 border rounded-xl font-bold bg-gray-50" required>
                    <input type="tel" id="ctel" placeholder="WhatsApp" class="w-full p-4 border rounded-xl font-bold bg-gray-50" required>
                    <button type="submit" id="mod-c-btn" class="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase">Guardar</button>
                    <button type="button" onclick="document.getElementById('mod-c').classList.add('hidden')" class="w-full text-gray-400 font-bold text-xs uppercase">Cerrar</button>
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
                    <div class="bg-blue-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl">${c.nombre.charAt(0)}</div>
                    <div><p class="font-black text-gray-800 uppercase text-sm">${c.nombre}</p><p class="text-[10px] text-gray-400 font-black tracking-widest">${c.telefono}</p></div>
                </div>
                <div class="flex gap-2">
                    <button onclick="prepararEdicion('${d.id}', '${c.nombre}', '${c.telefono}')" class="text-blue-500 bg-blue-50 w-10 h-10 rounded-full"><i class="fas fa-edit"></i></button>
                    <button onclick="eliminarCliente('${d.id}')" class="text-red-400 bg-red-50 w-10 h-10 rounded-full"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
    });
}

// --- PERFIL CLIENTE CON LIQUIDACIÓN TOTAL ---
window.verDetalleCliente = async (id, nombre, telefono) => {
    pageTitle.innerText = nombre;
    mainContent.innerHTML = `
        <div class="space-y-4 pb-24">
            <div class="bg-white p-6 rounded-[2rem] shadow-xl text-center">
                <h3 class="font-black text-xl text-gray-800 uppercase mb-4">${nombre}</h3>
                <div class="bg-gray-50 p-4 rounded-2xl mb-4 flex justify-around border">
                    <div class="text-center">
                        <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Recuperado</p>
                        <p id="c-pagado" class="font-black text-green-600 text-lg">$0.00</p>
                    </div>
                    <div class="text-center border-l pl-4">
                        <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Saldo Restante</p>
                        <p id="c-pendiente" class="font-black text-red-600 text-lg">$0.00</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <button onclick="document.getElementById('mod-p').classList.remove('hidden')" class="bg-blue-600 text-white p-4 rounded-2xl font-black text-[10px] shadow-lg">+ PRÉSTAMO</button>
                    <button onclick="liquidarTotal('${id}', '${nombre}', '${telefono}')" class="bg-gray-800 text-white p-4 rounded-2xl font-black text-[10px] shadow-lg">LIQUIDAR TODO</button>
                </div>
                <a href="https://wa.me/${telefono}" class="w-full bg-green-500 text-white p-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 mt-2"><i class="fab fa-whatsapp"></i> WhatsApp</a>
            </div>
            <h4 class="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest text-center">Cuotas por Cobrar</h4>
            <div id="lista-cuotas-cliente" class="space-y-2"></div>
        </div>

        <div id="mod-p" class="fixed inset-0 bg-black/50 backdrop-blur-sm hidden flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-[2rem] w-full max-w-md p-8 max-h-[90vh] overflow-y-auto">
                <form id="f-p" class="space-y-3">
                    <h3 class="font-black text-center text-gray-800 uppercase">Nuevo Préstamo</h3>
                    <input type="hidden" id="pid" value="${id}">
                    <label class="text-[9px] font-black text-gray-400 uppercase">Monto Entregado ($)</label>
                    <input type="number" id="p_m" placeholder="5000" class="w-full p-4 border rounded-xl font-bold bg-gray-50 outline-none" required>
                    <label class="text-[9px] font-black text-gray-400 uppercase">Interés (%)</label>
                    <input type="number" id="p_i" value="20" class="w-full p-4 border rounded-xl font-bold bg-gray-50 outline-none" required>
                    <label class="text-[9px] font-black text-gray-400 uppercase">Pagos</label>
                    <input type="number" id="p_c" value="20" class="w-full p-4 border rounded-xl font-bold bg-gray-50 outline-none" required>
                    <label class="text-[9px] font-black text-gray-400 uppercase">Modalidad</label>
                    <select id="p_mod" class="w-full p-4 border rounded-xl font-bold bg-gray-50">
                        <option value="diario">Diario</option>
                        <option value="semanal">Semanal</option>
                        <option value="quincenal">Quincenal</option>
                        <option value="mensual">Mensual</option>
                    </select>
                    <div id="p_r" class="bg-blue-600 text-white p-4 rounded-xl text-center font-black text-lg shadow-md">Total: $0.00</div>
                    <button type="submit" id="btn-p" class="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase mt-2 shadow-lg">Crear</button>
                    <button type="button" onclick="document.getElementById('mod-p').classList.add('hidden')" class="w-full text-gray-400 font-bold uppercase text-[10px] mt-2">Cerrar</button>
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
                <div class="bg-white p-4 rounded-2xl shadow-sm border flex justify-between items-center mb-2">
                    <div>
                        <p class="font-black text-gray-400 text-[9px] uppercase">CUOTA #${c.n} | ${c.fecha.toDate().toLocaleDateString()}</p>
                        <p class="text-blue-600 font-black text-xl">$${c.monto.toFixed(2)}</p>
                    </div>
                    <button onclick="registrarCobro('${d.id}', '${id}', '${nombre}', '${telefono}', '${c.monto.toFixed(2)}', '${c.n}')" class="bg-green-600 text-white px-5 py-2 rounded-xl font-black text-[10px] shadow-lg">Cobrar</button>
                </div>`;
        }
    });
    document.getElementById('c-pagado').innerText = `$${pagado.toFixed(2)}`;
    document.getElementById('c-pendiente').innerText = `$${pendiente.toFixed(2)}`;
};

// --- LIQUIDACIÓN TOTAL ---
window.liquidarTotal = async (cid, cnom, ctel) => {
    const pend = document.getElementById('c-pendiente').innerText;
    if (!confirm(`¿El cliente pagará TODO el saldo (${pend}) hoy?`)) return;
    
    const snap = await getDocs(query(collection(db, "cuotas"), where("clienteId", "==", cid), where("estado", "==", "pendiente")));
    snap.forEach(async d => {
        await updateDoc(doc(db, "cuotas", d.id), { estado: "pagado", fecha: Timestamp.now() });
    });

    alert("Préstamo liquidado por completo.");
    verDetalleCliente(cid, cnom, ctel);
};

// --- FUNCIÓN DE COBRO ---
window.registrarCobro = async (id, cid, cnom, ctel, monto, n) => {
    if (!confirm(`¿Cobrar Cuota #${n}?`)) return;
    await updateDoc(doc(db, "cuotas", id), { estado: "pagado" });
    const msg = `🧾 *SISCOP - RECIBO DE PAGO*%0A------------------------------%0A👤 *Cliente:* ${cnom}%0A💰 *Monto Pagado:* $${monto}%0A🔢 *Cuota:* #${n}%0A📅 *Fecha:* ${new Date().toLocaleDateString()}%0A✅ *Procesado con éxito.*`;
    window.open(`https://wa.me/${ctel}?text=${msg}`, '_blank');
    verDetalleCliente(cid, cnom, ctel);
};

// --- OTROS MÓDULOS ---
async function renderPrestamos() {
    pageTitle.innerText = "Historial";
    mainContent.innerHTML = `<div id="lista-p" class="space-y-3 pb-24"></div>`;
    const snap = await getDocs(query(collection(db, "prestamos"), where("cobradorId", "==", auth.currentUser.uid)));
    const cont = document.getElementById('lista-p');
    if (snap.empty) { cont.innerHTML = `<p class="text-center py-20 text-gray-400 font-black uppercase tracking-tighter">Sin préstamos activos</p>`; return; }
    snap.forEach(async d => {
        const p = d.data(); const cliSnap = await getDoc(doc(db, "clientes", p.clienteId));
        cont.innerHTML += `<div class="bg-white p-5 rounded-3xl shadow-sm border flex justify-between items-center mb-3">
            <div><p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">${cliSnap.data() ? cliSnap.data().nombre : '---'}</p><p class="text-2xl font-black text-blue-600">$${p.total.toFixed(2)}</p><p class="text-[9px] font-bold text-gray-400 uppercase italic">${p.modalidad}</p></div>
            <button onclick="eliminarPrestamo('${d.id}')" class="bg-red-50 text-red-400 w-12 h-12 rounded-2xl flex items-center justify-center"><i class="fas fa-trash-alt"></i></button>
        </div>`;
    });
}

window.eliminarPrestamo = async (id) => {
    if (!confirm("¿Eliminar por completo?")) return;
    await deleteDoc(doc(db, "prestamos", id));
    const s = await getDocs(query(collection(db, "cuotas"), where("prestamoId", "==", id)));
    s.forEach(async (c) => await deleteDoc(doc(db, "cuotas", c.id)));
    renderPrestamos();
};

async function renderCobros() {
    pageTitle.innerText = "Cobros de Hoy";
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    mainContent.innerHTML = `<div id="lc" class="space-y-3 pb-24"></div>`;
    const snap = await getDocs(query(collection(db, "cuotas"), where("fecha", "==", Timestamp.fromDate(hoy)), where("estado", "==", "pendiente"), where("cobradorId", "==", auth.currentUser.uid)));
    const cont = document.getElementById('lc');
    if(snap.empty) { cont.innerHTML = `<div class="text-center py-20 opacity-30"><i class="fas fa-check-circle text-6xl mb-4"></i><p class="font-black uppercase text-xs">Nada pendiente</p></div>`; return; }
    for (const d of snap.docs) {
        const cuota = d.data(); const cliSnap = await getDoc(doc(db, "clientes", cuota.clienteId));
        cont.innerHTML += `<div class="bg-white p-5 rounded-3xl shadow-md border-l-8 border-blue-600 flex justify-between items-center animate-nudge">
            <div class="flex-1"><p class="font-black text-gray-400 uppercase text-[9px]">${cliSnap.data().nombre}</p><p class="text-blue-600 font-black text-2xl tracking-tighter">$${cuota.monto.toFixed(2)}</p></div>
            <button onclick="registrarCobro('${d.id}', '${cuota.clienteId}', '${cliSnap.data().nombre}', '${cliSnap.data().telefono}', '${cuota.monto.toFixed(2)}', '${cuota.n}')" class="bg-green-600 text-white h-16 px-8 rounded-2xl font-black shadow-lg uppercase text-[10px]">Cobrar</button>
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
            <div class="flex-1"><p class="font-black text-gray-400 uppercase text-[9px]">${cliSnap.data().nombre}</p><p class="text-red-600 font-black text-2xl tracking-tighter">$${c.monto.toFixed(2)}</p><p class="text-[8px] font-black text-gray-300 uppercase tracking-widest mt-1">Desde: ${c.fecha.toDate().toLocaleDateString()}</p></div>
            <button onclick="registrarCobro('${d.id}', '${c.clienteId}', '${cliSnap.data().nombre}', '${cliSnap.data().telefono}', '${c.monto.toFixed(2)}', '${c.n}')" class="bg-red-600 text-white h-12 px-6 rounded-2xl font-black shadow-lg uppercase text-[10px]">Cobrar</button>
        </div>`;
    }
}

async function renderReportes() {
    pageTitle.innerText = "Reportes";
    mainContent.innerHTML = `<p class="text-center py-20 font-black uppercase text-gray-300">Cargando datos...</p>`;
    const snapP = await getDocs(query(collection(db, "prestamos"), where("cobradorId", "==", auth.currentUser.uid)));
    const snapC = await getDocs(query(collection(db, "cuotas"), where("cobradorId", "==", auth.currentUser.uid), where("estado", "==", "pagado")));
    let tInvertido = 0, tCobrado = 0;
    snapP.forEach(d => tInvertido += d.data().monto);
    snapC.forEach(d => tCobrado += d.data().monto);
    mainContent.innerHTML = `
        <div class="space-y-4 pb-24">
            <div class="bg-white p-8 rounded-[2rem] shadow-xl border-t-8 border-blue-600 text-center">
                <p class="text-[10px] font-black text-gray-400 uppercase mb-2">Total Invertido</p>
                <p class="text-4xl font-black text-blue-600">$${tInvertido.toFixed(2)}</p>
            </div>
            <div class="bg-white p-8 rounded-[2rem] shadow-xl border-t-8 border-green-500 text-center">
                <p class="text-[10px] font-black text-gray-400 uppercase mb-2">Total Recuperado</p>
                <p class="text-4xl font-black text-green-600">$${tCobrado.toFixed(2)}</p>
            </div>
            <div class="bg-white p-8 rounded-[2rem] shadow-xl border-t-8 border-orange-500 text-center">
                <p class="text-[10px] font-black text-gray-400 uppercase mb-2">Ganancia Proyectada</p>
                <p class="text-4xl font-black text-orange-500">$${(tInvertido * 0.20).toFixed(2)}</p>
            </div>
            <button onclick="router('dashboard')" class="w-full text-gray-400 font-black uppercase text-[10px] py-4">Volver</button>
        </div>`;
}

async function guardarPrestamo(e) {
    e.preventDefault();
    const b = document.getElementById('btn-p'); b.disabled = true; b.innerText = "...";
    const cid = document.getElementById('pid').value, m = parseFloat(document.getElementById('p_m').value), i = parseFloat(document.getElementById('p_i').value), c = parseInt(document.getElementById('p_c').value), mod = document.getElementById('p_mod').value;
    const total = m * (1 + i / 100), vc = total / c;
    try {
        const pref = await addDoc(collection(db, "prestamos"), { clienteId: cid, mTotal: total, monto: m, total, interes: i, vCuota: vc, modalidad: mod, estado: "activo", cobradorId: auth.currentUser.uid, fecha: new Date() });
        for (let j = 1; j <= c; j++) {
            let f = new Date(); f.setHours(0,0,0,0);
            if (mod === "diario") f.setDate(f.getDate() + j);
            else if (mod === "semanal") f.setDate(f.getDate() + (j * 7));
            else if (mod === "quincenal") f.setDate(f.getDate() + (j * 15));
            else if (mod === "mensual") f.setMonth(f.getMonth() + j);
            await addDoc(collection(db, "cuotas"), { prestamoId: pref.id, clienteId: cid, n: j, monto: vc, fecha: Timestamp.fromDate(f), estado: "pendiente", cobradorId: auth.currentUser.uid });
        }
        alert("CREADO"); router('dashboard');
    } catch (err) { alert("Error"); b.disabled = false; }
}

window.abrirModalCliente = () => { document.getElementById('mod-c').classList.remove('hidden'); document.getElementById('cid-edit').value = ""; document.getElementById('f-c').reset(); };
window.prepararEdicion = (id, n, t) => { document.getElementById('mod-c').classList.remove('hidden'); document.getElementById('cid-edit').value = id; document.getElementById('cnom').value = n; document.getElementById('ctel').value = t; };
async function guardarOActualizarCliente(e) { e.preventDefault(); const id = document.getElementById('cid-edit').value, n = document.getElementById('cnom').value, t = document.getElementById('ctel').value; if(id) await updateDoc(doc(db, "clientes", id), {nombre: n, telefono: t}); else await addDoc(collection(db, "clientes"), {nombre: n, telefono: t, cobradorId: auth.currentUser.uid, fecha: new Date()}); document.getElementById('mod-c').classList.add('hidden'); renderClientes(); }
window.eliminarCliente = async (id) => { if(confirm("¿Borrar permanentemente?")) { await deleteDoc(doc(db, "clientes", id)); renderClientes(); } };
btnLogout.onclick = () => signOut(auth);
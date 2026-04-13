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
        <div class="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl mt-10 text-center">
            <h2 class="text-3xl font-black text-blue-600 mb-6 uppercase italic tracking-tighter">Siscop</h2>
            <form id="login-form" class="space-y-4">
                <input type="email" id="l-email" placeholder="Correo" class="w-full p-4 border rounded-2xl bg-gray-50 font-bold" required>
                <input type="password" id="l-pass" placeholder="Contraseña" class="w-full p-4 border rounded-2xl bg-gray-50 font-bold" required>
                <button type="submit" class="w-full bg-blue-600 text-white p-4 rounded-2xl font-black shadow-lg uppercase tracking-widest active:scale-95 transition-all">Entrar</button>
            </form>
        </div>
    `;
    document.getElementById('login-form').onsubmit = async (e) => {
        e.preventDefault();
        try { await signInWithEmailAndPassword(auth, document.getElementById('l-email').value, document.getElementById('l-pass').value); } 
        catch (error) { alert("Usuario o clave incorrectos"); }
    };
}

// --- DASHBOARD: SALDOS REALES ---
async function renderDashboard() {
    pageTitle.innerText = "Resumen de Negocio";
    mainContent.innerHTML = `
        <div class="grid grid-cols-2 gap-3 mb-6">
            <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-green-500 text-center">
                <p class="text-gray-400 text-[10px] font-black uppercase">Cobrado Hoy</p>
                <p id="s-cobrado" class="text-xl font-black text-green-600">$0.00</p>
            </div>
            <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-blue-500 text-center">
                <p class="text-gray-400 text-[10px] font-black uppercase">Por Cobrar Hoy</p>
                <p id="s-acobrar" class="text-xl font-black text-blue-500">$0.00</p>
            </div>
            <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-orange-500 text-center">
                <p class="text-gray-400 text-[10px] font-black uppercase">Ganancia Neta</p>
                <p id="s-ganancia" class="text-xl font-black text-orange-500">$0.00</p>
            </div>
            <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-red-600 text-center">
                <p class="text-gray-400 text-[10px] font-black uppercase">Deuda en Calle</p>
                <p id="s-total" class="text-xl font-black text-red-600">$0.00</p>
            </div>
        </div>
        <button onclick="router('cobros')" class="w-full bg-blue-600 text-white p-6 rounded-3xl font-black shadow-xl mb-4 flex items-center justify-center gap-3 active:scale-95 transition-all">
             <i class="fas fa-calendar-check text-2xl"></i> COBROS DE HOY
        </button>
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
            if (f.getTime() === hoy.getTime()) cobHoy += c.monto;
            ganTotal += c.monto * 0.166; 
        }
    });

    document.getElementById('s-cobrado').innerText = `$${cobHoy.toFixed(2)}`;
    document.getElementById('s-acobrar').innerText = `$${porCobHoy.toFixed(2)}`;
    document.getElementById('s-ganancia').innerText = `$${ganTotal.toFixed(2)}`;
    document.getElementById('s-total').innerText = `$${deudaCalle.toFixed(2)}`;
}

// --- CLIENTES CON BUSCADOR ---
function renderClientes() {
    pageTitle.innerText = "Mis Clientes";
    mainContent.innerHTML = `
        <div class="flex gap-2 mb-4">
            <input type="text" id="busc-cli" placeholder="Buscar cliente..." class="w-full p-4 border rounded-2xl shadow-sm outline-none font-bold">
            <button onclick="abrirModalCliente()" class="bg-blue-600 text-white p-4 rounded-2xl shadow-lg"><i class="fas fa-user-plus"></i></button>
        </div>
        <div id="lista-c" class="space-y-3 pb-24"></div>
        <div id="mod-c" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-3xl w-full max-w-md p-6">
                <form id="f-c" class="space-y-4">
                    <h3 id="mod-c-title" class="font-black text-center uppercase text-gray-700">Cliente</h3>
                    <input type="hidden" id="cid-edit">
                    <input type="text" id="cnom" placeholder="Nombre" class="w-full p-4 border rounded-xl font-bold" required>
                    <input type="tel" id="ctel" placeholder="Teléfono" class="w-full p-4 border rounded-xl font-bold" required>
                    <button type="submit" id="mod-c-btn" class="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase">Guardar</button>
                    <button type="button" onclick="document.getElementById('mod-c').classList.add('hidden')" class="w-full text-gray-400 font-bold">Cerrar</button>
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
    const snap = await getDocs(query(collection(db, "clientes"), where("cobradorId", "==", auth.currentUser.uid)));
    cont.innerHTML = "";
    snap.forEach(d => {
        const c = d.data();
        cont.innerHTML += `
            <div class="tarjeta-cliente bg-white p-4 rounded-2xl shadow-sm border flex justify-between items-center mb-2">
                <div onclick="verDetalleCliente('${d.id}', '${c.nombre}', '${c.telefono}')" class="flex items-center gap-3 flex-1 cursor-pointer">
                    <div class="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center font-black text-xl">${c.nombre.charAt(0)}</div>
                    <div><p class="font-bold text-gray-800">${c.nombre}</p><p class="text-[10px] text-gray-400 font-bold uppercase">${c.telefono}</p></div>
                </div>
                <div class="flex gap-2">
                    <button onclick="prepararEdicion('${d.id}', '${c.nombre}', '${c.telefono}')" class="text-blue-500 p-2"><i class="fas fa-edit"></i></button>
                    <button onclick="eliminarCliente('${d.id}')" class="text-red-300 p-2"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
    });
}

// --- PERFIL CLIENTE: LÓGICA DE MODALIDADES ---
window.verDetalleCliente = async (id, nombre, telefono) => {
    pageTitle.innerText = nombre;
    mainContent.innerHTML = `
        <div class="space-y-4 pb-24">
            <div class="bg-white p-6 rounded-3xl shadow-xl text-center">
                <h3 class="font-black text-xl text-gray-700 uppercase mb-4">${nombre}</h3>
                <div class="bg-gray-50 p-4 rounded-2xl mb-4 flex justify-around border shadow-inner">
                    <div class="text-center">
                        <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Recuperado</p>
                        <p id="c-pagado" class="font-black text-green-600 text-lg">$0.00</p>
                    </div>
                    <div class="text-center border-l pl-4">
                        <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pendiente</p>
                        <p id="c-pendiente" class="font-black text-red-600 text-lg">$0.00</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="document.getElementById('mod-p').classList.remove('hidden')" class="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black text-xs shadow-lg">+ PRÉSTAMO</button>
                    <a href="https://wa.me/${telefono}" class="flex-1 bg-green-500 text-white p-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg"><i class="fab fa-whatsapp text-lg"></i> WHATSAPP</a>
                </div>
            </div>
            <h4 class="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest text-center">Cuotas Pendientes</h4>
            <div id="lista-cuotas-cliente" class="space-y-2"></div>
        </div>

        <div id="mod-p" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                <form id="f-p" class="space-y-3">
                    <h3 class="font-black text-center text-gray-700 uppercase mb-2">Nuevo Préstamo</h3>
                    <input type="hidden" id="pid" value="${id}">
                    
                    <label class="text-[9px] font-black text-gray-500 uppercase ml-1">Monto Entregado ($)</label>
                    <input type="number" id="p_m" placeholder="5000" class="w-full p-4 border rounded-xl font-black bg-gray-50 outline-none focus:border-blue-500" required>
                    
                    <label class="text-[9px] font-black text-gray-500 uppercase ml-1">Interés (%)</label>
                    <input type="number" id="p_i" value="20" class="w-full p-4 border rounded-xl font-black bg-gray-50 outline-none focus:border-blue-500" required>
                    
                    <label class="text-[9px] font-black text-gray-500 uppercase ml-1">Cantidad de Cuotas</label>
                    <input type="number" id="p_c" value="20" class="w-full p-4 border rounded-xl font-black bg-gray-50 outline-none focus:border-blue-500" required>
                    
                    <label class="text-[9px] font-black text-gray-500 uppercase ml-1">Modalidad de Cobro</label>
                    <select id="p_mod" class="w-full p-4 border rounded-xl font-black bg-gray-50 outline-none focus:border-blue-500">
                        <option value="diario">Cobro Diario</option>
                        <option value="semanal">Cobro Semanal</option>
                        <option value="quincenal">Cobro Quincenal (15 días)</option>
                        <option value="mensual">Cobro Mensual</option>
                    </select>
                    
                    <div id="p_r" class="bg-blue-600 text-white p-4 rounded-xl text-center font-black text-lg shadow-md mt-2">Total: $0.00</div>
                    <button type="submit" id="btn-p" class="w-full bg-green-600 text-white p-4 rounded-xl font-black uppercase mt-2 shadow-lg">Crear Préstamo</button>
                    <button type="button" onclick="document.getElementById('mod-p').classList.add('hidden')" class="w-full text-gray-400 font-bold uppercase text-xs">Cerrar</button>
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
                <div class="bg-white p-4 rounded-2xl shadow-sm border flex justify-between items-center mb-2 animate-nudge">
                    <div>
                        <p class="font-black text-gray-400 text-[9px] uppercase tracking-tighter">CUOTA #${c.n} | ${c.fecha.toDate().toLocaleDateString()}</p>
                        <p class="text-blue-600 font-black text-lg">$${c.monto.toFixed(2)}</p>
                    </div>
                    <button onclick="registrarCobro('${d.id}', '${id}', '${nombre}', '${telefono}', '${c.monto.toFixed(2)}', '${c.n}')" class="bg-green-600 text-white px-5 py-2 rounded-xl font-black text-[10px] shadow-md">COBRAR</button>
                </div>`;
        }
    });
    document.getElementById('c-pagado').innerText = `$${pagado.toFixed(2)}`;
    document.getElementById('c-pendiente').innerText = `$${pendiente.toFixed(2)}`;
};

// --- FUNCIÓN DE COBRO ---
window.registrarCobro = async (id, cid, cnom, ctel, monto, n) => {
    if (!confirm(`¿Cobrar Cuota #${n} de $${monto}?`)) return;
    await updateDoc(doc(db, "cuotas", id), { estado: "pagado" });
    const msg = `🧾 *SISCOP - RECIBO DE PAGO*%0A👤 *Cliente:* ${cnom}%0A💰 *Cuota Pagada:* $${monto}%0A🔢 *Cuota Nro:* ${n}%0A📅 *Fecha:* ${new Date().toLocaleDateString()}%0A✅ *Gracias por su puntualidad.*`;
    window.open(`https://wa.me/${ctel}?text=${msg}`, '_blank');
    verDetalleCliente(cid, cnom, ctel);
};

// --- OTROS MÓDULOS ---
async function renderPrestamos() {
    pageTitle.innerText = "Historial General";
    mainContent.innerHTML = `<div id="lista-p" class="space-y-3 pb-24"></div>`;
    const snap = await getDocs(query(collection(db, "prestamos"), where("cobradorId", "==", auth.currentUser.uid)));
    const cont = document.getElementById('lista-p');
    if (snap.empty) { cont.innerHTML = `<p class="text-center py-20 text-gray-400 font-black text-xs uppercase italic">Sin registros</p>`; return; }
    snap.forEach(async d => {
        const p = d.data(); const cliSnap = await getDoc(doc(db, "clientes", p.clienteId));
        cont.innerHTML += `<div class="bg-white p-5 rounded-3xl shadow-sm border mb-3 flex justify-between items-center">
            <div><p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">${cliSnap.data() ? cliSnap.data().nombre : 'Borrado'}</p><p class="text-2xl font-black text-blue-600">$${p.total.toFixed(2)}</p><p class="text-[8px] font-bold text-gray-400 uppercase">${p.modalidad || 'Diario'}</p></div>
            <button onclick="eliminarPrestamo('${d.id}')" class="text-red-300 p-2"><i class="fas fa-trash"></i></button>
        </div>`;
    });
}

window.eliminarPrestamo = async (id) => {
    if (!confirm("¿Eliminar?")) return;
    await deleteDoc(doc(db, "prestamos", id));
    const s = await getDocs(query(collection(db, "cuotas"), where("prestamoId", "==", id)));
    s.forEach(async (c) => await deleteDoc(doc(db, "cuotas", c.id)));
    renderPrestamos();
};

async function renderCobros() {
    pageTitle.innerText = "Agenda de Hoy";
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    mainContent.innerHTML = `<div id="lc" class="space-y-3 pb-24"></div>`;
    const snap = await getDocs(query(collection(db, "cuotas"), where("fecha", "==", Timestamp.fromDate(hoy)), where("estado", "==", "pendiente"), where("cobradorId", "==", auth.currentUser.uid)));
    const cont = document.getElementById('lc');
    if(snap.empty) { cont.innerHTML = `<div class="text-center py-20 opacity-30"><i class="fas fa-check-circle text-6xl mb-4"></i><p class="font-black uppercase text-xs">Día completo</p></div>`; return; }
    for (const d of snap.docs) {
        const cuota = d.data(); const cliSnap = await getDoc(doc(db, "clientes", cuota.clienteId));
        cont.innerHTML += `<div class="bg-white p-5 rounded-3xl shadow-md border-l-8 border-blue-600 flex justify-between items-center">
            <div><p class="font-black text-gray-400 uppercase text-[9px]">${cliSnap.data().nombre}</p><p class="text-blue-600 font-black text-2xl">$${cuota.monto.toFixed(2)}</p></div>
            <button onclick="registrarCobro('${d.id}', '${cuota.clienteId}', '${cliSnap.data().nombre}', '${cliSnap.data().telefono}', '${cuota.monto.toFixed(2)}', '${cuota.n}')" class="bg-green-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg">COBRAR</button>
        </div>`;
    }
}

async function renderMorosos() {
    pageTitle.innerText = "Atrasados";
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    mainContent.innerHTML = `<div id="lm" class="space-y-3 pb-24"></div>`;
    const snap = await getDocs(query(collection(db, "cuotas"), where("fecha", "<", Timestamp.fromDate(hoy)), where("estado", "==", "pendiente"), where("cobradorId", "==", auth.currentUser.uid)));
    const cont = document.getElementById('lm');
    if(snap.empty) { cont.innerHTML = `<p class="text-center py-20 text-gray-400 font-bold uppercase text-xs italic">Nadie debe nada</p>`; return; }
    for (const d of snap.docs) {
        const c = d.data(); const cliSnap = await getDoc(doc(db, "clientes", c.clienteId));
        cont.innerHTML += `<div class="bg-white p-5 rounded-3xl shadow-md border-l-8 border-red-600 flex justify-between items-center">
            <div><p class="font-black text-gray-400 uppercase text-[9px]">${cliSnap.data().nombre}</p><p class="text-red-600 font-black text-2xl">$${c.monto.toFixed(2)}</p></div>
            <button onclick="registrarCobro('${d.id}', '${c.clienteId}', '${cliSnap.data().nombre}', '${cliSnap.data().telefono}', '${c.monto.toFixed(2)}', '${c.n}')" class="bg-red-600 text-white h-12 px-6 rounded-2xl font-black shadow-lg">COBRAR</button>
        </div>`;
    }
}

async function guardarPrestamo(e) {
    e.preventDefault();
    const b = document.getElementById('btn-p'); b.disabled = true; b.innerText = "...";
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
        alert("CREADO"); router('dashboard');
    } catch (err) { alert("Error"); b.disabled = false; }
}

window.abrirModalCliente = () => { document.getElementById('mod-c').classList.remove('hidden'); document.getElementById('cid-edit').value = ""; document.getElementById('f-c').reset(); };
window.prepararEdicion = (id, n, t) => { document.getElementById('mod-c').classList.remove('hidden'); document.getElementById('cid-edit').value = id; document.getElementById('cnom').value = n; document.getElementById('ctel').value = t; };
async function guardarOActualizarCliente(e) { e.preventDefault(); const id = document.getElementById('cid-edit').value, n = document.getElementById('cnom').value, t = document.getElementById('ctel').value; if(id) await updateDoc(doc(db, "clientes", id), {nombre: n, telefono: t}); else await addDoc(collection(db, "clientes"), {nombre: n, telefono: t, cobradorId: auth.currentUser.uid, fecha: new Date()}); document.getElementById('mod-c').classList.add('hidden'); renderClientes(); }
window.eliminarCliente = async (id) => { if(confirm("¿Borrar?")) { await deleteDoc(doc(db, "clientes", id)); renderClientes(); } };
btnLogout.onclick = () => signOut(auth);
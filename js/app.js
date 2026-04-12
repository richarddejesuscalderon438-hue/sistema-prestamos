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
            <i class="fas fa-money-check-alt text-6xl text-blue-600 mb-4"></i>
            <h2 class="text-2xl font-black text-blue-600 uppercase italic">Siscop</h2>
            <form id="login-form" class="space-y-4 mt-6">
                <input type="email" id="l-email" placeholder="Correo" class="w-full p-4 border rounded-2xl bg-gray-50 font-bold" required>
                <input type="password" id="l-pass" placeholder="Contraseña" class="w-full p-4 border rounded-2xl bg-gray-50 font-bold" required>
                <button type="submit" class="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase tracking-widest shadow-lg">Entrar</button>
            </form>
        </div>
    `;
    document.getElementById('login-form').onsubmit = async (e) => {
        e.preventDefault();
        try { await signInWithEmailAndPassword(auth, document.getElementById('l-email').value, document.getElementById('l-pass').value); } 
        catch (error) { alert("Datos incorrectos"); }
    };
}

// --- DASHBOARD (AHORA CON GANANCIAS) ---
async function renderDashboard() {
    pageTitle.innerText = "Resumen del Negocio";
    mainContent.innerHTML = `
        <div class="grid grid-cols-2 gap-3 mb-6">
            <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-green-500 text-center">
                <i class="fas fa-hand-holding-usd text-green-500 mb-1"></i>
                <p class="text-gray-400 text-[9px] font-black uppercase">Cobrado Hoy</p>
                <p id="s-cobrado" class="text-xl font-black text-green-600">$0.00</p>
            </div>
            <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-blue-500 text-center">
                <i class="fas fa-calendar-alt text-blue-500 mb-1"></i>
                <p class="text-gray-400 text-[9px] font-black uppercase">A Cobrar Hoy</p>
                <p id="s-acobrar" class="text-xl font-black text-blue-500">$0.00</p>
            </div>
            <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-orange-500 text-center">
                <i class="fas fa-chart-line text-orange-500 mb-1"></i>
                <p class="text-gray-400 text-[9px] font-black uppercase">Ganancia Hoy</p>
                <p id="s-ganancia" class="text-xl font-black text-orange-500">$0.00</p>
            </div>
            <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-gray-800 text-center">
                <i class="fas fa-vault text-gray-800 mb-1"></i>
                <p class="text-gray-400 text-[9px] font-black uppercase">Capital Calle</p>
                <p id="s-total" class="text-xl font-black text-gray-800">$0.00</p>
            </div>
        </div>
        <div class="space-y-3">
            <button onclick="router('cobros')" class="w-full bg-blue-600 text-white p-5 rounded-3xl font-black shadow-xl flex items-center justify-between">
                <div class="flex items-center gap-3"><i class="fas fa-money-bill-wave text-xl"></i><span>COBROS DE HOY</span></div>
                <i class="fas fa-chevron-right"></i>
            </button>
            <button onclick="router('morosos')" class="w-full bg-red-500 text-white p-5 rounded-3xl font-black shadow-xl flex items-center justify-between">
                <div class="flex items-center gap-3"><i class="fas fa-user-clock text-xl"></i><span>LISTA DE MOROSOS</span></div>
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;

    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const snapC = await getDocs(query(collection(db, "cuotas"), where("cobradorId", "==", auth.currentUser.uid)));
    const snapP = await getDocs(query(collection(db, "prestamos"), where("cobradorId", "==", auth.currentUser.uid), where("estado", "==", "activo")));
    
    let cob = 0, acob = 0, atr = 0, tot = 0, ganancia = 0;

    // Mapa para saber el % de interés de cada préstamo rápidamente
    const interesesPrestamos = {};
    snapP.forEach(d => {
        const p = d.data();
        tot += p.total;
        interesesPrestamos[d.id] = p.interes || 0;
    });

    snapC.forEach(d => {
        const c = d.data(); const f = c.fecha.toDate(); f.setHours(0,0,0,0);
        if (f.getTime() === hoy.getTime()) {
            if (c.estado === "pagado") {
                cob += c.monto;
                // Calcular ganancia (interés) de esta cuota
                const porcInteres = interesesPrestamos[c.prestamoId] || 20;
                ganancia += c.monto * (porcInteres / (100 + porcInteres));
            } else {
                acob += c.monto;
            }
        }
    });

    document.getElementById('s-cobrado').innerText = `$${cob.toFixed(2)}`;
    document.getElementById('s-acobrar').innerText = `$${acob.toFixed(2)}`;
    document.getElementById('s-ganancia').innerText = `$${ganancia.toFixed(2)}`;
    document.getElementById('s-total').innerText = `$${tot.toFixed(2)}`;
}

// --- MÓDULO CLIENTES (CON BUSCADOR EN VIVO) ---
function renderClientes() {
    pageTitle.innerText = "Mis Clientes";
    mainContent.innerHTML = `
        <div class="flex gap-2 mb-4">
            <div class="relative flex-1">
                <i class="fas fa-search absolute left-4 top-4 text-gray-400"></i>
                <input type="text" id="busc-cli" placeholder="Buscar cliente..." class="w-full p-4 pl-12 border rounded-2xl shadow-sm outline-none font-bold">
            </div>
            <button onclick="abrirModalCliente()" class="bg-blue-600 text-white p-4 rounded-2xl shadow-lg"><i class="fas fa-user-plus"></i></button>
        </div>
        <div id="lista-c" class="space-y-3 pb-24"></div>
        
        <div id="mod-c" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-3xl w-full max-w-md p-6">
                <form id="f-c" class="space-y-4">
                    <h3 id="mod-c-title" class="font-black text-center uppercase text-gray-700">Nuevo Cliente</h3>
                    <input type="hidden" id="cid-edit">
                    <input type="text" id="cnom" placeholder="Nombre completo" class="w-full p-4 border rounded-xl font-bold" required>
                    <input type="tel" id="ctel" placeholder="Teléfono" class="w-full p-4 border rounded-xl font-bold" required>
                    <button type="submit" id="mod-c-btn" class="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase">Guardar</button>
                    <button type="button" onclick="document.getElementById('mod-c').classList.add('hidden')" class="w-full text-gray-400 font-bold">Cerrar</button>
                </form>
            </div>
        </div>
    `;
    cargarClientes();

    // Lógica del buscador
    document.getElementById('busc-cli').oninput = (e) => {
        const busqueda = e.target.value.toLowerCase();
        const tarjetas = document.querySelectorAll('.tarjeta-cliente');
        tarjetas.forEach(t => {
            const nombre = t.getAttribute('data-nombre').toLowerCase();
            t.style.display = nombre.includes(busqueda) ? 'flex' : 'none';
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
            <div class="tarjeta-cliente bg-white p-4 rounded-2xl shadow-sm border flex justify-between items-center mb-2" data-nombre="${c.nombre}">
                <div onclick="verDetalleCliente('${d.id}', '${c.nombre}')" class="flex items-center gap-3 flex-1 cursor-pointer">
                    <div class="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center font-black text-xl">${c.nombre.charAt(0)}</div>
                    <div><p class="font-bold text-gray-800">${c.nombre}</p><p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">${c.telefono}</p></div>
                </div>
                <div class="flex gap-2">
                    <button onclick="prepararEdicion('${d.id}', '${c.nombre}', '${c.telefono}')" class="text-blue-500 p-2"><i class="fas fa-edit"></i></button>
                    <button onclick="eliminarCliente('${d.id}')" class="text-red-300 p-2"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
    });
}

// ... (El resto de funciones se mantienen iguales pero asegúrate de copiarlas todas abajo)

window.abrirModalCliente = () => {
    document.getElementById('mod-c-title').innerText = "Nuevo Cliente";
    document.getElementById('mod-c-btn').innerText = "Guardar";
    document.getElementById('f-c').reset();
    document.getElementById('cid-edit').value = "";
    document.getElementById('mod-c').classList.remove('hidden');
};

window.prepararEdicion = (id, nom, tel) => {
    document.getElementById('mod-c-title').innerText = "Modificar Cliente";
    document.getElementById('mod-c-btn').innerText = "Actualizar";
    document.getElementById('cid-edit').value = id;
    document.getElementById('cnom').value = nom;
    document.getElementById('ctel').value = tel;
    document.getElementById('mod-c').classList.remove('hidden');
};

async function guardarOActualizarCliente(e) {
    e.preventDefault();
    const id = document.getElementById('cid-edit').value;
    const nom = document.getElementById('cnom').value;
    const tel = document.getElementById('ctel').value;
    if (id) { await updateDoc(doc(db, "clientes", id), { nombre: nom, telefono: tel }); } 
    else { await addDoc(collection(db, "clientes"), { nombre: nom, telefono: tel, cobradorId: auth.currentUser.uid, fecha: new Date() }); }
    document.getElementById('mod-c').classList.add('hidden');
    renderClientes();
}

window.eliminarCliente = async (id) => {
    if (!confirm("¿Borrar cliente?")) return;
    await deleteDoc(doc(db, "clientes", id));
    renderClientes();
};

// --- MÓDULO PRÉSTAMOS ---
async function renderPrestamos() {
    pageTitle.innerText = "Historial de Préstamos";
    mainContent.innerHTML = `<div id="lista-p" class="space-y-4 pb-24"></div>`;
    const snap = await getDocs(query(collection(db, "prestamos"), where("cobradorId", "==", auth.currentUser.uid)));
    const cont = document.getElementById('lista-p');
    if (snap.empty) { cont.innerHTML = `<p class="text-center py-20 text-gray-400 font-bold uppercase text-xs italic">No hay préstamos.</p>`; return; }
    for (const d of snap.docs) {
        const p = d.data(); const cliSnap = await getDoc(doc(db, "clientes", p.clienteId));
        const nombre = cliSnap.exists() ? cliSnap.data().nombre : "Desconocido";
        cont.innerHTML += `
            <div class="bg-white p-5 rounded-3xl shadow-sm border mb-3">
                <div class="flex justify-between items-start">
                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${nombre}</p>
                    <button onclick="eliminarPrestamo('${d.id}')" class="text-red-300"><i class="fas fa-trash"></i></button>
                </div>
                <div class="flex justify-between items-end mt-2">
                    <div>
                        <p class="text-2xl font-black text-blue-600">$${p.total.toFixed(2)}</p>
                        <p class="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Cap: $${p.monto.toFixed(2)} | Int: ${p.interes}% | ${p.modalidad}</p>
                    </div>
                    <span class="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black uppercase">${p.estado}</span>
                </div>
            </div>`;
    }
}

window.eliminarPrestamo = async (id) => {
    if (!confirm("¿Borrar préstamo y sus cuotas?")) return;
    await deleteDoc(doc(db, "prestamos", id));
    const s = await getDocs(query(collection(db, "cuotas"), where("prestamoId", "==", id)));
    s.forEach(async (c) => await deleteDoc(doc(db, "cuotas", c.id)));
    renderPrestamos();
};

// --- PERFIL CLIENTE Y PAGOS ---
window.verDetalleCliente = async (id, nombre) => {
    pageTitle.innerText = nombre;
    mainContent.innerHTML = `
        <div class="space-y-4 pb-24 text-center">
            <div class="bg-white p-6 rounded-3xl shadow-xl">
                <div class="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-black mx-auto mb-2">${nombre.charAt(0)}</div>
                <h3 class="font-black text-lg uppercase text-gray-700 mb-4">${nombre}</h3>
                <button onclick="document.getElementById('mod-p').classList.remove('hidden')" class="w-full bg-blue-600 text-white p-4 rounded-2xl font-black shadow-lg text-xs">+ NUEVO PRÉSTAMO</button>
            </div>
            <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cuotas Pendientes</h4>
            <div id="lista-cuotas-cliente" class="space-y-2"></div>
        </div>

        <div id="mod-p" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-3xl w-full max-w-md p-6 overflow-y-auto max-h-[90vh]">
                <form id="f-p" class="space-y-3">
                    <h3 class="font-black text-center text-gray-700 uppercase">Datos del Préstamo</h3>
                    <input type="hidden" id="pid" value="${id}">
                    <label class="text-[9px] font-black text-gray-400 uppercase">Capital a entregar ($)</label>
                    <input type="number" id="p_m" placeholder="5000" class="w-full p-4 border rounded-xl font-bold bg-gray-50" required>
                    <label class="text-[9px] font-black text-gray-400 uppercase">Interés (%)</label>
                    <input type="number" id="p_i" value="20" class="w-full p-4 border rounded-xl font-bold bg-gray-50" required>
                    <label class="text-[9px] font-black text-gray-400 uppercase">Cantidad de Pagos</label>
                    <input type="number" id="p_c" value="20" class="w-full p-4 border rounded-xl font-bold bg-gray-50" required>
                    <label class="text-[9px] font-black text-gray-400 uppercase">Modalidad</label>
                    <select id="p_mod" class="w-full p-4 border rounded-xl font-bold bg-gray-50">
                        <option value="diario">Diario</option>
                        <option value="semanal">Semanal</option>
                        <option value="quincenal">Quincenal</option>
                        <option value="mensual">Mensual</option>
                    </select>
                    <div id="p_r" class="bg-blue-600 text-white p-4 rounded-xl text-center font-black text-lg uppercase shadow-md">Total: $0.00</div>
                    <button type="submit" id="btn-p" class="w-full bg-green-600 text-white p-4 rounded-xl font-black uppercase">Crear Préstamo</button>
                    <button type="button" onclick="document.getElementById('mod-p').classList.add('hidden')" class="w-full text-gray-400 font-bold uppercase text-xs">Cancelar</button>
                </form>
            </div>
        </div>
    `;

    const im = document.getElementById('p_m'), ii = document.getElementById('p_i'), res = document.getElementById('p_r');
    im.oninput = () => { res.innerText = `Total: $${((parseFloat(im.value)||0)*(1+(parseFloat(ii.value)||0)/100)).toFixed(2)}`; };
    ii.oninput = im.oninput;
    document.getElementById('f-p').onsubmit = guardarPrestamo;
    
    const snapC = await getDocs(query(collection(db, "cuotas"), where("clienteId", "==", id), where("estado", "==", "pendiente"), orderBy("n", "asc")));
    const contC = document.getElementById('lista-cuotas-cliente');
    contC.innerHTML = snapC.empty ? `<p class="text-center py-10 text-gray-400 text-xs font-black uppercase italic">Sin cuotas pendientes</p>` : "";
    snapC.forEach(d => {
        const c = d.data();
        contC.innerHTML += `
            <div class="bg-white p-4 rounded-2xl shadow-sm border flex justify-between items-center text-left">
                <div>
                    <p class="font-black text-gray-400 uppercase text-[9px]">Cuota #${c.n} | ${c.fecha.toDate().toLocaleDateString()}</p>
                    <p class="text-blue-600 font-black text-xl">$${c.monto.toFixed(2)}</p>
                </div>
                <button onclick="cobrarRapido('${d.id}', '${id}', '${nombre}')" class="bg-green-600 text-white px-5 py-2 rounded-xl font-black text-[10px] shadow-sm">COBRAR</button>
            </div>`;
    });
};

window.cobrarRapido = async (id, cid, cnom) => {
    await updateDoc(doc(db, "cuotas", id), { estado: "pagado" });
    verDetalleCliente(cid, cnom);
};

async function guardarPrestamo(e) {
    e.preventDefault();
    const b = document.getElementById('btn-p'); b.disabled = true; b.innerText = "PROCESANDO...";
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
        alert("¡ÉXITO!"); router('dashboard');
    } catch (err) { alert("Error"); b.disabled = false; }
}

// --- COBROS Y MOROSOS ---
async function renderCobros() {
    pageTitle.innerText = "Cobros de Hoy";
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    mainContent.innerHTML = `<div id="lc" class="space-y-3 pb-24"></div>`;
    const snap = await getDocs(query(collection(db, "cuotas"), where("fecha", "==", Timestamp.fromDate(hoy)), where("estado", "==", "pendiente"), where("cobradorId", "==", auth.currentUser.uid)));
    const cont = document.getElementById('lc');
    cont.innerHTML = snap.empty ? `<div class="text-center py-20"><i class="fas fa-umbrella-beach text-4xl text-gray-200 mb-2"></i><p class="text-gray-400 font-bold uppercase tracking-widest text-xs italic">Nada que cobrar hoy</p></div>` : "";
    for (const d of snap.docs) {
        const cuota = d.data(); const cliSnap = await getDoc(doc(db, "clientes", cuota.clienteId));
        cont.innerHTML += `<div class="bg-white p-5 rounded-3xl shadow-md border-l-8 border-blue-600 flex justify-between items-center">
            <div><p class="font-black text-gray-400 uppercase text-[9px]">${cliSnap.data().nombre}</p><p class="text-blue-600 font-black text-2xl">$${cuota.monto.toFixed(2)}</p></div>
            <button onclick="cobrar('${d.id}')" class="bg-green-600 text-white h-12 px-6 rounded-2xl font-black shadow-lg">COBRAR</button>
        </div>`;
    }
}

async function renderMorosos() {
    pageTitle.innerText = "Lista de Morosos";
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    mainContent.innerHTML = `<div id="lm" class="space-y-3 pb-24"></div>`;
    const snap = await getDocs(query(collection(db, "cuotas"), where("fecha", "<", Timestamp.fromDate(hoy)), where("estado", "==", "pendiente"), where("cobradorId", "==", auth.currentUser.uid)));
    const cont = document.getElementById('lm');
    cont.innerHTML = snap.empty ? `<p class="text-center py-20 text-gray-400 font-bold uppercase text-xs italic tracking-widest">Sin morosos hoy 👏</p>` : "";
    for (const d of snap.docs) {
        const c = d.data(); const cliSnap = await getDoc(doc(db, "clientes", c.clienteId));
        cont.innerHTML += `<div class="bg-white p-5 rounded-3xl shadow-md border-l-8 border-red-600 flex justify-between items-center">
            <div><p class="font-black text-gray-400 uppercase text-[9px]">${cliSnap.data().nombre}</p><p class="text-red-600 font-black text-2xl">$${c.monto.toFixed(2)}</p></div>
            <button onclick="cobrar('${d.id}', true)" class="bg-red-600 text-white h-12 px-6 rounded-2xl font-black shadow-lg">COBRAR</button>
        </div>`;
    }
}

window.cobrar = async (id, isM = false) => {
    if (!confirm("¿Registrar cobro?")) return;
    await updateDoc(doc(db, "cuotas", id), { estado: "pagado" });
    isM ? renderMorosos() : renderCobros();
};

btnLogout.onclick = () => { if(confirm("¿Cerrar sesión?")) signOut(auth); };
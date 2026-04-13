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
            <i class="fas fa-hand-holding-usd text-6xl text-blue-600 mb-4"></i>
            <h2 class="text-2xl font-black text-blue-600 uppercase">Siscop</h2>
            <form id="login-form" class="space-y-4 mt-6">
                <input type="email" id="l-email" placeholder="Correo" class="w-full p-4 border rounded-2xl bg-gray-50" required>
                <input type="password" id="l-pass" placeholder="Contraseña" class="w-full p-4 border rounded-2xl bg-gray-50" required>
                <button type="submit" class="w-full bg-blue-600 text-white p-4 rounded-2xl font-black">ENTRAR</button>
            </form>
        </div>
    `;
    document.getElementById('login-form').onsubmit = async (e) => {
        e.preventDefault();
        try { await signInWithEmailAndPassword(auth, document.getElementById('l-email').value, document.getElementById('l-pass').value); } 
        catch (error) { alert("Acceso denegado"); }
    };
}

// --- DASHBOARD (MEJORADO) ---
async function renderDashboard() {
    pageTitle.innerText = "Resumen de Negocio";
    mainContent.innerHTML = `
        <div class="grid grid-cols-2 gap-3 mb-6">
            <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-green-500 text-center">
                <p class="text-gray-400 text-[10px] font-black uppercase">Cobrado Hoy</p>
                <p id="s-cobrado" class="text-xl font-black text-green-600">$0.00</p>
            </div>
            <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-blue-500 text-center">
                <p class="text-gray-400 text-[10px] font-black uppercase">A Cobrar Hoy</p>
                <p id="s-acobrar" class="text-xl font-black text-blue-500">$0.00</p>
            </div>
            <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-orange-500 text-center">
                <p class="text-gray-400 text-[10px] font-black uppercase">Ganancia Estimada</p>
                <p id="s-ganancia" class="text-xl font-black text-orange-500">$0.00</p>
            </div>
            <div class="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-gray-800 text-center">
                <p class="text-gray-400 text-[10px] font-black uppercase">Total en Calle</p>
                <p id="s-total" class="text-xl font-black text-gray-800">$0.00</p>
            </div>
        </div>
        <button onclick="router('cobros')" class="w-full bg-blue-600 text-white p-6 rounded-3xl font-black shadow-xl flex items-center justify-center gap-3">
             <i class="fas fa-calendar-check text-2xl"></i> VER COBROS DEL DÍA
        </button>
    `;

    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const qC = query(collection(db, "cuotas"), where("cobradorId", "==", auth.currentUser.uid));
    const qP = query(collection(db, "prestamos"), where("cobradorId", "==", auth.currentUser.uid), where("estado", "==", "activo"));
    const [snapC, snapP] = await Promise.all([getDocs(qC), getDocs(qP)]);
    
    let cob = 0, acob = 0, atr = 0, tot = 0, gan = 0;
    snapC.forEach(d => {
        const c = d.data(); const f = c.fecha.toDate(); f.setHours(0,0,0,0);
        if (f.getTime() === hoy.getTime()) {
            if (c.estado === "pagado") cob += c.monto; else acob += c.monto;
        }
        if (c.estado === "pagado") {
            // Cálculo básico de ganancia: interés proporcional del monto
            gan += c.monto * 0.166; // Aproximación (interés del 20%)
        }
    });
    snapP.forEach(d => tot += d.data().total);
    document.getElementById('s-cobrado').innerText = `$${cob.toFixed(2)}`;
    document.getElementById('s-acobrar').innerText = `$${acob.toFixed(2)}`;
    document.getElementById('s-ganancia').innerText = `$${gan.toFixed(2)}`;
    document.getElementById('s-total').innerText = `$${tot.toFixed(2)}`;
}

// --- CLIENTES ---
function renderClientes() {
    pageTitle.innerText = "Mis Clientes";
    mainContent.innerHTML = `
        <div class="flex gap-2 mb-4">
            <input type="text" id="busc-cli" placeholder="Buscar..." class="w-full p-4 border rounded-2xl shadow-sm outline-none">
            <button onclick="document.getElementById('mod-c').classList.remove('hidden')" class="bg-blue-600 text-white p-4 rounded-2xl"><i class="fas fa-plus"></i></button>
        </div>
        <div id="lista-c" class="space-y-3 pb-24"></div>
        <div id="mod-c" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-3xl w-full max-w-md p-6">
                <form id="f-c" class="space-y-4">
                    <h3 class="font-bold text-center">Nuevo Cliente</h3>
                    <input type="text" id="cnom" placeholder="Nombre" class="w-full p-4 border rounded-xl" required>
                    <input type="tel" id="ctel" placeholder="Teléfono" class="w-full p-4 border rounded-xl" required>
                    <button type="submit" class="w-full bg-blue-600 text-white p-4 rounded-xl font-bold uppercase">Guardar</button>
                    <button type="button" onclick="document.getElementById('mod-c').classList.add('hidden')" class="w-full text-gray-400">Cancelar</button>
                </form>
            </div>
        </div>
    `;
    cargarClientes();
    
    document.getElementById('busc-cli').oninput = (e) => {
        const val = e.target.value.toLowerCase();
        document.querySelectorAll('.item-cli').forEach(el => {
            el.style.display = el.innerText.toLowerCase().includes(val) ? "flex" : "none";
        });
    };

    document.getElementById('f-c').onsubmit = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, "clientes"), { nombre: document.getElementById('cnom').value, telefono: document.getElementById('ctel').value, cobradorId: auth.currentUser.uid, fecha: new Date() });
        renderClientes();
    };
}

async function cargarClientes() {
    const cont = document.getElementById('lista-c');
    const snap = await getDocs(query(collection(db, "clientes"), where("cobradorId", "==", auth.currentUser.uid)));
    cont.innerHTML = "";
    snap.forEach(d => {
        const c = d.data();
        cont.innerHTML += `
            <div class="item-cli bg-white p-4 rounded-2xl shadow-sm border flex justify-between items-center mb-2">
                <div onclick="verDetalleCliente('${d.id}', '${c.nombre}', '${c.telefono}')" class="flex items-center gap-3 flex-1">
                    <div class="bg-blue-100 text-blue-600 w-10 h-10 rounded-full flex items-center justify-center font-black">${c.nombre.charAt(0)}</div>
                    <div><p class="font-bold">${c.nombre}</p><p class="text-[10px] text-gray-400 font-bold tracking-widest">${c.telefono}</p></div>
                </div>
                <button onclick="eliminarCliente('${d.id}')" class="text-red-300 p-2"><i class="fas fa-trash"></i></button>
            </div>`;
    });
}

window.eliminarCliente = async (id) => {
    if (!confirm("¿Borrar cliente?")) return;
    await deleteDoc(doc(db, "clientes", id));
    renderClientes();
};

// --- PERFIL CLIENTE CON WHATSAPP ---
window.verDetalleCliente = async (id, nombre, telefono) => {
    pageTitle.innerText = nombre;
    mainContent.innerHTML = `
        <div class="space-y-4 pb-24">
            <div class="bg-white p-6 rounded-3xl shadow-xl text-center">
                <h3 class="font-black text-xl text-gray-700 uppercase mb-4">${nombre}</h3>
                <div class="flex gap-2">
                    <button onclick="document.getElementById('mod-p').classList.remove('hidden')" class="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-bold text-xs">+ NUEVO PRÉSTAMO</button>
                    <a href="https://wa.me/${telefono}" class="flex-1 bg-green-500 text-white p-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2">
                        <i class="fab fa-whatsapp text-lg"></i> WHATSAPP
                    </a>
                </div>
            </div>
            <h4 class="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest text-center">Plan de Pagos</h4>
            <div id="lista-cuotas-cliente" class="space-y-2"></div>
        </div>

        <div id="mod-p" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-3xl w-full max-w-md p-6">
                <form id="f-p" class="space-y-3">
                    <h3 class="font-black text-center text-gray-700 uppercase">Nuevo Préstamo</h3>
                    <input type="hidden" id="pid" value="${id}">
                    <label class="text-[10px] font-black text-gray-400 uppercase">Monto ($)</label>
                    <input type="number" id="p_m" placeholder="5000" class="w-full p-4 border rounded-xl font-bold bg-gray-50" required>
                    <label class="text-[10px] font-black text-gray-400 uppercase">Interés (%)</label>
                    <input type="number" id="p_i" value="20" class="w-full p-4 border rounded-xl font-bold bg-gray-50" required>
                    <label class="text-[10px] font-black text-gray-400 uppercase">Pagos (Cantidad)</label>
                    <input type="number" id="p_c" value="20" class="w-full p-4 border rounded-xl font-bold bg-gray-50" required>
                    <label class="text-[10px] font-black text-gray-400 uppercase">Frecuencia</label>
                    <select id="p_mod" class="w-full p-4 border rounded-xl font-bold bg-gray-50">
                        <option value="diario">Diario</option>
                        <option value="semanal">Semanal</option>
                        <option value="mensual">Mensual</option>
                    </select>
                    <button type="submit" id="btn-p" class="w-full bg-blue-600 text-white p-4 rounded-xl font-bold uppercase">Crear</button>
                    <button type="button" onclick="document.getElementById('mod-p').classList.add('hidden')" class="w-full text-gray-400 font-bold">Cerrar</button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('f-p').onsubmit = guardarPrestamo;
    const snapC = await getDocs(query(collection(db, "cuotas"), where("clienteId", "==", id), where("estado", "==", "pendiente"), orderBy("n", "asc")));
    const contC = document.getElementById('lista-cuotas-cliente');
    contC.innerHTML = snapC.empty ? `<p class="text-center py-10 text-gray-400 text-[10px] font-black">Sin cuotas pendientes</p>` : "";
    snapC.forEach(d => {
        const c = d.data();
        contC.innerHTML += `
            <div class="bg-white p-4 rounded-2xl shadow-sm border flex justify-between items-center">
                <div>
                    <p class="font-black text-gray-400 text-[9px]">CUOTA #${c.n} | ${c.fecha.toDate().toLocaleDateString()}</p>
                    <p class="text-blue-600 font-black text-lg">$${c.monto.toFixed(2)}</p>
                </div>
                <button onclick="cobrarWhatsApp('${d.id}', '${id}', '${nombre}', '${telefono}', '${c.monto}', '${c.n}')" class="bg-green-600 text-white px-5 py-2 rounded-xl font-black text-[10px]">COBRAR</button>
            </div>`;
    });
};

// --- FUNCIÓN RECIBO WHATSAPP ---
window.cobrarWhatsApp = async (id, cid, cnom, ctel, monto, n) => {
    if (!confirm("¿Confirmar cobro y enviar recibo por WhatsApp?")) return;
    await updateDoc(doc(db, "cuotas", id), { estado: "pagado" });
    
    const msg = `🧾 *SISCOP - RECIBO DE PAGO*%0A------------------------------%0A👤 *Cliente:* ${cnom}%0A💰 *Monto Pagado:* $${monto}%0A🔢 *Cuota:* #${n}%0A📅 *Fecha:* ${new Date().toLocaleDateString()}%0A✅ *Estado:* PAGADO%0A------------------------------%0A¡Gracias por su puntualidad!`;
    const waLink = `https://wa.me/${ctel}?text=${msg}`;
    
    window.open(waLink, '_blank');
    verDetalleCliente(cid, cnom, ctel);
};

// --- RESTO DE FUNCIONES (PRÉSTAMOS, COBROS, MOROSOS) ---
async function renderPrestamos() {
    pageTitle.innerText = "Historial de Préstamos";
    mainContent.innerHTML = `<div id="lista-p" class="space-y-4 pb-24"></div>`;
    const snap = await getDocs(query(collection(db, "prestamos"), where("cobradorId", "==", auth.currentUser.uid)));
    const cont = document.getElementById('lista-p');
    if (snap.empty) { cont.innerHTML = `<p class="text-center py-20 text-gray-400 font-bold uppercase">Sin préstamos.</p>`; return; }
    for (const d of snap.docs) {
        const p = d.data(); const cliSnap = await getDoc(doc(db, "clientes", p.clienteId));
        cont.innerHTML += `<div class="bg-white p-5 rounded-3xl shadow-sm border mb-3 flex justify-between items-center">
            <div><p class="text-[9px] font-black text-gray-400 uppercase">${cliSnap.data().nombre}</p><p class="text-2xl font-black text-blue-600">$${p.total.toFixed(2)}</p></div>
            <button onclick="eliminarPrestamo('${d.id}')" class="text-red-300 p-2"><i class="fas fa-trash"></i></button>
        </div>`;
    }
}

window.eliminarPrestamo = async (id) => {
    if (!confirm("¿Borrar préstamo?")) return;
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
    cont.innerHTML = snap.empty ? `<p class="text-center py-20 text-gray-400 font-bold uppercase text-[10px]">Todo cobrado por hoy 🏖️</p>` : "";
    for (const d of snap.docs) {
        const cuota = d.data(); const cliSnap = await getDoc(doc(db, "clientes", cuota.clienteId));
        cont.innerHTML += `<div class="bg-white p-5 rounded-3xl shadow-md border-l-8 border-blue-600 flex justify-between items-center">
            <div><p class="font-black text-gray-400 uppercase text-[9px]">${cliSnap.data().nombre}</p><p class="text-blue-600 font-black text-2xl">$${cuota.monto.toFixed(2)}</p></div>
            <button onclick="cobrarWhatsApp('${d.id}', '${cuota.clienteId}', '${cliSnap.data().nombre}', '${cliSnap.data().telefono}', '${cuota.monto}', '${cuota.n}')" class="bg-green-600 text-white px-6 py-3 rounded-2xl font-black">COBRAR</button>
        </div>`;
    }
}

async function renderMorosos() {
    pageTitle.innerText = "Morosos";
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    mainContent.innerHTML = `<div id="lm" class="space-y-3 pb-24"></div>`;
    const snap = await getDocs(query(collection(db, "cuotas"), where("fecha", "<", Timestamp.fromDate(hoy)), where("estado", "==", "pendiente"), where("cobradorId", "==", auth.currentUser.uid)));
    const cont = document.getElementById('lm');
    cont.innerHTML = snap.empty ? `<p class="text-center py-20 text-gray-400 font-bold uppercase text-[10px]">Sin morosos 👏</p>` : "";
    for (const d of snap.docs) {
        const c = d.data(); const cliSnap = await getDoc(doc(db, "clientes", c.clienteId));
        cont.innerHTML += `<div class="bg-white p-5 rounded-3xl shadow-md border-l-8 border-red-600 flex justify-between items-center">
            <div><p class="font-black text-gray-400 uppercase text-[9px]">${cliSnap.data().nombre}</p><p class="text-red-600 font-black text-2xl">$${c.monto.toFixed(2)}</p></div>
            <button onclick="cobrarWhatsApp('${d.id}', '${c.clienteId}', '${cliSnap.data().nombre}', '${cliSnap.data().telefono}', '${c.monto}', '${c.n}')" class="bg-red-600 text-white px-6 py-3 rounded-2xl font-black">COBRAR</button>
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
            else if (mod === "mensual") f.setMonth(f.getMonth() + j);
            await addDoc(collection(db, "cuotas"), { prestamoId: pref.id, clienteId: cid, n: j, monto: vc, fecha: Timestamp.fromDate(f), estado: "pendiente", cobradorId: auth.currentUser.uid });
        }
        alert("PRÉSTAMO CREADO"); router('dashboard');
    } catch (err) { alert("Error"); b.disabled = false; }
}

btnLogout.onclick = () => { if(confirm("¿Cerrar sesión?")) signOut(auth); };
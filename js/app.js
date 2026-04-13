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

// --- SISTEMA DE NAVEGACIÓN INTELIGENTE (RECUERDA LA PÁGINA) ---
window.router = (route) => {
    // Si no viene ruta, buscamos en la URL (#) o por defecto dashboard
    const currentRoute = route || window.location.hash.replace('#', '') || 'dashboard';
    
    // Actualizar la URL sin recargar para que el navegador recuerde
    if (route) window.location.hash = route;

    mainContent.innerHTML = `<div class="flex justify-center py-20"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>`;
    
    if (currentRoute === 'dashboard') uiDashboard();
    if (currentRoute === 'clientes') uiClientes();
    if (currentRoute === 'prestamos') uiPrestamos();
    if (currentRoute.startsWith('perfil-')) {
        const id = currentRoute.split('-')[1];
        // Buscamos los datos básicos del cliente guardados o recargamos
        uiCargarPerfilDesdeURL(id);
    }
};

// Escuchar cuando el usuario pulsa "Atrás" o cambia la URL manualmente
window.addEventListener('hashchange', () => router());

onAuthStateChanged(auth, (user) => {
    if (user) { 
        bottomNav.classList.remove('hidden'); 
        btnLogout.classList.remove('hidden'); 
        router(); // Llama al router para ver dónde estaba el usuario
    } else { 
        bottomNav.classList.add('hidden'); 
        btnLogout.classList.add('hidden'); 
        uiLogin(); 
    }
});

// --- VISTA: LOGIN ---
function uiLogin() {
    pageTitle.innerText = "Entrar";
    mainContent.innerHTML = `
        <div class="max-w-md mx-auto bg-white p-8 rounded-[2rem] shadow-xl mt-6 text-center border-b-4 border-blue-600">
            <h2 class="text-3xl font-black text-blue-600 mb-6 uppercase italic">Siscop</h2>
            <form id="f-login" class="space-y-4">
                <input type="email" id="log-email" placeholder="Correo" class="w-full p-4 border rounded-2xl font-bold bg-gray-50 outline-none" required>
                <input type="password" id="log-pass" placeholder="Contraseña" class="w-full p-4 border rounded-2xl font-bold bg-gray-50" required>
                <button type="submit" class="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase shadow-lg">Ingresar</button>
            </form>
        </div>`;
    document.getElementById('f-login').onsubmit = async (e) => {
        e.preventDefault();
        try { await signInWithEmailAndPassword(auth, document.getElementById('log-email').value, document.getElementById('log-pass').value); } 
        catch (error) { alert("Error de acceso"); }
    };
}

// --- VISTA: DASHBOARD ---
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
            <button onclick="router('clientes')" class="w-full bg-blue-600 text-white p-6 rounded-[2rem] font-black shadow-xl flex items-center justify-between active:scale-95 transition-all">
                <span>NUEVO PRÉSTAMO</span>
                <i class="fas fa-plus-circle text-xl"></i>
            </button>
            <button onclick="router('prestamos')" class="w-full bg-white border-2 p-6 rounded-[2rem] font-black text-gray-700 flex items-center justify-between active:scale-95 transition-all">
                <span>VER HISTORIAL</span>
                <i class="fas fa-history text-xl text-blue-600"></i>
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

// --- VISTA: CLIENTES ---
function uiClientes() {
    pageTitle.innerText = "Clientes";
    mainContent.innerHTML = `
        <div class="flex gap-2 mb-4 px-2">
            <input type="text" id="b-cli" placeholder="Buscar cliente..." class="w-full p-4 border rounded-2xl font-bold outline-none bg-white shadow-sm">
            <button onclick="document.getElementById('m-c').classList.remove('hidden')" class="bg-blue-600 text-white p-4 rounded-2xl shadow-lg"><i class="fas fa-plus"></i></button>
        </div>
        <div id="l-c" class="space-y-2 pb-24 px-2"></div>
        <div id="m-c" class="fixed inset-0 bg-black/40 backdrop-blur-sm hidden flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl">
                <form id="f-c-nuevo" class="space-y-4">
                    <h3 class="font-black text-center uppercase text-gray-700">Nuevo Cliente</h3>
                    <input type="text" id="n-nom" placeholder="Nombre" class="w-full p-4 border rounded-2xl font-bold bg-gray-50 outline-none" required>
                    <input type="tel" id="n-tel" placeholder="WhatsApp" class="w-full p-4 border rounded-2xl font-bold bg-gray-50 outline-none" required>
                    <button type="submit" class="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase shadow-lg">Guardar Cliente</button>
                    <button type="button" onclick="document.getElementById('m-c').classList.add('hidden')" class="w-full text-gray-400 font-bold text-[10px] uppercase mt-2">Cerrar</button>
                </form>
            </div>
        </div>`;
    
    const loadC = async () => {
        const snap = await getDocs(query(collection(db, "clientes"), where("cobradorId", "==", auth.currentUser.uid), orderBy("nombre", "asc")));
        const cont = document.getElementById('l-c'); cont.innerHTML = "";
        snap.forEach(d => {
            const c = d.data();
            cont.innerHTML += `
            <div class="bg-white p-5 rounded-[2rem] border flex justify-between items-center mb-2 shadow-sm animate-nudge active:bg-gray-50" onclick="router('perfil-${d.id}')">
                <div class="flex-1">
                    <p class="font-black text-gray-800 uppercase text-sm">${c.nombre}</p>
                    <p class="text-[10px] text-gray-400 font-bold">${c.telefono}</p>
                </div>
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

// --- FUNCIÓN PARA CARGAR PERFIL DESDE URL (REFRESCO) ---
async function uiCargarPerfilDesdeURL(id) {
    const cliDoc = await getDoc(doc(db, "clientes", id));
    if (cliDoc.exists()) {
        const c = cliDoc.data();
        verPerfil(id, c.nombre, c.telefono);
    } else {
        router('clientes');
    }
}

// --- VISTA: PERFIL Y CALCULADORA ---
window.verPerfil = async (id, nombre, telefono) => {
    // Cambiamos el hash de la URL para que si refresca se quede aquí
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
                    <h3 class="font-black text-center text-gray-700 uppercase mb-4">Nuevo Préstamo</h3>
                    <input type="number" id="p-m" placeholder="Monto $" class="w-full p-4 border rounded-xl font-bold bg-gray-50 outline-none focus:border-blue-600" required>
                    <input type="number" id="p-i" value="20" placeholder="Interés %" class="w-full p-4 border rounded-xl font-bold bg-gray-50 outline-none focus:border-blue-600" required>
                    <input type="number" id="p-c" value="20" placeholder="Cuotas" class="w-full p-4 border rounded-xl font-bold bg-gray-50 outline-none" required>
                    <select id="p-mod" class="w-full p-4 border rounded-xl font-bold bg-gray-50 outline-none">
                        <option value="Diario">Diario</option><option value="Semanal">Semanal</option><option value="Quincenal">Quincenal</option><option value="Mensual">Mensual</option>
                    </select>

                    <div id="p-calc" class="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100 text-center my-4">
                        <p id="res-total" class="font-black text-gray-800 text-lg">Total: $0.00</p>
                        <p id="res-cuota" class="font-bold text-blue-500 text-sm">Cuotas de: $0.00</p>
                    </div>

                    <button type="submit" class="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase shadow-lg">Crear Préstamo</button>
                    <button type="button" onclick="document.getElementById('mod-p').classList.add('hidden')" class="w-full text-gray-400 font-bold text-[10px] uppercase py-2">Cerrar</button>
                </form>
            </div>
        </div>`;

    const inM = document.getElementById('p-m'), inI = document.getElementById('p-i'), inC = document.getElementById('p-c');
    const rT = document.getElementById('res-total'), rC = document.getElementById('res-cuota');
    const updateCalc = () => {
        const m = parseFloat(inM.value) || 0, i = parseFloat(inI.value) || 0, c = parseInt(inC.value) || 1;
        const total = m + (m * (i/100));
        rT.innerText = `Total: $${total.toFixed(2)}`;
        rC.innerText = `Cuotas de: $${(total/c).toFixed(2)}`;
    };
    inM.oninput = updateCalc; inI.oninput = updateCalc; inC.oninput = updateCalc;

    document.getElementById('f-p-final').onsubmit = async (e) => {
        e.preventDefault();
        const m = parseFloat(inM.value), i = parseFloat(inI.value), total = m + (m * (i/100));
        await addDoc(collection(db, "prestamos"), {
            clienteId: id, totalConInteres: total, saldoActual: total, 
            modalidad: document.getElementById('p-mod').value, estado: "activo", 
            cobradorId: auth.currentUser.uid, fecha: new Date()
        });
        alert("PRÉSTAMO CREADO"); router('prestamos');
    };

    const snapP = await getDocs(query(collection(db, "prestamos"), where("clienteId", "==", id), where("estado", "==", "activo")));
    const contP = document.getElementById('l-p-c');
    snapP.forEach(d => {
        const p = d.data();
        contP.innerHTML += `
            <div class="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-50 text-left">
                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Saldo Pendiente</p>
                <p class="text-4xl font-black text-blue-600 mb-6">$${p.saldoActual.toFixed(2)}</p>
                <div class="flex gap-3">
                    <input type="number" id="abono-${d.id}" placeholder="Monto" class="w-1/2 p-5 border-2 border-gray-50 rounded-2xl font-black bg-gray-50 outline-none">
                    <button onclick="regAbono('${d.id}', '${id}', '${nombre}', '${telefono}')" class="flex-1 bg-green-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-green-100">Abonar Pago</button>
                </div>
            </div>`;
    });
};

window.regAbono = async (pId, cId, cNom, cTel) => {
    const val = document.getElementById(`abono-${pId}`).value;
    if (!val || val <= 0) return alert("Escribe un monto");
    const pDoc = doc(db, "prestamos", pId);
    const snap = await getDoc(pDoc);
    const nuevoSaldo = snap.data().saldoActual - parseFloat(val);
    await updateDoc(pDoc, { saldoActual: nuevoSaldo, estado: nuevoSaldo <= 0 ? "pagado" : "activo" });
    await addDoc(collection(db, "abonos"), { prestamoId: pId, monto: parseFloat(val), fecha: new Date(), cobradorId: auth.currentUser.uid });
    alert("PAGO REGISTRADO"); verPerfil(cId, cNom, cTel);
};

// --- VISTA: HISTORIAL ---
async function uiPrestamos() {
    pageTitle.innerText = "Historial";
    const snap = await getDocs(query(collection(db, "prestamos"), where("cobradorId", "==", auth.currentUser.uid), orderBy("fecha", "desc")));
    const cont = document.getElementById('main-content');
    cont.innerHTML = `<div id="l-his" class="space-y-4 pb-24 px-2"></div>`;
    if(snap.empty) { document.getElementById('l-his').innerHTML = `<p class="text-center py-20 text-gray-400 font-black uppercase text-xs">Sin registros</p>`; return; }
    
    for (const d of snap.docs) {
        const p = d.data();
        const cliS = await getDoc(doc(db, "clientes", p.clienteId));
        const nombre = cliS.exists() ? cliS.data().nombre : "Desconocido";
        document.getElementById('l-his').innerHTML += `
        <div class="bg-white p-6 rounded-[2rem] shadow-sm border flex justify-between items-center mb-3">
            <div class="flex-1 cursor-pointer" onclick="router('perfil-${p.clienteId}')">
                <p class="text-blue-600 font-black uppercase text-[10px] tracking-widest">${nombre}</p>
                <p class="text-xl font-black text-gray-800">$${p.totalConInteres.toFixed(2)}</p>
                <p class="text-[9px] font-bold text-gray-400 uppercase">Saldo: $${p.saldoActual.toFixed(2)} | ${p.modalidad}</p>
            </div>
            <button onclick="deleteP('${d.id}')" class="bg-red-50 text-red-400 w-12 h-12 rounded-2xl flex items-center justify-center text-lg"><i class="fas fa-trash-alt"></i></button>
        </div>`;
    }
}

window.deleteC = async (id) => { if(confirm("¿Borrar cliente?")) { await deleteDoc(doc(db, "clientes", id)); uiClientes(); } };
window.deleteP = async (id) => { if(confirm("¿Borrar préstamo?")) { await deleteDoc(doc(db, "prestamos", id)); uiPrestamos(); } };
btnLogout.onclick = () => signOut(auth);
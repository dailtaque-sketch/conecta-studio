import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";

/* =========================================================
   CONECTA COMMUNITY MANAGER STUDIO
   APP COMPLETA
   ========================================================= */

const TEAM = [
  "Daiana",
  "Ayelen",
  "Luis",
  "Jesica",
  "Sheila",
  "Adriana",
  "Otros",
];

const USERS = [
  { username: "daiana", password: "conecta2026", name: "Daiana Taqueño", role: "Founder", fullAccess: true },
  { username: "adriana", password: "conecta2026", name: "Adriana", role: "Ejecutiva de Cuenta", fullAccess: false },
];

const NAV_ITEMS = [
  { name: "Dashboard", icon: "⌂" },
  { name: "Clientes", icon: "♟" },
  { name: "Presupuestos", icon: "▤" },
  { name: "Pagos", icon: "$" },
  { name: "Sueldos", icon: "●" },
  { name: "Métricas", icon: "↗" },
  { name: "Tareas", icon: "✓" },
];

function getUserPermissions(user) {
  if (!user) return [];
  return NAV_ITEMS.map((item) => item.name);
}

const PLANS = [
  "Plan Básico",
  "Plan Full",
  "Plan Pro",
  "Personalizado",
];

const PLAN_DETAILS = {
  "Plan Básico": {
    amount: 180000,
    items: [
      "4 posteos mensuales",
      "8 historias mensuales",
      "1 reel mensual",
    ],
  },
  "Plan Full": {
    amount: 295000,
    items: [
      "8 posteos mensuales",
      "12 historias mensuales",
      "2 reels mensuales",
    ],
  },
  "Plan Pro": {
    amount: 395000,
    items: [
      "12 posteos mensuales",
      "20 historias mensuales",
      "3 reels mensuales",
    ],
  },
};

function getPlanDetails(plan) {
  return PLAN_DETAILS[plan] || { amount: 0, items: [] };
}

const STATUS_CLIENT = [
  "Activo",
  "Pausado",
  "Finalizado",
];

const BUDGET_STATUS = [
  "Pendiente",
  "Aprobado",
  "Rechazado",
];

const TASK_STATUS = [
  "Pendiente",
  "Realizada",
  "Suspendida",
  "Reprogramada",
];

const RUBROS = [
  "Pinturería",
  "Gastronomía",
  "Indumentaria",
  "Automotor",
  "Construcción",
  "Servicios",
  "Salud",
  "Belleza",
  "Comercio",
  "Profesional",
  "Otro",
];

const SERVICES = [
  "Community Manager",
  "Redes sociales",
  "Diseño gráfico",
  "Mercado Libre",
  "Google Ads",
  "Meta Ads",
  "Página web",
  "Email Marketing",
  "Redes + Publicidad",
  "Servicio integral",
];

const emptyClient = {
  name: "",
  rubro: "",
  service: "",
  plan: "",
  monthly: "",
  status: "Activo",
  createdBy: "",
};

const emptyBudget = {
  client: "",
  responsible: "Daiana",
  service: "",
  plan: "",
  amount: "",
  status: "Pendiente",
  date: todayISO(),
  observations: "",
  email: "",
  phone: "",
  address: "",
  cuit: "",
  fiscal: "",
};

/* =========================================================
   UTILIDADES
   ========================================================= */

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const date = new Date(dateString + "T12:00:00");
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(dateString) {
  if (!dateString) return "-";

  const date = new Date(dateString + "T12:00:00");

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("es-AR");
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

/*
   Genera un número de presupuesto profesional y único.
   Formato: P-DDMMYY-HHMM-XX
   Ejemplo: P-250826-1432-01
*/
function generateBudgetNumber(existingBudgets = [], dateString) {
  const baseDate = dateString
    ? new Date(dateString + "T12:00:00")
    : new Date();

  const now = new Date();

  const dd = String(baseDate.getDate()).padStart(2, "0");
  const mm = String(baseDate.getMonth() + 1).padStart(2, "0");
  const yy = String(baseDate.getFullYear()).slice(-2);
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");

  const prefix = `P-${dd}${mm}${yy}-${hh}${min}`;

  const usedNumbers = existingBudgets
    .map((budget) => budget.number || "")
    .filter((number) => number.startsWith(prefix + "-"));

  let sequence = 1;
  let number = `${prefix}-${String(sequence).padStart(2, "0")}`;

  while (usedNumbers.includes(number)) {
    sequence += 1;
    number = `${prefix}-${String(sequence).padStart(2, "0")}`;
  }

  return number;
}

function getStored(key, fallback = []) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

/* =========================================================
   SUPABASE — PRESUPUESTOS
   ========================================================= */

function budgetToDatabaseRow(budget) {
  return {
    id: Number(budget.id),
    numero: budget.number || null,
    cliente_id: budget.clientId ? Number(budget.clientId) : null,
    cliente_nombre: budget.client || "",
    responsable: budget.responsible || "",
    importe: Number(budget.amount || 0),
    vencimiento: budget.expiration || null,
    estado: budget.status || "Pendiente",
    incluye: Array.isArray(budget.included)
      ? budget.included.join("\n")
      : (budget.included || ""),
    observaciones: budget.observations || "",
  };
}

function databaseRowToBudget(row) {
  return {
    id: Number(row.id),
    number: row.numero || "",
    client: row.cliente_nombre || "",
    clientId: row.cliente_id ?? null,
    responsible: row.responsable || "Daiana",
    service: row.service || "",
    plan: row.plan || "",
    amount: Number(row.importe || 0),
    status: row.estado || "Pendiente",
    date: row.created_at
      ? String(row.created_at).slice(0, 10)
      : todayISO(),
    expiration: row.vencimiento || null,
    included: row.incluye
      ? String(row.incluye).split("\n").filter(Boolean)
      : [],
    observations: row.observaciones || "",
    email: row.email || "",
    phone: row.phone || "",
    address: row.address || "",
    cuit: row.cuit || "",
    fiscal: row.fiscal || "",
    createdAt: row.created_at || new Date().toISOString(),
  };
}

/* =========================================================
   APP
   ========================================================= */

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("conecta_current_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [active, setActive] = useState("Dashboard");

  const [clients, setClients] = useState(() =>
    getStored("conecta_clients", [])
  );

  const [budgets, setBudgets] = useState(() =>
    getStored("conecta_budgets", [])
  );

  useEffect(() => {
    let cancelled = false;

    const loadBudgetsFromSupabase = async () => {
      const { data, error } = await supabase
        .from("presupuestos")
        .select("*")
        .order("id", { ascending: false });

      if (error) {
        console.error("Error cargando presupuestos desde Supabase:", error);
        return;
      }

      if (!cancelled && Array.isArray(data)) {
        const remoteBudgets = data.map(databaseRowToBudget);
        setBudgets(remoteBudgets);
        localStorage.setItem(
          "conecta_budgets",
          JSON.stringify(remoteBudgets)
        );
      }
    };

    loadBudgetsFromSupabase();

    const channel = supabase
      .channel("presupuestos-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "presupuestos",
        },
        () => {
          loadBudgetsFromSupabase();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const [payments, setPayments] = useState(() =>
    getStored("conecta_payments", [])
  );

  const [tasks, setTasks] = useState(() =>
    getStored("conecta_tasks", [])
  );

  const [showClientForm, setShowClientForm] =
    useState(false);

  const [clientForm, setClientForm] =
    useState({ ...emptyClient });

  const [showBudgetForm, setShowBudgetForm] =
    useState(false);

  const [budgetForm, setBudgetForm] =
    useState({ ...emptyBudget });

  const [taskText, setTaskText] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const permissions = getUserPermissions(currentUser);

  const handleLogin = (e) => {
    e.preventDefault();
    const username = loginForm.username.trim().toLowerCase();
    const user = USERS.find((item) => item.username === username && item.password === loginForm.password);
    if (!user) {
      setLoginError("Usuario o contraseña incorrectos.");
      return;
    }
    setCurrentUser(user);
    localStorage.setItem("conecta_current_user", JSON.stringify(user));
    setLoginForm({ username: "", password: "" });
    setLoginError("");
    setActive("Dashboard");
  };

  const logout = () => {
    localStorage.removeItem("conecta_current_user");
    setCurrentUser(null);
    setActive("Dashboard");
  };

  if (!currentUser) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginCard}>
          <div style={styles.loginLogo}>
            <img src="/logo-conecta.png" alt="Conecta" style={styles.loginLogoImage} onError={(e) => { e.currentTarget.style.display = "none"; }} />
          </div>
          <div style={styles.loginEyebrow}>CONECTA COMMUNITY MANAGER STUDIO</div>
          <h1 style={styles.loginTitle}>Ingresar a tu cuenta</h1>
          <p style={styles.loginSubtitle}>Accedé a la gestión de Conecta Studio.</p>
          <form onSubmit={handleLogin}>
            <Field label="Usuario">
              <input type="text" autoComplete="username" value={loginForm.username} onChange={(e) => setLoginForm((prev) => ({ ...prev, username: e.target.value }))} placeholder="Ingresá tu usuario" style={styles.input} />
            </Field>
            <Field label="Contraseña">
              <input type="password" autoComplete="current-password" value={loginForm.password} onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))} placeholder="Ingresá tu contraseña" style={styles.input} />
            </Field>
            {loginError && <div style={styles.loginError}>{loginError}</div>}
            <button type="submit" style={{ ...styles.primaryButton, width: "100%", marginTop: 10 }}>Ingresar</button>
          </form>
        </div>
      </div>
    );
  }

  /* =======================================================
     GUARDADOS
     ======================================================= */

  const saveClients = (data) => {
    setClients(data);
    localStorage.setItem(
      "conecta_clients",
      JSON.stringify(data)
    );
  };

  const saveBudgets = async (data) => {
    setBudgets(data);
    localStorage.setItem(
      "conecta_budgets",
      JSON.stringify(data)
    );

    const rows = data.map(budgetToDatabaseRow);

    if (rows.length === 0) return;

    const { error } = await supabase
      .from("presupuestos")
      .upsert(rows, { onConflict: "id" });

    if (error) {
      console.error("Error guardando presupuestos en Supabase:", error);
    }
  };

  const savePayments = (data) => {
    setPayments(data);
    localStorage.setItem(
      "conecta_payments",
      JSON.stringify(data)
    );
  };

  const saveTasks = (data) => {
    setTasks(data);
    localStorage.setItem(
      "conecta_tasks",
      JSON.stringify(data)
    );
  };

  /* =======================================================
     CLIENTES
     ======================================================= */

  const handleClientChange = (field, value) => {
    setClientForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const openNewClient = () => {
    setClientForm({ ...emptyClient });
    setShowClientForm(true);
    setActive("Clientes");
  };

  const addClient = (e) => {
    e.preventDefault();

    if (!clientForm.name.trim()) {
      alert("Ingresá el nombre del cliente.");
      return;
    }

    if (!clientForm.rubro) {
      alert("Seleccioná el rubro.");
      return;
    }

    if (!clientForm.service) {
      alert("Seleccioná el servicio.");
      return;
    }

    if (!clientForm.plan) {
      alert("Seleccioná el plan.");
      return;
    }

    if (!clientForm.monthly) {
      alert("Ingresá el valor mensual.");
      return;
    }

    if (!clientForm.createdBy) {
      alert("Seleccioná quién consiguió el cliente.");
      return;
    }

    const newClient = {
      id: Date.now(),
      name: clientForm.name.trim(),
      rubro: clientForm.rubro,
      service: clientForm.service,
      plan: clientForm.plan,
      monthly: Number(clientForm.monthly),
      status: clientForm.status,
      createdBy: clientForm.createdBy,
      createdAt: todayISO(),
    };

    saveClients([...clients, newClient]);

    setClientForm({ ...emptyClient });
    setShowClientForm(false);
  };

  const deleteClient = (id) => {
    if (!window.confirm("¿Querés eliminar este cliente?")) {
      return;
    }

    saveClients(
      clients.filter((client) => client.id !== id)
    );
  };

  /* =======================================================
     COMISIONES
     ======================================================= */

  const commissionRate = (person) => {
    if (
      person === "Daiana" ||
      person === "Ayelen"
    ) {
      return 0;
    }

    return 0.2;
  };

  const commissionForClient = (client) => {
    return (
      Number(client.monthly || 0) *
      commissionRate(client.createdBy)
    );
  };

  const salaryByPerson = TEAM.map((person) => {
    const personClients = clients.filter(
      (client) => client.createdBy === person
    );

    const sales = personClients.reduce(
      (total, client) =>
        total + Number(client.monthly || 0),
      0
    );

    const commission = personClients.reduce(
      (total, client) =>
        total + commissionForClient(client),
      0
    );

    return {
      person,
      clients: personClients.length,
      sales,
      commission,
      percentage: commissionRate(person) * 100,
    };
  });

  const totalCommissions = salaryByPerson.reduce(
    (total, person) =>
      total + Number(person.commission || 0),
    0
  );

  /* =======================================================
     MÉTRICAS
     ======================================================= */

  const totalMonthly = clients.reduce(
    (total, client) =>
      total + Number(client.monthly || 0),
    0
  );

  const activeClients = clients.filter(
    (client) => client.status === "Activo"
  );

  const totalCollected = payments.reduce(
    (total, payment) =>
      total + Number(payment.amount || 0),
    0
  );

  /* =======================================================
     PRESUPUESTOS
     ======================================================= */

  const updateBudget = (field, value) => {
    setBudgetForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const openNewBudget = () => {
    setBudgetForm({
      ...emptyBudget,
      date: todayISO(),
      responsible: "Daiana",
    });

    setShowBudgetForm(true);
    setActive("Presupuestos");
  };

  const addPaymentFromBudget = (budget) => {
    const alreadyExists = payments.some(
      (payment) =>
        payment.budgetId === budget.id
    );

    if (alreadyExists) {
      return;
    }

    const newPayment = {
      id: Date.now() + Math.random(),
      budgetId: budget.id,
      client: budget.client,
      amount: Number(budget.amount || 0),
      responsible: budget.responsible,
      service: budget.service,
      plan: budget.plan,
      status: "Pendiente de cobro",
      date: todayISO(),
    };

    savePayments([
      ...payments,
      newPayment,
    ]);
  };

  const addBudget = (e) => {
    e.preventDefault();

    if (!budgetForm.client.trim()) {
      alert("Ingresá el nombre del cliente.");
      return;
    }

    if (!budgetForm.service) {
      alert("Seleccioná el servicio.");
      return;
    }

    if (!budgetForm.plan) {
      alert("Seleccioná el plan.");
      return;
    }

    if (!budgetForm.amount) {
      alert("Ingresá el importe.");
      return;
    }

    const expiration = addDays(
      budgetForm.date,
      15
    );

    const newBudget = {
      id: Date.now(),
      number: generateBudgetNumber(
        budgets,
        budgetForm.date
      ),
      ...budgetForm,
      clientId: budgetForm.clientId
        ? Number(budgetForm.clientId)
        : null,
      client: budgetForm.client.trim(),
      amount: Number(budgetForm.amount),
      included: getPlanDetails(budgetForm.plan).items,
      expiration,
      createdAt: new Date().toISOString(),
    };

    const updatedBudgets = [
      ...budgets,
      newBudget,
    ];

    saveBudgets(updatedBudgets);

    if (newBudget.status === "Aprobado") {
      addPaymentFromBudget(newBudget);
    }

    setBudgetForm({
      ...emptyBudget,
      date: todayISO(),
    });

    setShowBudgetForm(false);
  };

  const changeBudgetStatus = (
    budgetId,
    newStatus
  ) => {
    const budget = budgets.find(
      (item) => item.id === budgetId
    );

    if (!budget) return;

    const updated = budgets.map((item) =>
      item.id === budgetId
        ? {
            ...item,
            status: newStatus,
          }
        : item
    );

    saveBudgets(updated);

    if (newStatus === "Aprobado") {
      addPaymentFromBudget({
        ...budget,
        status: "Aprobado",
      });
    }
  };

  const deleteBudget = (id) => {
    if (
      !window.confirm(
        "¿Eliminar este presupuesto?"
      )
    ) {
      return;
    }

    const remainingBudgets = budgets.filter(
      (budget) => budget.id !== id
    );

    saveBudgets(remainingBudgets);

    supabase
      .from("presupuestos")
      .delete()
      .eq("id", Number(id))
      .then(({ error }) => {
        if (error) {
          console.error(
            "Error eliminando presupuesto de Supabase:",
            error
          );
        }
      });
  };

  /* =======================================================
     PDF / PRESUPUESTO FORMAL
     ======================================================= */

  const generateBudgetPDF = (budget) => {
    const printWindow = window.open(
      "",
      "_blank",
      "width=900,height=1000"
    );

    if (!printWindow) {
      alert(
        "El navegador bloqueó la ventana. Permití ventanas emergentes para descargar el presupuesto."
      );
      return;
    }

    const logoUrl =
      window.location.origin +
      "/logo-conecta.png";

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />

        <title>
          Presupuesto ${budget.number || ""}
        </title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            background: #eeeeee;
            font-family: Arial, Helvetica, sans-serif;
            color: #241b16;
          }

          @page {
            size: A4;
            margin: 0;
          }

          .page {
            width: 210mm;
            height: 297mm;
            margin: 0 auto;
            background: #ffffff;
            padding: 10mm 13mm;
            overflow: hidden;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #b1844e;
            padding-bottom: 9px;
            margin-bottom: 10px;
          }

          .logo {
            width: 140px;
            max-height: 65px;
            object-fit: contain;
          }

          .logoFallback {
            width: 140px;
          }

          .logoText {
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 6px;
            color: #17110e;
          }

          .logoSub {
            font-size: 8px;
            letter-spacing: 3px;
            color: #b1844e;
            margin-top: 7px;
          }

          .documentData {
            text-align: right;
            font-size: 12px;
            line-height: 1.8;
            color: #6c5a4d;
          }

          .title {
            font-size: 29px;
            font-weight: 800;
            margin: 0 0 5px;
          }

          .subtitle {
            color: #806f63;
            font-size: 13px;
          }

          .sectionTitle {
            background: #b1844e;
            color: white;
            padding: 6px 9px;
            font-size: 9.5px;
            font-weight: 800;
            letter-spacing: 1.2px;
            margin-top: 8px;
          }

          .infoGrid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border: 1px solid #e2d5c9;
            border-top: none;
          }

          .info {
            padding: 6px 9px;
            border-bottom: 1px solid #eee5de;
            font-size: 10px;
            min-height: 31px;
          }

          .info:nth-child(odd) {
            border-right: 1px solid #eee5de;
          }

          .label {
            display: block;
            font-size: 7px;
            letter-spacing: 1px;
            color: #9a7b5e;
            font-weight: 800;
            margin-bottom: 4px;
            text-transform: uppercase;
          }

          .serviceBox {
            border: 1px solid #e2d5c9;
            padding: 9px 11px;
            border-top: none;
          }

          .plan {
            font-size: 15px;
            font-weight: 800;
            margin-bottom: 4px;
          }

          .amount {
            font-size: 20px;
            font-weight: 800;
            color: #a8753f;
            margin-top: 6px;
          }

          .included {
            margin-top: 7px;
            border: 1px solid #e2d5c9;
            padding: 7px 10px;
            background: #fbf7f2;
          }

          .includedTitle {
            font-size: 9.5px;
            font-weight: 800;
            color: #241b16;
            margin-bottom: 3px;
          }

          .included ul {
            margin: 0;
            padding-left: 15px;
            color: #6c5a4d;
            font-size: 9px;
            line-height: 1.35;
          }

          .observations {
            border: 1px solid #e2d5c9;
            border-top: none;
            padding: 7px 10px;
            min-height: 38px;
            font-size: 9.5px;
            white-space: pre-line;
          }

          .validity {
            margin-top: 8px;
            padding: 7px 9px;
            background: #f6f0ea;
            border-left: 3px solid #b1844e;
            font-size: 9px;
            line-height: 1.35;
          }

          .footer {
            margin-top: 13px;
            padding-top: 7px;
            border-top: 1px solid #e2d5c9;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #806f63;
          }

          .signature {
            margin-top: 14px;
            width: 250px;
            border-top: 1px solid #5f5148;
            padding-top: 8px;
            font-size: 11px;
          }

          .small {
            font-size: 8px;
            color: #8c7b6f;
            margin-top: 7px;
            line-height: 1.3;
          }

          @media print {
            body {
              background: white;
            }

            .page {
              margin: 0;
              width: 210mm;
              height: 297mm;
              box-shadow: none;
            }
          }
        </style>
      </head>

      <body>
        <div class="page">

          <div class="header">

            <div>
              <img
                class="logo"
                src="${logoUrl}"
                onerror="this.style.display='none';document.getElementById('fallback').style.display='block';"
              />

              <div
                id="fallback"
                class="logoFallback"
                style="display:none;"
              >
                <div class="logoText">
                  conecta
                </div>

                <div class="logoSub">
                  COMMUNITY MANAGER
                </div>

                <div class="logoSub">
                  STUDIO
                </div>
              </div>
            </div>

            <div class="documentData">
              <strong>PRESUPUESTO</strong><br />
              N.º ${budget.number || "-"}<br />
              Fecha: ${formatDate(budget.date)}<br />
              Válido hasta: ${formatDate(
                budget.expiration
              )}
            </div>

          </div>

          <h1 class="title">
            Propuesta comercial
          </h1>

          <div class="subtitle">
            Servicios de comunicación, marketing
            y gestión digital.
          </div>

          <div class="sectionTitle">
            DATOS DEL CLIENTE
          </div>

          <div class="infoGrid">

            <div class="info">
              <span class="label">
                Cliente
              </span>
              ${budget.client || "-"}
            </div>

            <div class="info">
              <span class="label">
                Responsable / Founder
              </span>
              ${budget.responsible || "Daiana Taqueño"}<br />
              <span style="font-size:8px;color:#8c7b6f;">Founder · Conecta Studio</span>
            </div>

            <div class="info">
              <span class="label">
                Teléfono
              </span>
              ${budget.phone || "-"}
            </div>

            <div class="info">
              <span class="label">
                Email
              </span>
              ${budget.email || "-"}
            </div>

            <div class="info">
              <span class="label">
                Dirección
              </span>
              ${budget.address || "-"}
            </div>

            <div class="info">
              <span class="label">
                CUIT
              </span>
              ${budget.cuit || "-"}
            </div>

            <div class="info">
              <span class="label">
                Condición fiscal
              </span>
              ${budget.fiscal || "-"}
            </div>

          </div>

          <div class="sectionTitle">
            SERVICIO COTIZADO
          </div>

          <div class="serviceBox">

            <div class="plan">
              ${budget.plan || "-"}
            </div>

            <div>
              Servicio:
              <strong>
                ${budget.service || "-"}
              </strong>
            </div>

            <div class="amount">
              ${formatMoney(
                budget.amount
              )}
              <span style="
                font-size:12px;
                color:#806f63;
                font-weight:normal;
              ">
                / mensual
              </span>
            </div>

          </div>

          ${
            ((budget.included && budget.included.length > 0) || getPlanDetails(budget.plan).items.length > 0)
              ? `
                <div class="included">
                  <div class="includedTitle">
                    INCLUYE EL PLAN
                  </div>
                  <ul>
                    ${(budget.included || getPlanDetails(budget.plan).items).map((item) => `<li>${item}</li>`).join("")}
                  </ul>
                </div>
              `
              : ""
          }

          <div class="sectionTitle">
            OBSERVACIONES
          </div>

          <div class="observations">
            ${
              budget.observations ||
              "Sin observaciones."
            }
          </div>

          <div class="validity">

            <strong>
              VALIDEZ DEL PRESUPUESTO
            </strong>

            <br />

            Este presupuesto tiene una
            vigencia de <strong>15 días</strong>
            desde la fecha de emisión.

            <br />

            Vencimiento:
            <strong>
              ${formatDate(
                budget.expiration
              )}
            </strong>

          </div>

          <div class="signature">
            <strong>
              Daiana Taqueño
            </strong>
            <br />
            Founder · Conecta Studio
          </div>

          <div class="small">
            La aceptación de este presupuesto
            implica la conformidad con el servicio,
            alcance y valor detallados.
            El inicio del servicio queda sujeto
            a la confirmación correspondiente.
          </div>

          <div class="footer">
            <span>
              Conecta Community Manager Studio
            </span>

            <span>
              Presupuesto ${budget.number || "-"}
            </span>
          </div>

        </div>

        <script>
          window.onload = function () {
            setTimeout(function () {
              window.print();
            }, 500);
          };
        </script>

      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  /* =======================================================
     PAGOS
     ======================================================= */

  const deletePayment = (id) => {
    if (
      !window.confirm(
        "¿Eliminar este registro de pago?"
      )
    ) {
      return;
    }

    savePayments(
      payments.filter(
        (payment) => payment.id !== id
      )
    );
  };

  /* =======================================================
     TAREAS
     ======================================================= */

  const addTask = (e) => {
    e.preventDefault();

    if (!taskText.trim()) {
      return;
    }

    const newTask = {
      id: Date.now(),
      text: taskText.trim(),
      status: "Pendiente",
      completed: false,
    };

    saveTasks([
      ...tasks,
      newTask,
    ]);

    setTaskText("");
  };

  const changeTaskStatus = (id, status) => {
    saveTasks(
      tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              status,
              completed: status === "Realizada",
            }
          : task
      )
    );
  };

  const deleteTask = (id) => {
    saveTasks(
      tasks.filter(
        (task) => task.id !== id
      )
    );
  };

  /* =======================================================
     NAVEGACIÓN
     ======================================================= */

  const navItems = NAV_ITEMS.filter((item) => permissions.includes(item.name));

  return (
    <div className="conecta-app" style={styles.app}>

      <button
        type="button"
        className="conecta-mobile-toggle"
        onClick={() => setMobileMenuOpen((value) => !value)}
        aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={mobileMenuOpen}
      >
        {mobileMenuOpen ? "✕" : "☰"}
      </button>

      {mobileMenuOpen && (
        <button
          type="button"
          className="conecta-mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      {/* =================================================
          SIDEBAR
          ================================================= */}

      <aside
        className={`conecta-sidebar${mobileMenuOpen ? " mobile-open" : ""}`}
        style={styles.sidebar}
      >

        <div style={styles.logoContainer}>

          <img
            src="/logo-conecta.png"
            alt="Conecta Community Manager Studio"
            style={styles.logo}
            onError={(e) => {
              e.currentTarget.style.display =
                "none";

              const fallback =
                e.currentTarget
                  .nextElementSibling;

              if (fallback) {
                fallback.style.display =
                  "block";
              }
            }}
          />

          <div
            style={{
              ...styles.logoFallback,
              display: "none",
            }}
          >
            <div style={styles.logoText}>
              conecta
            </div>

            <div style={styles.logoSub}>
              COMMUNITY MANAGER
            </div>

            <div style={styles.logoSub}>
              STUDIO
            </div>
          </div>

        </div>

        <div style={styles.separator} />

        <div style={styles.menuTitle}>
          MENÚ
        </div>

        <nav>

          {navItems.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => {
                setActive(item.name);
                setMobileMenuOpen(false);
              }}
              style={{
                ...styles.navButton,
                ...(active === item.name
                  ? styles.navButtonActive
                  : {}),
              }}
            >
              <span style={styles.navIcon}>
                {item.icon}
              </span>

              <span>
                {item.name}
              </span>
            </button>
          ))}

        </nav>

        <div style={styles.sidebarBottom}>
          <div style={styles.userCircle}>
            {(currentUser?.name || "U").charAt(0)}
          </div>
          <div style={{ minWidth: 0 }}>
            <strong>{currentUser?.name || "Usuario"}</strong>
            <small>{currentUser?.role || ""}</small>
          </div>
          <button type="button" onClick={() => { setMobileMenuOpen(false); logout(); }} title="Cerrar sesión" style={styles.logoutButton}>Salir</button>
        </div>

      </aside>

      {/* =================================================
          CONTENIDO
          ================================================= */}

      <main className="conecta-main" style={styles.main}>

        <div className="conecta-top-brand" style={styles.topBrand}>
          <span>CONECTA COMMUNITY MANAGER STUDIO</span>
          <span style={styles.topUserBadge}>{currentUser?.name} · {currentUser?.role}</span>
        </div>

        {/* =================================================
            DASHBOARD
            ================================================= */}

        {active === "Dashboard" && (
          <section>

            <PageTitle
              title="Dashboard"
              subtitle="Gestioná tu agencia desde un solo lugar."
            />

            <div style={styles.statsGrid}>

              <StatCard
                title="CLIENTES TOTALES"
                value={clients.length}
              />

              <StatCard
                title="CLIENTES ACTIVOS"
                value={activeClients.length}
              />

              <StatCard
                title="FACTURACIÓN MENSUAL"
                value={formatMoney(
                  totalMonthly
                )}
              />

              <StatCard
                title="COMISIONES DEL EQUIPO"
                value={formatMoney(
                  totalCommissions
                )}
              />

            </div>

            <div style={styles.welcomeCard}>

              <h2>
                Bienvenida a Conecta Studio 👋
              </h2>

              <p>
                Desde acá vas a poder
                administrar clientes,
                presupuestos, pagos,
                sueldos, métricas y tareas
                de tu agencia.
              </p>

              <button
                type="button"
                style={styles.primaryButton}
                onClick={openNewClient}
              >
                + Agregar cliente
              </button>

            </div>

          </section>
        )}

        {/* =================================================
            CLIENTES
            ================================================= */}

        {active === "Clientes" && (
          <section>

            <PageTitle
              title="Clientes"
              subtitle="Toda tu cartera de clientes en un solo lugar."
              action={
                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={openNewClient}
                >
                  + Nuevo cliente
                </button>
              }
            />

            {showClientForm && (
              <form
                onSubmit={addClient}
                style={styles.formCard}
              >

                <h2>
                  Nuevo cliente
                </h2>

                <p
                  style={
                    styles.formDescription
                  }
                >
                  Completá todos los datos
                  del cliente.
                </p>

                <div style={styles.formGrid}>

                  <Field label="Nombre del cliente">
                    <input
                      type="text"
                      value={clientForm.name}
                      onChange={(e) =>
                        handleClientChange(
                          "name",
                          e.target.value
                        )
                      }
                      placeholder="Ej: Pinturería Roma"
                      style={styles.input}
                    />
                  </Field>

                  <Field label="Rubro">
                    <select
                      value={clientForm.rubro}
                      onChange={(e) =>
                        handleClientChange(
                          "rubro",
                          e.target.value
                        )
                      }
                      style={styles.input}
                    >
                      <option value="">
                        Seleccionar rubro
                      </option>

                      {RUBROS.map(
                        (rubro) => (
                          <option
                            key={rubro}
                            value={rubro}
                          >
                            {rubro}
                          </option>
                        )
                      )}
                    </select>
                  </Field>

                  <Field label="Servicio contratado">
                    <select
                      value={clientForm.service}
                      onChange={(e) =>
                        handleClientChange(
                          "service",
                          e.target.value
                        )
                      }
                      style={styles.input}
                    >
                      <option value="">
                        Seleccionar servicio
                      </option>

                      {SERVICES.map(
                        (service) => (
                          <option
                            key={service}
                            value={service}
                          >
                            {service}
                          </option>
                        )
                      )}
                    </select>
                  </Field>

                  <Field label="Plan contratado">
                    <select
                      value={clientForm.plan}
                      onChange={(e) =>
                        handleClientChange(
                          "plan",
                          e.target.value
                        )
                      }
                      style={styles.input}
                    >
                      <option value="">
                        Seleccionar plan
                      </option>

                      {PLANS.map(
                        (plan) => (
                          <option
                            key={plan}
                            value={plan}
                          >
                            {plan}
                          </option>
                        )
                      )}
                    </select>
                  </Field>

                  <Field label="Mensualidad">
                    <input
                      type="number"
                      min="0"
                      value={
                        clientForm.monthly
                      }
                      onChange={(e) =>
                        handleClientChange(
                          "monthly",
                          e.target.value
                        )
                      }
                      placeholder="Ej: 500000"
                      style={styles.input}
                    />
                  </Field>

                  <Field label="Estado">
                    <select
                      value={
                        clientForm.status
                      }
                      onChange={(e) =>
                        handleClientChange(
                          "status",
                          e.target.value
                        )
                      }
                      style={styles.input}
                    >
                      {STATUS_CLIENT.map(
                        (status) => (
                          <option
                            key={status}
                            value={status}
                          >
                            {status}
                          </option>
                        )
                      )}
                    </select>
                  </Field>

                  <Field label="¿Quién consiguió el cliente?">
                    <select
                      value={
                        clientForm.createdBy
                      }
                      onChange={(e) =>
                        handleClientChange(
                          "createdBy",
                          e.target.value
                        )
                      }
                      style={styles.input}
                    >
                      <option value="">
                        Seleccionar persona
                      </option>

                      {TEAM.map(
                        (person) => (
                          <option
                            key={person}
                            value={person}
                          >
                            {person}
                          </option>
                        )
                      )}
                    </select>
                  </Field>

                </div>

                <div
                  style={styles.formButtons}
                >

                  <button
                    type="submit"
                    style={
                      styles.primaryButton
                    }
                  >
                    Guardar cliente
                  </button>

                  <button
                    type="button"
                    style={
                      styles.secondaryButton
                    }
                    onClick={() => {
                      setShowClientForm(
                        false
                      );

                      setClientForm({
                        ...emptyClient,
                      });
                    }}
                  >
                    Cancelar
                  </button>

                </div>

              </form>
            )}

            <div style={styles.clientList}>

              {clients.length === 0 ? (
                <div style={styles.empty}>

                  <h2>
                    No hay clientes todavía
                  </h2>

                  <p>
                    Agregá tu primer cliente
                    para comenzar.
                  </p>

                </div>
              ) : (
                clients.map((client) => (
                  <div
                    key={client.id}
                    style={styles.clientCard}
                  >

                    <div>
                      <h3>
                        {client.name}
                      </h3>

                      <p>
                        {client.rubro}
                        {" · "}
                        {client.service}
                      </p>

                      <small>
                        Cliente conseguido
                        por:{" "}
                        <strong>
                          {client.createdBy}
                        </strong>
                      </small>
                    </div>

                    <div>
                      <span
                        style={
                          styles.labelSmall
                        }
                      >
                        PLAN
                      </span>

                      <strong>
                        {client.plan}
                      </strong>
                    </div>

                    <div>
                      <span
                        style={
                          styles.labelSmall
                        }
                      >
                        MENSUAL
                      </span>

                      <strong>
                        {formatMoney(
                          client.monthly
                        )}
                      </strong>
                    </div>

                    <div>
                      <span
                        style={{
                          ...styles.status,
                          ...(client.status ===
                          "Activo"
                            ? styles.statusActive
                            : styles.statusInactive),
                        }}
                      >
                        {client.status}
                      </span>
                    </div>

                    <div>
                      <span
                        style={
                          styles.labelSmall
                        }
                      >
                        COMISIÓN
                      </span>

                      <strong>
                        {client.createdBy ===
                          "Daiana" ||
                        client.createdBy ===
                          "Ayelen"
                          ? "Sin comisión"
                          : formatMoney(
                              commissionForClient(
                                client
                              )
                            )}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        deleteClient(
                          client.id
                        )
                      }
                      style={
                        styles.deleteButton
                      }
                      title="Eliminar cliente"
                    >
                      🗑
                    </button>

                  </div>
                ))
              )}

            </div>

          </section>
        )}

        {/* =================================================
            PRESUPUESTOS
            ================================================= */}

        {active === "Presupuestos" && (
          <section>

            <PageTitle
              title="Presupuestos"
              subtitle="Creá y administrá los presupuestos de tus potenciales clientes."
              action={
                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={openNewBudget}
                >
                  + Nuevo presupuesto
                </button>
              }
            />

            {showBudgetForm && (
              <form
                onSubmit={addBudget}
                style={styles.formCard}
              >

                <h2>
                  Nuevo presupuesto
                </h2>

                <p
                  style={
                    styles.formDescription
                  }
                >
                  Completá los datos. El
                  presupuesto tendrá una
                  vigencia automática de
                  15 días.
                </p>

                <div style={styles.formGrid}>

                  <Field label="Cliente">
                    <input
                      type="text"
                      value={
                        budgetForm.client
                      }
                      onChange={(e) =>
                        updateBudget(
                          "client",
                          e.target.value
                        )
                      }
                      placeholder="Escribí el nombre del cliente"
                      style={styles.input}
                    />
                  </Field>

                  <Field label="Responsable">
                    <select
                      value={
                        budgetForm.responsible
                      }
                      onChange={(e) =>
                        updateBudget(
                          "responsible",
                          e.target.value
                        )
                      }
                      style={styles.input}
                    >
                      {TEAM.map(
                        (person) => (
                          <option
                            key={person}
                            value={person}
                          >
                            {person}
                          </option>
                        )
                      )}
                    </select>
                  </Field>

                  <Field label="Servicio">
                    <select
                      value={
                        budgetForm.service
                      }
                      onChange={(e) =>
                        updateBudget(
                          "service",
                          e.target.value
                        )
                      }
                      style={styles.input}
                    >
                      <option value="">
                        Seleccionar servicio
                      </option>

                      {SERVICES.map(
                        (service) => (
                          <option
                            key={service}
                            value={service}
                          >
                            {service}
                          </option>
                        )
                      )}
                    </select>
                  </Field>

                  <Field label="Plan">
                    <select
                      value={
                        budgetForm.plan
                      }
                      onChange={(e) => {
                        const selectedPlan = e.target.value;
                        const details = getPlanDetails(selectedPlan);
                        setBudgetForm((prev) => ({
                          ...prev,
                          plan: selectedPlan,
                          amount: details.amount ? String(details.amount) : prev.amount,
                        }));
                      }}
                      style={styles.input}
                    >
                      <option value="">
                        Seleccionar plan
                      </option>

                      {PLANS.map(
                        (plan) => (
                          <option
                            key={plan}
                            value={plan}
                          >
                            {plan}
                          </option>
                        )
                      )}
                    </select>
                  </Field>

                  {budgetForm.plan && getPlanDetails(budgetForm.plan).items.length > 0 && (
                    <div
                      style={{
                        gridColumn: "1 / -1",
                        border: "1px solid #e2d5c9",
                        borderRadius: "14px",
                        padding: "18px",
                        background: "#fbf7f2",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 800,
                          color: "#241b16",
                          marginBottom: "10px",
                        }}
                      >
                        Incluye {budgetForm.plan}
                      </div>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: "22px",
                          color: "#6c5a4d",
                          lineHeight: 1.8,
                        }}
                      >
                        {getPlanDetails(budgetForm.plan).items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Field label="Importe mensual">
                    <input
                      type="number"
                      min="0"
                      value={
                        budgetForm.amount
                      }
                      onChange={(e) =>
                        updateBudget(
                          "amount",
                          e.target.value
                        )
                      }
                      placeholder="Ej: 500000"
                      style={styles.input}
                    />
                  </Field>

                  <Field label="Estado">
                    <select
                      value={
                        budgetForm.status
                      }
                      onChange={(e) =>
                        updateBudget(
                          "status",
                          e.target.value
                        )
                      }
                      style={styles.input}
                    >
                      {BUDGET_STATUS.map(
                        (status) => (
                          <option
                            key={status}
                            value={status}
                          >
                            {status}
                          </option>
                        )
                      )}
                    </select>
                  </Field>

                  <Field label="Fecha">
                    <input
                      type="date"
                      value={
                        budgetForm.date
                      }
                      onChange={(e) =>
                        updateBudget(
                          "date",
                          e.target.value
                        )
                      }
                      style={styles.input}
                    />
                  </Field>

                  <Field label="Vencimiento">
                    <input
                      type="text"
                      readOnly
                      value={
                        budgetForm.date
                          ? formatDate(
                              addDays(
                                budgetForm.date,
                                15
                              )
                            )
                          : ""
                      }
                      style={{
                        ...styles.input,
                        background:
                          "#f6f0ea",
                      }}
                    />
                  </Field>

                  <Field label="Teléfono">
                    <input
                      type="text"
                      value={
                        budgetForm.phone
                      }
                      onChange={(e) =>
                        updateBudget(
                          "phone",
                          e.target.value
                        )
                      }
                      placeholder="Teléfono"
                      style={styles.input}
                    />
                  </Field>

                  <Field label="Email">
                    <input
                      type="email"
                      value={
                        budgetForm.email
                      }
                      onChange={(e) =>
                        updateBudget(
                          "email",
                          e.target.value
                        )
                      }
                      placeholder="email@cliente.com"
                      style={styles.input}
                    />
                  </Field>

                  <Field label="Dirección">
                    <input
                      type="text"
                      value={
                        budgetForm.address
                      }
                      onChange={(e) =>
                        updateBudget(
                          "address",
                          e.target.value
                        )
                      }
                      placeholder="Dirección"
                      style={styles.input}
                    />
                  </Field>

                  <Field label="CUIT">
                    <input
                      type="text"
                      value={
                        budgetForm.cuit
                      }
                      onChange={(e) =>
                        updateBudget(
                          "cuit",
                          e.target.value
                        )
                      }
                      placeholder="CUIT"
                      style={styles.input}
                    />
                  </Field>

                  <Field label="Condición fiscal">
                    <select
                      value={
                        budgetForm.fiscal
                      }
                      onChange={(e) =>
                        updateBudget(
                          "fiscal",
                          e.target.value
                        )
                      }
                      style={styles.input}
                    >
                      <option value="">
                        Seleccionar
                      </option>

                      <option>
                        Responsable Inscripto
                      </option>

                      <option>
                        Monotributo
                      </option>

                      <option>
                        Consumidor Final
                      </option>

                      <option>
                        Exento
                      </option>

                      <option>
                        No informado
                      </option>
                    </select>
                  </Field>

                  <Field label="Observaciones">
                    <textarea
                      value={
                        budgetForm.observations
                      }
                      onChange={(e) =>
                        updateBudget(
                          "observations",
                          e.target.value
                        )
                      }
                      placeholder="Condiciones, detalles, aclaraciones..."
                      style={
                        styles.textarea
                      }
                    />
                  </Field>

                </div>

                <div
                  style={styles.formButtons}
                >

                  <button
                    type="submit"
                    style={
                      styles.primaryButton
                    }
                  >
                    Guardar presupuesto
                  </button>

                  <button
                    type="button"
                    style={
                      styles.secondaryButton
                    }
                    onClick={() =>
                      setShowBudgetForm(
                        false
                      )
                    }
                  >
                    Cancelar
                  </button>

                </div>

              </form>
            )}

            {/* TABLA RESPONSIVA */}

            <div
              style={
                styles.tableWrapper
              }
            >

              <table
                style={styles.realTable}
              >

                <thead>
                  <tr>
                    <th>N.º</th>
                    <th>CLIENTE</th>
                    <th>RESPONSABLE</th>
                    <th>PLAN</th>
                    <th>IMPORTE</th>
                    <th>VENCIMIENTO</th>
                    <th>ESTADO</th>
                    <th>ACCIONES</th>
                  </tr>
                </thead>

                <tbody>

                  {budgets.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
                        style={
                          styles.emptyTable
                        }
                      >
                        <h2>
                          No hay presupuestos
                        </h2>

                        <p>
                          Creá tu primer
                          presupuesto.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    budgets.map(
                      (budget) => (
                        <tr
                          key={
                            budget.id
                          }
                        >

                          <td>
                            <strong>
                              {budget.number ||
                                "-"}
                            </strong>
                          </td>

                          <td>
                            <strong>
                              {
                                budget.client
                              }
                            </strong>
                          </td>

                          <td>
                            {
                              budget.responsible ||
                              "Daiana"
                            }
                          </td>

                          <td>
                            {budget.plan ||
                              "-"}
                          </td>

                          <td>
                            <strong>
                              {formatMoney(
                                budget.amount
                              )}
                            </strong>
                          </td>

                          <td>
                            {formatDate(
                              budget.expiration
                            )}
                          </td>

                          <td>

                            <select
                              value={
                                budget.status
                              }
                              onChange={(
                                e
                              ) =>
                                changeBudgetStatus(
                                  budget.id,
                                  e.target
                                    .value
                                )
                              }
                              style={{
                                ...styles.statusSelect,
                                ...(budget.status ===
                                "Aprobado"
                                  ? styles.approvedSelect
                                  : {}),
                              }}
                            >

                              {BUDGET_STATUS.map(
                                (
                                  status
                                ) => (
                                  <option
                                    key={
                                      status
                                    }
                                    value={
                                      status
                                    }
                                  >
                                    {status}
                                  </option>
                                )
                              )}

                            </select>

                          </td>

                          <td>

                            <div
                              style={
                                styles.actionButtons
                              }
                            >

                              <button
                                type="button"
                                style={
                                  styles.pdfButton
                                }
                                onClick={() =>
                                  generateBudgetPDF(
                                    budget
                                  )
                                }
                              >
                                PDF
                              </button>

                              <button
                                type="button"
                                style={
                                  styles.deleteSmallButton
                                }
                                onClick={() =>
                                  deleteBudget(
                                    budget.id
                                  )
                                }
                              >
                                Eliminar
                              </button>

                            </div>

                          </td>

                        </tr>
                      )
                    )
                  )}

                </tbody>

              </table>

            </div>

          </section>
        )}

        {/* =================================================
            PAGOS
            ================================================= */}

        {active === "Pagos" && (
          <section>

            <PageTitle
              title="Pagos / Facturación"
              subtitle="Los presupuestos aprobados pasan automáticamente a facturación."
            />

            <div
              style={styles.statsGrid}
            >

              <StatCard
                title="TOTAL REGISTRADO"
                value={formatMoney(
                  totalCollected
                )}
              />

              <StatCard
                title="REGISTROS"
                value={payments.length}
              />

              <StatCard
                title="PRESUPUESTOS APROBADOS"
                value={
                  budgets.filter(
                    (budget) =>
                      budget.status ===
                      "Aprobado"
                  ).length
                }
              />

            </div>

            <div
              style={
                styles.tableWrapper
              }
            >

              <table
                style={styles.realTable}
              >

                <thead>
                  <tr>
                    <th>CLIENTE</th>
                    <th>PLAN</th>
                    <th>RESPONSABLE</th>
                    <th>IMPORTE</th>
                    <th>ESTADO</th>
                    <th>FECHA</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>

                  {payments.length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        style={
                          styles.emptyTable
                        }
                      >
                        <h2>
                          No hay facturación
                        </h2>

                        <p>
                          Cuando apruebes un
                          presupuesto aparecerá
                          automáticamente acá.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    payments.map(
                      (payment) => (
                        <tr
                          key={
                            payment.id
                          }
                        >

                          <td>
                            <strong>
                              {
                                payment.client
                              }
                            </strong>
                          </td>

                          <td>
                            {payment.plan ||
                              "-"}
                          </td>

                          <td>
                            {
                              payment.responsible ||
                              "-"
                            }
                          </td>

                          <td>
                            <strong>
                              {formatMoney(
                                payment.amount
                              )}
                            </strong>
                          </td>

                          <td>
                            <span
                              style={
                                styles.paymentBadge
                              }
                            >
                              {
                                payment.status
                              }
                            </span>
                          </td>

                          <td>
                            {formatDate(
                              payment.date
                            )}
                          </td>

                          <td>
                            <button
                              type="button"
                              style={
                                styles.deleteSmallButton
                              }
                              onClick={() =>
                                deletePayment(
                                  payment.id
                                )
                              }
                            >
                              Eliminar
                            </button>
                          </td>

                        </tr>
                      )
                    )
                  )}

                </tbody>

              </table>

            </div>

          </section>
        )}

        {/* =================================================
            SUELDOS
            ================================================= */}

        {active === "Sueldos" && (
          <section>

            <PageTitle
              title="Sueldos y comisiones"
              subtitle="Las comisiones se calculan automáticamente según quién consiguió cada cliente."
            />

            <div
              style={
                styles.salaryNotice
              }
            >

              <strong>
                REGLA DE COMISIONES
              </strong>

              <p>
                Luis, Jesica, Sheila,
                Adriana y Otros cobran el
                <strong> 20%</strong> del
                plan mensual de los clientes
                que consiguieron.
              </p>

              <p>
                <strong>
                  Daiana Taqueño
                </strong>{" "}
                es la dueña y no cobra
                comisión.
              </p>

              <p>
                <strong>
                  Ayelen
                </strong>{" "}
                tampoco cobra comisión.
              </p>

            </div>

            <div
              style={
                styles.salaryGrid
              }
            >

              {salaryByPerson.map(
                (person) => (
                  <div
                    key={
                      person.person
                    }
                    style={
                      styles.salaryCard
                    }
                  >

                    <div
                      style={
                        styles.salaryAvatar
                      }
                    >
                      {person.person.charAt(
                        0
                      )}
                    </div>

                    <h3>
                      {person.person}
                    </h3>

                    <p>
                      Clientes conseguidos:
                      {" "}
                      <strong>
                        {person.clients}
                      </strong>
                    </p>

                    <p>
                      Facturación generada:
                      {" "}
                      <strong>
                        {formatMoney(
                          person.sales
                        )}
                      </strong>
                    </p>

                    <div
                      style={
                        styles.salaryTotal
                      }
                    >

                      <span>
                        Comisión
                      </span>

                      <strong>
                        {person.commission ===
                        0
                          ? "Sin comisión"
                          : formatMoney(
                              person.commission
                            )}
                      </strong>

                    </div>

                    <small>
                      Porcentaje:{" "}
                      {person.percentage}%
                    </small>

                  </div>
                )
              )}

            </div>

            <div
              style={
                styles.totalBox
              }
            >

              <span>
                TOTAL COMISIONES A PAGAR
              </span>

              <strong>
                {formatMoney(
                  totalCommissions
                )}
              </strong>

            </div>

          </section>
        )}

        {/* =================================================
            MÉTRICAS
            ================================================= */}

        {active === "Métricas" && (
          <section>

            <PageTitle
              title="Métricas"
              subtitle="Resumen general de Conecta Studio."
            />

            <div
              style={
                styles.statsGrid
              }
            >

              <StatCard
                title="CLIENTES"
                value={clients.length}
              />

              <StatCard
                title="ACTIVOS"
                value={
                  activeClients.length
                }
              />

              <StatCard
                title="FACTURACIÓN"
                value={formatMoney(
                  totalMonthly
                )}
              />

              <StatCard
                title="COMISIONES"
                value={formatMoney(
                  totalCommissions
                )}
              />

            </div>

            <div
              style={
                styles.welcomeCard
              }
            >

              <h2>
                Resumen del equipo
              </h2>

              {salaryByPerson.map(
                (person) => (
                  <div
                    key={
                      person.person
                    }
                    style={
                      styles.metricRow
                    }
                  >

                    <span>
                      {person.person}
                    </span>

                    <strong>
                      {person.clients}{" "}
                      clientes ·{" "}
                      {formatMoney(
                        person.sales
                      )}
                    </strong>

                  </div>
                )
              )}

            </div>

          </section>
        )}

        {/* =================================================
            TAREAS
            ================================================= */}

        {active === "Tareas" && (
          <section>

            <PageTitle
              title="Tareas"
              subtitle="Organizá las tareas pendientes de la agencia."
            />

            <form
              onSubmit={addTask}
              style={
                styles.taskForm
              }
            >

              <input
                type="text"
                value={taskText}
                onChange={(e) =>
                  setTaskText(
                    e.target.value
                  )
                }
                placeholder="Ej: Preparar contenido para Pinturería Roma"
                style={
                  styles.input
                }
              />

              <button
                type="submit"
                style={
                  styles.primaryButton
                }
              >
                + Agregar
              </button>

            </form>

            <div
              style={
                styles.taskList
              }
            >

              {tasks.length === 0 ? (
                <div
                  style={
                    styles.empty
                  }
                >
                  <h2>
                    No hay tareas
                  </h2>

                  <p>
                    Agregá una tarea para
                    comenzar.
                  </p>
                </div>
              ) : (
                tasks.map((task) => {
                  const currentStatus =
                    task.status ||
                    (task.completed
                      ? "Realizada"
                      : "Pendiente");

                  return (
                    <div
                      key={task.id}
                      style={{
                        ...styles.taskItem,
                        ...(currentStatus === "Realizada"
                          ? styles.taskCompleted
                          : {}),
                      }}
                    >
                      <span style={styles.taskText}>
                        {task.text}
                      </span>

                      <select
                        value={currentStatus}
                        onChange={(e) =>
                          changeTaskStatus(
                            task.id,
                            e.target.value
                          )
                        }
                        style={styles.taskStatusSelect}
                      >
                        {TASK_STATUS.map((status) => (
                          <option
                            key={status}
                            value={status}
                          >
                            {status}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          deleteTask(task.id)
                        }
                        style={
                          styles.deleteButton
                        }
                      >
                        🗑
                      </button>
                    </div>
                  );
                })
              )}

            </div>

          </section>
        )}

      </main>

    </div>
  );
}

/* =========================================================
   COMPONENTES
   ========================================================= */

function PageTitle({
  title,
  subtitle,
  action,
}) {
  return (
    <div
      style={
        styles.pageHeader
      }
    >

      <div>
        <h1
          style={
            styles.pageHeaderH1
          }
        >
          {title}
        </h1>

        <p
          style={
            styles.pageHeaderP
          }
        >
          {subtitle}
        </p>
      </div>

      {action && (
        <div>
          {action}
        </div>
      )}

    </div>
  );
}

function StatCard({
  title,
  value,
}) {
  return (
    <div
      style={
        styles.statCard
      }
    >

      <span
        style={
          styles.statCardSpan
        }
      >
        {title}
      </span>

      <strong
        style={
          styles.statCardStrong
        }
      >
        {value}
      </strong>

    </div>
  );
}

function Field({
  label,
  children,
}) {
  return (
    <label
      style={
        styles.field
      }
    >

      <span>
        {label}
      </span>

      {children}

    </label>
  );
}

/* =========================================================
   ESTILOS
   ========================================================= */

const styles = {

  app: {
    minHeight: "100vh",
    display: "flex",
    background: "#faf8f5",
    color: "#241b16",
    fontFamily:
      "Inter, Arial, Helvetica, sans-serif",
    boxSizing: "border-box",
  },

  sidebar: {
    width: "260px",
    minWidth: "260px",
    minHeight: "100vh",
    background: "#ffffff",
    borderRight:
      "1px solid #e5ddd4",
    padding: "28px 18px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    position: "sticky",
    top: 0,
  },

  logoContainer: {
    minHeight: "125px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    width: "190px",
    maxWidth: "100%",
    maxHeight: "115px",
    objectFit: "contain",
  },

  logoFallback: {
    textAlign: "center",
  },

  logoText: {
    fontSize: "28px",
    letterSpacing: "5px",
    fontWeight: 700,
    color: "#17110e",
  },

  logoSub: {
    fontSize: "9px",
    letterSpacing: "4px",
    color: "#b1844e",
    marginTop: "8px",
  },

  separator: {
    height: "1px",
    background: "#e7ddd4",
    margin:
      "18px 0 30px",
  },

  menuTitle: {
    fontSize: "12px",
    letterSpacing: "3px",
    color: "#a87948",
    fontWeight: 700,
    textAlign: "center",
    marginBottom: "15px",
  },

  navButton: {
    width: "100%",
    border: "none",
    background:
      "transparent",
    color: "#33251d",
    padding:
      "14px 15px",
    marginBottom: "5px",
    borderRadius: "12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "13px",
    fontSize: "16px",
    fontWeight: 600,
    textAlign: "left",
  },

  navButtonActive: {
    background: "#f0e6dc",
    color: "#9a693a",
  },

  navIcon: {
    width: "22px",
    textAlign: "center",
    color: "#a87948",
  },

  sidebarBottom: {
    marginTop: "auto",
    borderTop:
      "1px solid #e7ddd4",
    paddingTop: "20px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  userCircle: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    background: "#b1844e",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },

  main: {
    flex: 1,
    minWidth: 0,
    width: "calc(100% - 260px)",
    padding:
      "42px 55px 70px",
    boxSizing: "border-box",
    maxWidth: "1500px",
    margin: "0 auto",
    overflowX: "hidden",
  },

  topBrand: {
    textAlign: "center",
    color: "#b1844e",
    letterSpacing: "4px",
    fontSize: "13px",
    fontWeight: 800,
    marginBottom: "12px",
  },

  pageHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: "20px",
    marginBottom: "35px",
    width: "100%",
  },

  pageHeaderH1: {
    margin: 0,
    fontSize: "48px",
    lineHeight: 1.1,
    color: "#241b16",
    fontWeight: 800,
  },

  pageHeaderP: {
    marginTop: "8px",
    marginBottom: 0,
    color: "#806f63",
    fontSize: "16px",
  },

  primaryButton: {
    border: "none",
    borderRadius: "10px",
    padding:
      "13px 20px",
    background: "#ad7b45",
    color: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: "14px",
    whiteSpace: "nowrap",
  },

  secondaryButton: {
    border:
      "1px solid #cdb9a7",
    borderRadius: "10px",
    padding:
      "13px 20px",
    background: "#ffffff",
    color: "#5e493a",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "14px",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
    marginBottom: "28px",
  },

  statCard: {
    background: "#ffffff",
    border:
      "1px solid #e5d9ce",
    borderRadius: "18px",
    padding: "27px",
    textAlign: "center",
    boxShadow:
      "0 8px 25px rgba(91,64,42,0.05)",
  },

  statCardSpan: {
    color: "#947f70",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "1px",
  },

  statCardStrong: {
    display: "block",
    fontSize: "32px",
    marginTop: "10px",
    color: "#241b16",
  },

  welcomeCard: {
    background: "#ffffff",
    border:
      "1px solid #e5d9ce",
    borderRadius: "20px",
    padding: "45px",
    textAlign: "center",
    boxShadow:
      "0 8px 25px rgba(91,64,42,0.04)",
  },

  formCard: {
    background: "#ffffff",
    border:
      "1px solid #e2d5c9",
    borderRadius: "20px",
    padding: "35px",
    marginBottom: "30px",
    boxShadow:
      "0 10px 30px rgba(91,64,42,0.06)",
    width: "100%",
    boxSizing: "border-box",
  },

  formDescription: {
    color: "#806f63",
    marginBottom: 0,
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "20px",
    marginTop: "25px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    color: "#49382d",
    fontWeight: 700,
    fontSize: "14px",
    minWidth: 0,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding:
      "14px 15px",
    borderRadius: "10px",
    border:
      "1px solid #d8cabe",
    background: "#ffffff",
    color: "#241b16",
    fontSize: "15px",
    outline: "none",
    fontFamily:
      "Inter, Arial, sans-serif",
  },

  textarea: {
    width: "100%",
    minHeight: "110px",
    boxSizing: "border-box",
    padding:
      "14px 15px",
    borderRadius: "10px",
    border:
      "1px solid #d8cabe",
    background: "#ffffff",
    color: "#241b16",
    fontSize: "15px",
    outline: "none",
    resize: "vertical",
    fontFamily:
      "Inter, Arial, sans-serif",
  },

  formButtons: {
    display: "flex",
    gap: "12px",
    marginTop: "25px",
  },

  clientList: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    width: "100%",
  },

  clientCard: {
    background: "#ffffff",
    border:
      "1px solid #e2d5c9",
    borderRadius: "18px",
    padding:
      "22px 25px",
    display: "grid",
    gridTemplateColumns:
      "minmax(220px, 2fr) minmax(100px,1fr) minmax(100px,1fr) auto minmax(100px,1fr) auto",
    gap: "20px",
    alignItems: "center",
    boxShadow:
      "0 7px 20px rgba(91,64,42,0.04)",
    minWidth: 0,
  },

  labelSmall: {
    display: "block",
    fontSize: "10px",
    letterSpacing: "2px",
    color: "#a38c7b",
    marginBottom: "6px",
  },

  status: {
    display: "inline-block",
    padding:
      "8px 13px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 800,
  },

  statusActive: {
    background: "#e8f1e8",
    color: "#4e7754",
  },

  statusInactive: {
    background: "#eee9e5",
    color: "#806f63",
  },

  deleteButton: {
    border:
      "1px solid #dfcfc2",
    background: "#ffffff",
    borderRadius: "8px",
    padding:
      "8px 10px",
    cursor: "pointer",
  },

  empty: {
    textAlign: "center",
    padding:
      "70px 20px",
    color: "#8c7b6f",
  },

  /* =====================================================
     TABLA CORREGIDA
     ===================================================== */

  tableWrapper: {
    width: "100%",
    maxWidth: "100%",
    overflowX: "auto",
    overflowY: "hidden",
    background: "#ffffff",
    border:
      "1px solid #e2d5c9",
    borderRadius: "18px",
    marginTop: "25px",
    boxSizing: "border-box",
  },

  realTable: {
    width: "100%",
    minWidth: "1050px",
    borderCollapse: "collapse",
    background: "#ffffff",
  },

  emptyTable: {
    textAlign: "center",
    padding: "70px 20px",
    color: "#8c7b6f",
  },

  statusSelect: {
    padding:
      "9px 12px",
    borderRadius: "10px",
    border:
      "1px solid #d8cabe",
    background: "#ffffff",
    color: "#594538",
    fontWeight: 700,
    cursor: "pointer",
  },

  approvedSelect: {
    background: "#e8f1e8",
    color: "#4e7754",
    border:
      "1px solid #bdd2bd",
  },

  actionButtons: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  pdfButton: {
    border: "none",
    borderRadius: "8px",
    padding:
      "9px 14px",
    background: "#ad7b45",
    color: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
  },

  deleteSmallButton: {
    border:
      "1px solid #d9c8ba",
    borderRadius: "8px",
    padding:
      "8px 12px",
    background: "#ffffff",
    color: "#795d49",
    fontWeight: 700,
    cursor: "pointer",
  },

  salaryNotice: {
    background: "#f5eee8",
    border:
      "1px solid #e2d5c9",
    borderRadius: "16px",
    padding: "22px",
    marginBottom: "25px",
    color: "#594538",
  },

  salaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "18px",
  },

  salaryCard: {
    background: "#ffffff",
    border:
      "1px solid #e2d5c9",
    borderRadius: "18px",
    padding: "25px",
  },

  salaryAvatar: {
    width: "45px",
    height: "45px",
    borderRadius: "50%",
    background: "#b1844e",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },

  salaryTotal: {
    marginTop: "20px",
    paddingTop: "18px",
    borderTop:
      "1px solid #eadfd7",
    display: "flex",
    justifyContent:
      "space-between",
    color: "#8b6544",
  },

  totalBox: {
    marginTop: "25px",
    padding: "25px",
    borderRadius: "16px",
    background: "#241b16",
    color: "#ffffff",
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    fontWeight: 800,
  },

  paymentBadge: {
    display: "inline-block",
    padding:
      "7px 12px",
    borderRadius: "20px",
    background: "#f5eee8",
    color: "#8b6544",
    fontSize: "12px",
    fontWeight: 800,
  },

  metricRow: {
    display: "flex",
    justifyContent:
      "space-between",
    padding:
      "17px 0",
    borderBottom:
      "1px solid #eadfd7",
    gap: "20px",
  },

  taskForm: {
    display: "flex",
    gap: "12px",
    marginBottom: "25px",
  },

  taskList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  taskItem: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "18px",
    background: "#ffffff",
    border:
      "1px solid #e2d5c9",
    borderRadius: "12px",
  },

  taskText: {
    flex: 1,
    minWidth: 0,
    fontSize: "15px",
    color: "#33251d",
  },

  taskStatusSelect: {
    minWidth: "155px",
    padding: "10px 12px",
    border: "1px solid #d9c8b8",
    borderRadius: "9px",
    background: "#ffffff",
    color: "#33251d",
    fontSize: "14px",
    cursor: "pointer",
    outline: "none",
  },

  taskCompleted: {
    opacity: 0.55,
    textDecoration:
      "line-through",
  },

  checkButton: {
    border: "none",
    background:
      "transparent",
    fontSize: "22px",
    color: "#a87948",
    cursor: "pointer",
  },
  loginPage: { minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "30px", fontFamily: "Inter, Arial, sans-serif" },
  loginCard: { width: "100%", maxWidth: "430px", background: "#fff", border: "1px solid #eadfd5", borderRadius: "22px", padding: "36px", boxShadow: "0 18px 55px rgba(92,66,45,.10)" },
  loginLogo: { textAlign: "center", marginBottom: "18px" },
  loginLogoImage: { maxWidth: "220px", maxHeight: "90px", objectFit: "contain" },
  loginEyebrow: { textAlign: "center", color: "#80634a", fontSize: "10px", letterSpacing: "2px", fontWeight: "700", marginBottom: "8px" },
  loginTitle: { textAlign: "center", color: "#241b14", margin: "0 0 8px", fontSize: "28px" },
  loginSubtitle: { textAlign: "center", color: "#806f63", margin: "0 0 25px" },
  loginError: { background: "#fff0ed", color: "#9a3d2f", border: "1px solid #f0c9c0", borderRadius: "10px", padding: "10px 12px", fontSize: "13px", marginTop: "10px" },
  loginHint: { marginTop: "22px", paddingTop: "18px", borderTop: "1px solid #eee3d8", color: "#806f63", fontSize: "12px", lineHeight: 1.8 },
  logoutButton: { marginLeft: "auto", border: "1px solid #d8c4ae", background: "#fff", color: "#80634a", borderRadius: "8px", padding: "7px 10px", cursor: "pointer", fontSize: "11px" },
  topUserBadge: { marginLeft: "auto", background: "#f4ede5", color: "#80634a", borderRadius: "20px", padding: "7px 12px", fontSize: "11px", fontWeight: "700" },
};

/* =========================================================
   ESTILOS RESPONSIVOS
   ========================================================= */

if (
  typeof document !== "undefined"
) {
  const styleId =
    "conecta-responsive-styles";

  if (
    !document.getElementById(
      styleId
    )
  ) {
    const style =
      document.createElement(
        "style"
      );

    style.id = styleId;

    style.innerHTML = `
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      html,
      body,
      #root {
        margin: 0;
        min-height: 100%;
        width: 100%;
      }

      body {
        overflow-x: hidden;
      }

      button,
      input,
      select,
      textarea {
        font-family: Inter, Arial, Helvetica, sans-serif;
      }

      input:focus,
      select:focus,
      textarea:focus {
        border-color: #b1844e !important;
        box-shadow: 0 0 0 3px rgba(177,132,78,0.12);
      }

      table th {
        text-align: left;
        background: #f5eee8;
        color: #85694f;
        padding: 16px 14px;
        font-size: 11px;
        letter-spacing: 1.5px;
        font-weight: 800;
        white-space: nowrap;
        border-bottom: 1px solid #e8ddd4;
      }

      table td {
        padding: 18px 14px;
        border-bottom: 1px solid #eee5de;
        font-size: 13px;
        vertical-align: middle;
      }

      table tr:last-child td {
        border-bottom: none;
      }

      .conecta-mobile-toggle,
      .conecta-mobile-overlay {
        display: none;
      }

      @media (max-width: 900px) {
        .conecta-main {
          width: 100% !important;
          max-width: 100% !important;
        }
      }

      @media (max-width: 700px) {
        .conecta-app {
          display: block !important;
          width: 100% !important;
          min-width: 0 !important;
          overflow-x: hidden !important;
        }

        .conecta-mobile-toggle {
          display: flex;
          position: fixed;
          top: 14px;
          left: 14px;
          width: 44px;
          height: 44px;
          align-items: center;
          justify-content: center;
          z-index: 1002;
          border: 1px solid #e2d5c9;
          border-radius: 12px;
          background: #ffffff;
          color: #6c4d31;
          font-size: 22px;
          font-weight: 800;
          box-shadow: 0 8px 22px rgba(91,64,42,.12);
          cursor: pointer;
        }

        .conecta-mobile-overlay {
          display: block;
          position: fixed;
          inset: 0;
          z-index: 1000;
          border: 0;
          padding: 0;
          background: rgba(36,27,22,.28);
          cursor: pointer;
        }

        .conecta-sidebar {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: min(82vw, 320px) !important;
          min-width: 0 !important;
          height: 100dvh !important;
          min-height: 100dvh !important;
          z-index: 1001 !important;
          overflow-y: auto !important;
          transform: translateX(-105%) !important;
          transition: transform .22s ease !important;
          box-shadow: 12px 0 35px rgba(36,27,22,.15) !important;
        }

        .conecta-sidebar.mobile-open {
          transform: translateX(0) !important;
        }

        .conecta-main {
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          margin: 0 !important;
          padding: 74px 16px 40px !important;
          overflow-x: hidden !important;
        }

        .conecta-top-brand {
          padding-left: 50px !important;
          padding-right: 8px !important;
          text-align: center !important;
          font-size: 10px !important;
          letter-spacing: 2px !important;
          line-height: 1.5 !important;
          margin-bottom: 20px !important;
        }

        .conecta-top-brand > span {
          display: block !important;
          max-width: 100% !important;
        }

        .conecta-top-brand > span:last-child {
          margin: 8px auto 0 !important;
          width: fit-content !important;
          max-width: 100% !important;
          white-space: normal !important;
        }

        .conecta-main section {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
        }

        .conecta-main h1 {
          font-size: 34px !important;
          line-height: 1.08 !important;
          overflow-wrap: anywhere !important;
        }

        .conecta-main h2 {
          font-size: 23px !important;
          line-height: 1.15 !important;
          overflow-wrap: anywhere !important;
        }

        .conecta-main p {
          overflow-wrap: anywhere !important;
        }

        .conecta-main [style*="grid-template-columns"] {
          grid-template-columns: 1fr !important;
        }

        .conecta-main [style*="display: flex"] {
          max-width: 100% !important;
        }

        .conecta-main button {
          max-width: 100% !important;
        }

        .conecta-main input,
        .conecta-main select,
        .conecta-main textarea {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          font-size: 16px !important;
        }

        .conecta-main [style*="overflow-x: auto"] {
          width: 100% !important;
          max-width: 100% !important;
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch !important;
        }

        .conecta-main table {
          min-width: 900px !important;
        }

        .conecta-main [style*="grid-column"] {
          grid-column: 1 / -1 !important;
        }

        .conecta-main [style*="display: flex"] > button {
          flex: 1 1 auto !important;
        }
      }

      @media (max-width: 420px) {
        .conecta-main {
          padding-left: 12px !important;
          padding-right: 12px !important;
        }

        .conecta-mobile-toggle {
          top: 12px;
          left: 12px;
          width: 42px;
          height: 42px;
        }

        .conecta-main h1 {
          font-size: 30px !important;
        }

        .conecta-top-brand {
          padding-left: 48px !important;
          font-size: 9px !important;
        }
      }

      @media print {
        .conecta-mobile-toggle,
        .conecta-mobile-overlay {
          display: none !important;
        }

        body {
          background: white !important;
        }
      }
    `;

    document.head.appendChild(
      style
    );
  }
}
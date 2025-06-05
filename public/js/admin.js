// public/js/admin.js

// 0) Toggle para mostrar/ocultar el formulario de agregar auto
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggleFormBtn');
  const formContainer = document.getElementById('formAutoContainer');

  toggleBtn.addEventListener('click', () => {
    if (formContainer.style.display === 'none' || !formContainer.style.display) {
      formContainer.style.display = 'block';
      toggleBtn.textContent = 'Ocultar formulario';
    } else {
      formContainer.style.display = 'none';
      toggleBtn.textContent = 'Agregar Auto Nuevo';
    }
  });

  // Una vez cargado el DOM, inicializamos carga de autos y de citas
  cargarAutosAdmin();
  cargarCitasAdmin();
});

// 1) Función para obtener la lista de autos y pintarlos en #autosAdmin
async function cargarAutosAdmin() {
  try {
    const res = await fetch('/api/autos');
    if (!res.ok) throw new Error(`Error al obtener autos: ${res.status}`);
    const autos = await res.json();

    const contenedor = document.getElementById('autosAdmin');
    contenedor.innerHTML = ''; // Limpiamos antes de volver a dibujar

    autos.forEach(auto => {
      // Creamos la tarjeta del auto
      const div = document.createElement('div');
      div.className = 'auto-card';
      div.innerHTML = `
        <img src="${auto.imagenPath}" alt="${auto.marca} ${auto.modelo}" />
        <h3>${auto.marca} ${auto.modelo}</h3>
        <p>Precio: $${auto.precio.toFixed(2)}</p>
        <p>${auto.disponible ? '✅ Disponible' : '❌ Vendido'}</p>
        ${
          auto.disponible 
            ? `<button onclick="venderAuto(${auto.id})" class="btn btn-vender">Marcar como vendido</button>`
            : ''
        }
        <button onclick="eliminarAuto(${auto.id})" class="btn btn-eliminar">Eliminar</button>
      `;
      contenedor.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    alert('No se pudieron cargar los autos.');
  }
}

// 2) Escucha el formulario de agregar auto (#formAuto) y lo envía a /autos/nuevo
document.getElementById('formAuto').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);

  try {
    const res = await fetch('/autos/nuevo', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      throw new Error(`Error al agregar auto: ${res.status}`);
    }
    alert('Auto agregado correctamente.');
    document.getElementById('toggleFormBtn').click();
    cargarAutosAdmin();
  } catch (err) {
    console.error(err);
    alert('Error al agregar el auto.');
  }
});

// 3) Función para marcar un auto como vendido
async function venderAuto(autoId) {
  if (!confirm('¿Seguro que deseas marcar este auto como vendido?')) return;
  try {
    const res = await fetch(`/api/autos/${autoId}/vender`, {
      method: 'PUT'
    });
    if (!res.ok) throw new Error(`Error al marcar vendido: ${res.status}`);
    alert('Auto marcado como vendido.');
    cargarAutosAdmin();
    // También recargamos las citas, porque algunas pudieron cambiar de estado
    cargarCitasAdmin();
  } catch (err) {
    console.error(err);
    alert('Error al marcar como vendido.');
  }
}

// 4) Función para eliminar un auto
async function eliminarAuto(autoId) {
  if (!confirm('¿Seguro que deseas eliminar este auto de la base de datos?')) return;
  try {
    const res = await fetch(`/autos/${autoId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`Error al eliminar: ${res.status}`);
    alert('Auto eliminado correctamente.');
    cargarAutosAdmin();
    cargarCitasAdmin();
  } catch (err) {
    console.error(err);
    alert('Error al eliminar el auto.');
  }
}

// 5) Función para cargar las citas desde citas.json y mostrarlas
async function cargarCitasAdmin() {
  try {
    const res = await fetch('/api/citas-json');
    if (!res.ok) throw new Error(`Error al leer citas.json: ${res.status}`);
    const citas = await res.json();

    const contenedor = document.getElementById('citasContainer');
    contenedor.innerHTML = ''; // Limpiamos antes de dibujar

    if (citas.length === 0) {
      contenedor.innerHTML = '<p style="color:white;">No hay citas registradas.</p>';
      return;
    }

    // Creamos un <table> para listar las citas
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.innerHTML = `
      <thead>
        <tr style="background-color: rgba(255,215,0,0.2);">
          <th style="padding:0.75rem; border:1px solid #ffd700; color:#ffd700;">ID Cita</th>
          <th style="padding:0.75rem; border:1px solid #ffd700; color:#ffd700;">Cliente</th>
          <th style="padding:0.75rem; border:1px solid #ffd700; color:#ffd700;">Correo</th>
          <th style="padding:0.75rem; border:1px solid #ffd700; color:#ffd700;">Auto</th>
          <th style="padding:0.75rem; border:1px solid #ffd700; color:#ffd700;">Precio Auto</th>
          <th style="padding:0.75rem; border:1px solid #ffd700; color:#ffd700;">Fecha Cita</th>
          <th style="padding:0.75rem; border:1px solid #ffd700; color:#ffd700;">Comentario</th>
          <th style="padding:0.75rem; border:1px solid #ffd700; color:#ffd700;">Estado</th>
          <th style="padding:0.75rem; border:1px solid #ffd700; color:#ffd700;">Creada</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    citas.forEach(cita => {
      const tr = document.createElement('tr');
      tr.style.backgroundColor = 'rgba(255,255,255,0.05)';
      tr.innerHTML = `
        <td style="padding:0.5rem; border:1px solid #444; color:white;">${cita.citaId}</td>
        <td style="padding:0.5rem; border:1px solid #444; color:white;">${cita.nombreUsuario}</td>
        <td style="padding:0.5rem; border:1px solid #444; color:white;">${cita.correoUsuario}</td>
        <td style="padding:0.5rem; border:1px solid #444; color:white;">${cita.descripcionAuto}</td>
        <td style="padding:0.5rem; border:1px solid #444; color:white;">$${cita.precioAuto.toFixed(2)}</td>
        <td style="padding:0.5rem; border:1px solid #444; color:white;">${new Date(cita.fecha).toLocaleDateString()}</td>
        <td style="padding:0.5rem; border:1px solid #444; color:white;">${cita.comentario || '-'}</td>
        <td style="padding:0.5rem; border:1px solid #444; color:white;">${cita.estado}</td>
        <td style="padding:0.5rem; border:1px solid #444; color:white;">${new Date(cita.fechaCreacion).toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });

    contenedor.appendChild(table);
  } catch (err) {
    console.error(err);
    const contenedor = document.getElementById('citasContainer');
    contenedor.innerHTML = '<p style="color:red;">No se pudieron cargar las citas.</p>';
  }
}

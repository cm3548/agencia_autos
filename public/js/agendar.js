// public/js/agendar.js

// 1) Referencias al DOM
const contenedorAuto = document.getElementById('autoSeleccionado');
const selectAuto      = document.getElementById('autoSelect');
const formCita        = document.getElementById('formCita');

// 2) Función para cargar todos los autos disponibles en el <select>
async function cargarAutosEnSelect() {
  try {
    const res = await fetch('/api/autos');
    if (!res.ok) throw new Error(`Error al obtener autos: ${res.status}`);
    const autos = await res.json();

    // Limpiar el <select> y agregar la opción por defecto
    selectAuto.innerHTML = '';
    const optDefault = document.createElement('option');
    optDefault.value = '';
    optDefault.textContent = '-- Selecciona un auto --';
    selectAuto.appendChild(optDefault);

    autos.forEach(auto => {
      // Solo autos que estén DISPONIBLES
      if (auto.disponible) {
        const opt = document.createElement('option');
        opt.value = auto.id;
        opt.textContent = `${auto.marca} ${auto.modelo} - $${auto.precio.toFixed(2)}`;
        selectAuto.appendChild(opt);
      }
    });

    if (autos.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No hay autos disponibles';
      selectAuto.appendChild(opt);
      formCita.querySelector('button[type="submit"]').disabled = true;
    }
  } catch (err) {
    console.error(err);
    // Mostrar mensaje de error y ocultar el form
    contenedorAuto.innerHTML = '<p class="texto-error">No se pudieron cargar los autos.</p>';
    formCita.style.display = 'none';
  }
}

// 3) Al cargar la página, ejecutamos cargarAutosEnSelect()
document.addEventListener('DOMContentLoaded', () => {
  cargarAutosEnSelect();
});

// 4) Envío del formulario de cita
formCita.addEventListener('submit', async (e) => {
  e.preventDefault();

  const autoId = selectAuto.value;
  const fecha  = document.getElementById('fecha').value;
  const comentario = document.getElementById('comentario').value;

  if (!autoId) {
    alert('Debes seleccionar un auto.');
    return;
  }

  const data = {
    autoId,
    fecha,
    comentario
  };

  try {
    const res = await fetch('/agendar-cita', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();
    if (res.ok) {
      alert('Cita solicitada con éxito.');
      window.location.href = '/';
    } else {
      alert(result.message || 'Error al agendar la cita.');
    }
  } catch (err) {
    console.error(err);
    alert('Error de red al intentar agendar. Intenta de nuevo.');
  }
});

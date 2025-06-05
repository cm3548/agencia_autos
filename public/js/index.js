document.addEventListener('DOMContentLoaded', cargarAutos);

async function cargarAutos() {
  try {
    const res = await fetch('/api/autos');
    if (!res.ok) {
      throw new Error(`Error al obtener autos: ${res.status}`);
    }
    const autos = await res.json();

    const contenedor = document.getElementById('autos-container');
    contenedor.innerHTML = '';

    autos.forEach(auto => {
      // Solo mostramos autos disponibles
      if (!auto.disponible) return;

      const tarjeta = document.createElement('div');
      tarjeta.className = 'auto-card';
      tarjeta.innerHTML = `
        <img src="${auto.imagenPath}" alt="${auto.marca} ${auto.modelo}" />
        <h3>${auto.marca} ${auto.modelo}</h3>
        <p>Precio: $${auto.precio.toFixed(2)}</p>
        <!-- Aquí está la clave: agregamos el autoId en la URL -->
        <a href="/agendar?autoId=${auto.id}" class="btn btn-agendar">
          Agendar cita
        </a>
      `;
      contenedor.appendChild(tarjeta);
    });

    if (contenedor.children.length === 0) {
      contenedor.innerHTML = '<p class="texto-vacio">No hay autos disponibles en este momento.</p>';
    }
  } catch (err) {
    console.error(err);
    const contenedor = document.getElementById('autos-container');
    contenedor.innerHTML = '<p class="texto-error">No se pudieron cargar los autos.</p>';
  }
}

// public/js/login.js
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  // 1) Recoge los datos del formulario
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());

  try {
    // 2) Envía la petición AJAX a /api/auth/login
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    // 3) Si la respuesta es 200 OK, redirige según rol
    if (res.ok) {
      // El backend envía { rol: 'admin' } o { rol: 'cliente' }
      if (result.rol === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/agendar';
      }
    } else {
      // 4) Si no es 200, muestra el mensaje de error
      alert(result.error || 'Credenciales incorrectas');
    }

  } catch (err) {
    console.error(err);
    alert('Error de conexión con el servidor');
  }
});

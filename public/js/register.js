document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (res.ok) {
      alert('Usuario registrado correctamente. Inicia sesión.');
      window.location.href = 'login';
    } else {
      alert(result.error || 'Error al registrarse');
    }

  } catch (err) {
    console.error(err);
    alert('Error de conexión');
  }
});

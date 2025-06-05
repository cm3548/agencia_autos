// server.js
require('dotenv').config();
const express    = require('express');
const path       = require('path');
const fs         = require('fs').promises;
const session    = require('express-session');
const flash      = require('connect-flash');
const bcrypt     = require('bcrypt');
const multer     = require('multer');
const sqlite3    = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// ───────────────────────────────────────────────────────────
// 1. Configuración de SQLite
// ───────────────────────────────────────────────────────────
const dataDir = path.join(__dirname, 'data');
if (!require('fs').existsSync(dataDir)) {
  require('fs').mkdirSync(dataDir);
}

const dbPath = path.join(dataDir, 'database.sqlite');
const db = new sqlite3.Database(
  dbPath,
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) {
      console.error('Error al abrir SQLite:', err.message);
      process.exit(1);
    }
    console.log('Conectado a database.sqlite.');
  }
);

db.serialize(() => {
  db.run(`PRAGMA foreign_keys = ON;`);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      correo TEXT NOT NULL UNIQUE,
      contrasenaHash TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'cliente'
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS autos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      marca TEXT NOT NULL,
      modelo TEXT NOT NULL,
      precio REAL NOT NULL,
      descripcion TEXT,
      imagenPath TEXT NOT NULL,
      disponible INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS citas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      autoId INTEGER NOT NULL,
      fecha TEXT NOT NULL,
      comentario TEXT,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(autoId) REFERENCES autos(id) ON DELETE CASCADE
    );
  `);
});

// ───────────────────────────────────────────────────────────
// 2.b) Función para generar reporte de citas y guardarlo en citas.json
// ───────────────────────────────────────────────────────────
function generarReporteCitas() {
  const query = `
    SELECT
      c.id AS citaId,
      c.fecha,
      c.comentario,
      c.estado,
      c.createdAt AS fechaCreacion,
      u.id AS userId,
      u.nombre AS nombreUsuario,
      u.correo AS correoUsuario,
      a.id AS autoId,
      a.marca || ' ' || a.modelo AS descripcionAuto,
      a.precio AS precioAuto
    FROM citas c
    INNER JOIN users u ON c.userId = u.id
    INNER JOIN autos  a ON c.autoId = a.id
    ORDER BY datetime(c.createdAt) DESC
  `;
  db.all(query, [], async (err, rows) => {
    if (err) {
      console.error('Error al generar reporte de citas:', err.message);
      return;
    }
    try {
      const jsonContent = JSON.stringify(rows, null, 2);
      await fs.writeFile(path.join(__dirname, 'citas.json'), jsonContent, 'utf8');
      console.log('✔ citas.json generado con éxito.');
    } catch (fsErr) {
      console.error('Error al escribir citas.json:', fsErr);
    }
  });
}

// ───────────────────────────────────────────────────────────
// 2. Configuración de Multer (para subir imágenes de autos)
// ───────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public', 'images'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `auto-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// ───────────────────────────────────────────────────────────
// 3. Middlewares generales
// ───────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'cambiame_a_un_valor_seguro',
    resave: false,
    saveUninitialized: false
  })
);

app.use(flash());

app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg   = req.flash('error_msg');
  res.locals.user        = req.session.user || null;
  next();
});

app.use('/public', express.static(path.join(__dirname, 'public')));

// ───────────────────────────────────────────────────────────
// 4. Middlewares de autenticación
// ───────────────────────────────────────────────────────────
function checkAuth(req, res, next) {
  if (!req.session.user) {
    req.flash('error_msg', 'Debes iniciar sesión primero.');
    return res.redirect('/login');
  }
  next();
}

function checkAdmin(req, res, next) {
  if (!req.session.user || req.session.user.rol !== 'admin') {
    req.flash('error_msg', 'Acceso denegado.');
    return res.redirect('/login');
  }
  next();
}

// ───────────────────────────────────────────────────────────
// 4.b) Middleware que sólo permite “clientes” (rol = 'cliente')
// ───────────────────────────────────────────────────────────
function checkCliente(req, res, next) {
  if (!req.session.user) {
    req.flash('error_msg', 'Debes iniciar sesión primero.');
    return res.redirect('/login');
  }
  if (req.session.user.rol !== 'cliente') {
    req.flash('error_msg', 'Acceso denegado. Sólo clientes pueden agendar citas.');
    return res.redirect('/');
  }
  next();
}

// ───────────────────────────────────────────────────────────
// 5. Rutas para servir vistas HTML (en /views)
// ───────────────────────────────────────────────────────────

// 5.1. Ruta raíz: muestra la landing page (landing.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'landing.html'));
});

// 5.2. Ruta “/inicio”: muestra tu index original
app.get('/inicio', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// 5.3. Resto de rutas sin cambios
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

// “Agendar cita” queda protegido: sólo clientes (rol = 'cliente')
app.get('/agendar', checkCliente, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'agendar.html'));
});

// Panel de administración
app.get('/admin', checkAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// ───────────────────────────────────────────────────────────
// 6. Lógica de autenticación “clásica” (formulario HTML)
// ───────────────────────────────────────────────────────────

// 6.1. POST /register (form-url-encoded)
app.post('/register', (req, res) => {
  console.log('→ POST /register → req.body =', req.body);
  const { nombre, correo, contraseña } = req.body;

  if (!nombre || !correo || !contraseña) {
    req.flash('error_msg', 'Por favor completa todos los campos.');
    return res.redirect('/register');
  }

  db.get(`SELECT id FROM users WHERE correo = ?`, [correo], (err, row) => {
    if (err) {
      console.error('Error en SELECT /register:', err.message);
      console.error(err.stack);
      req.flash('error_msg', 'Error interno al verificar usuario.');
      return res.redirect('/register');
    }
    if (row) {
      req.flash('error_msg', 'Ese correo ya está registrado.');
      return res.redirect('/register');
    }

    bcrypt
      .hash(contraseña, 10)
      .then((hash) => {
        const stmt = db.prepare(
          `INSERT INTO users (nombre, correo, contrasenaHash, rol)
           VALUES (?, ?, ?, 'cliente')`
        );
        stmt.run([nombre, correo, hash], function (err2) {
          if (err2) {
            console.error('Error en INSERT /register:', err2.message);
            console.error(err2.stack);
            req.flash('error_msg', 'Error al registrar usuario.');
            return res.redirect('/register');
          }
          req.flash('success_msg', 'Registro exitoso. Ahora puedes iniciar sesión.');
          return res.redirect('/login');
        });
        stmt.finalize();
      })
      .catch((hashErr) => {
        console.error('Error al hashear contraseña:', hashErr.message);
        console.error(hashErr.stack);
        req.flash('error_msg', 'Error interno al procesar contraseña.');
        return res.redirect('/register');
      });
  });
});

// 6.2. POST /login (form-url-encoded)
app.post('/login', (req, res) => {
  console.log('→ POST /login → req.body =', req.body);
  const { correo, contraseña } = req.body;

  if (!correo || !contraseña) {
    req.flash('error_msg', 'Por favor completa todos los campos.');
    return res.redirect('/login');
  }

  db.get(`SELECT * FROM users WHERE correo = ?`, [correo], async (err, user) => {
    if (err) {
      console.error('Error en SELECT /login:', err.message);
      console.error(err.stack);
      req.flash('error_msg', 'Error interno en el servidor.');
      return res.redirect('/login');
    }
    if (!user) {
      req.flash('error_msg', 'Credenciales incorrectas.');
      return res.redirect('/login');
    }

    try {
      const match = await bcrypt.compare(contraseña, user.contrasenaHash);
      if (!match) {
        req.flash('error_msg', 'Credenciales incorrectas.');
        return res.redirect('/login');
      }

      req.session.user = {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
        rol: user.rol
      };

      if (user.rol === 'admin') {
        // ─── Cada vez que un admin inicia sesión, regeneramos citas.json ───
        generarReporteCitas();
        return res.redirect('/admin');
      } else {
        return res.redirect('/agendar');
      }
    } catch (compareErr) {
      console.error('Error al comparar contraseñas:', compareErr.message);
      console.error(compareErr.stack);
      req.flash('error_msg', 'Error interno en el servidor.');
      return res.redirect('/login');
    }
  });
});

// 6.3. GET /logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error(err);
    return res.redirect('/');
  });
});

// ───────────────────────────────────────────────────────────
// 7. Lógica AJAX de autenticación (JSON): /api/auth/register & /api/auth/login
// ───────────────────────────────────────────────────────────

// 7.1. POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  const { nombre, correo, contraseña } = req.body;

  if (!nombre || !correo || !contraseña) {
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }

  db.get(`SELECT id FROM users WHERE correo = ?`, [correo], (err, row) => {
    if (err) {
      console.error('Error en SELECT /api/auth/register:', err.message);
      console.error(err.stack);
      return res.status(500).json({ error: 'Error interno al verificar usuario.' });
    }
    if (row) {
      return res.status(409).json({ error: 'Ese correo ya está registrado.' });
    }

    bcrypt
      .hash(contraseña, 10)
      .then((hash) => {
        const stmt = db.prepare(
          `INSERT INTO users (nombre, correo, contrasenaHash, rol)
           VALUES (?, ?, ?, 'cliente')`
        );
        stmt.run([nombre, correo, hash], function (err2) {
          if (err2) {
            console.error('Error en INSERT /api/auth/register:', err2.message);
            console.error(err2.stack);
            return res.status(500).json({ error: 'Error al registrar usuario.' });
          }
          return res.status(201).json({ message: 'Registro exitoso.' });
        });
        stmt.finalize();
      })
      .catch((hashErr) => {
        console.error('Error al hashear contraseña:', hashErr.message);
        console.error(hashErr.stack);
        return res.status(500).json({ error: 'Error interno al procesar contraseña.' });
      });
  });
});

// 7.2. POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { correo, contraseña } = req.body;

  if (!correo || !contraseña) {
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }

  db.get(`SELECT * FROM users WHERE correo = ?`, [correo], async (err, user) => {
    if (err) {
      console.error('Error en SELECT /api/auth/login:', err.message);
      console.error(err.stack);
      return res.status(500).json({ error: 'Error interno en el servidor.' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    try {
      const match = await bcrypt.compare(contraseña, user.contrasenaHash);
      if (!match) {
        return res.status(401).json({ error: 'Credenciales incorrectas.' });
      }

      req.session.user = {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
        rol: user.rol
      };

      return res.json({ rol: user.rol });
    } catch (compareErr) {
      console.error('Error al comparar contraseñas:', compareErr.message);
      console.error(compareErr.stack);
      return res.status(500).json({ error: 'Error interno en el servidor.' });
    }
  });
});

// ───────────────────────────────────────────────────────────
// 8. Rutas para agendar citas
// ───────────────────────────────────────────────────────────

// 8.1. POST /agendar-cita (solo clientes autenticados)
app.post('/agendar-cita', checkCliente, (req, res) => {
  const userId   = req.session.user.id;
  const { fecha, comentario, autoId } = req.body;

  if (!fecha || !autoId) {
    return res.status(400).json({ message: 'La fecha y el ID del auto son obligatorios.' });
  }

  const createdAt = new Date().toISOString();

  const stmt = db.prepare(
    `INSERT INTO citas (userId, autoId, fecha, comentario, estado, createdAt)
     VALUES (?, ?, ?, ?, 'pendiente', ?)`
  );
  stmt.run([userId, autoId, fecha, comentario || '', createdAt], async function (err) {
    if (err) {
      console.error('Error en INSERT /agendar-cita:', err.message);
      console.error(err.stack);
      return res.status(500).json({ message: 'Error del servidor.' });
    }

    // Construimos el objeto de la nueva cita para devolver al cliente
    const nuevaCita = {
      id: this.lastID,
      userId,
      autoId: parseInt(autoId, 10),
      fecha,
      comentario: comentario || '',
      estado: 'pendiente',
      createdAt
    };

    // ───> Aquí regeneramos el JSON en disco <───
    // Esto asegura que, aunque el admin esté logueado, al recargar su vista
    // obtenga las citas más recientes.
    generarReporteCitas();

    // Finalmente devolvemos respuesta al cliente que agendó
    return res.status(201).json({
      message: 'Cita agendada correctamente.',
      cita: nuevaCita
    });
  });
  stmt.finalize();
});

// 8.2. GET /api/citas-pendientes (solo admin)
app.get('/api/citas-pendientes', checkAdmin, (req, res) => {
  const query = `
    SELECT c.id, u.nombre AS cliente, u.correo AS contacto, c.fecha, c.comentario
    FROM citas c
    JOIN users u ON c.userId = u.id
    WHERE c.estado = 'pendiente'
    ORDER BY c.fecha ASC
  `;
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error en SELECT /api/citas-pendientes:', err.message);
      console.error(err.stack);
      return res.status(500).json({ message: 'Error del servidor.' });
    }
    return res.json(rows);
  });
});

// 8.3. PATCH /api/citas/:id/estado (solo admin)
app.patch('/api/citas/:id/estado', checkAdmin, (req, res) => {
  const citaId = parseInt(req.params.id, 10);
  const { estado } = req.body;

  if (!['pendiente', 'confirmada', 'cancelada'].includes(estado)) {
    return res.status(400).json({ message: 'Estado inválido.' });
  }

  const stmt = db.prepare(`UPDATE citas SET estado = ? WHERE id = ?`);
  stmt.run([estado, citaId], function (err) {
    if (err) {
      console.error('Error en UPDATE /api/citas/:id/estado:', err.message);
      console.error(err.stack);
      return res.status(500).json({ message: 'Error del servidor.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Cita no encontrada.' });
    }
    return res.json({ message: 'Estado de la cita actualizado.' });
  });
  stmt.finalize();
});

// ───────────────────────────────────────────────────────────
// 9. Rutas para gestión de autos
// ───────────────────────────────────────────────────────────

// 9.1. POST /autos/nuevo (solo admin)
app.post(
  '/autos/nuevo',
  checkAdmin,
  upload.single('imagen'),
  (req, res) => {
    const { marca, modelo, precio, descripcion } = req.body;
    if (!marca || !modelo || !precio || !req.file) {
      req.flash('error_msg', 'Debes proporcionar marca, modelo, precio e imagen.');
      return res.redirect('/admin');
    }

    const nombreImagen = req.file.filename;
    const rutaImagen = `/public/images/${nombreImagen}`;
    const createdAt = new Date().toISOString();

    const stmt = db.prepare(
      `INSERT INTO autos (marca, modelo, precio, descripcion, imagenPath, disponible, createdAt)
       VALUES (?, ?, ?, ?, ?, 1, ?)`
    );
    stmt.run(
      [marca, modelo, parseFloat(precio), descripcion || '', rutaImagen, createdAt],
      function (err) {
        if (err) {
          console.error('Error en INSERT /autos/nuevo:', err.message);
          console.error(err.stack);
          req.flash('error_msg', 'Ocurrió un error al guardar el auto.');
          return res.redirect('/admin');
        }

        req.flash('success_msg', 'Auto agregado correctamente (ID ' + this.lastID + ').');
        return res.redirect('/admin');
      }
    );
    stmt.finalize();
  }
);

// 9.2. GET /api/autos (público — ya no requiere checkAdmin)
app.get('/api/autos', (req, res) => {
  const query = `
    SELECT id, marca, modelo, precio, descripcion, imagenPath, disponible, createdAt
    FROM autos
    ORDER BY datetime(createdAt) DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error en SELECT /api/autos:', err.message);
      console.error(err.stack);
      return res.status(500).json({ message: 'Error del servidor.' });
    }
    // Convertimos disponible de INTEGER a boolean
    const autos = rows.map(a => ({
      ...a,
      disponible: a.disponible === 1
    }));
    return res.json(autos);
  });
});

// 9.3. PUT /api/autos/:id/vender (solo admin)
app.put('/api/autos/:id/vender', checkAdmin, (req, res) => {
  const autoId = parseInt(req.params.id, 10);
  if (isNaN(autoId)) {
    return res.status(400).json({ error: 'ID de auto inválido' });
  }

  db.serialize(() => {
    db.get(`SELECT * FROM autos WHERE id = ?`, [autoId], (err, auto) => {
      if (err) {
        console.error('Error en SELECT /api/autos/:id/vender:', err.message);
        console.error(err.stack);
        return res.status(500).json({ error: 'Error interno del servidor.' });
      }
      if (!auto) {
        return res.status(404).json({ error: 'Auto no encontrado.' });
      }

      const stmtUpdateAuto = db.prepare(`UPDATE autos SET disponible = 0 WHERE id = ?`);
      stmtUpdateAuto.run([autoId], function (err2) {
        if (err2) {
          console.error('Error en UPDATE autos /vender:', err2.message);
          console.error(err2.stack);
          return res.status(500).json({ error: 'Error interno del servidor.' });
        }

        const stmtCancelCitas = db.prepare(
          `UPDATE citas SET estado = 'cancelada' WHERE autoId = ? AND estado != 'cancelada'`
        );
        stmtCancelCitas.run([autoId], function (err3) {
          if (err3) {
            console.error('Error en UPDATE citas /vender:', err3.message);
            console.error(err3.stack);
            return res.status(500).json({ error: 'Error interno del servidor.' });
          }

          db.all(
            `SELECT * FROM citas WHERE autoId = ? AND estado = 'cancelada'`,
            [autoId],
            (err4, citasCanceladas) => {
              if (err4) {
                console.error('Error en SELECT citas canceladas:', err4.message);
                console.error(err4.stack);
                return res.status(500).json({ error: 'Error interno del servidor.' });
              }

              const autoVendido = { ...auto, disponible: false };
              return res.json({
                mensaje: `Auto con id=${autoId} vendido y citas asociadas canceladas.`,
                auto: autoVendido,
                citasCanceladas
              });
            }
          );
        });
        stmtCancelCitas.finalize();
      });
      stmtUpdateAuto.finalize();
    });
  });
});

// ───────────────────────────────────────────────────────────
// 9.x) GET /api/citas-json (sólo admin): lee citas.json y devuelve JSON
// ───────────────────────────────────────────────────────────
app.get('/api/citas-json', checkAdmin, async (req, res) => {
  const filePath = path.join(__dirname, 'citas.json');
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const citas = JSON.parse(data);
    return res.json(citas);
  } catch (readErr) {
    console.error('Error al leer citas.json:', readErr);
    return res.status(200).json([]);
  }
});

// ───────────────────────────────────────────────────────────
// 10. Ruta opcional para subir solo la imagen (si la necesitas por separado)
// ───────────────────────────────────────────────────────────
app.post(
  '/subir-imagen-auto',
  checkAdmin,
  upload.single('imagen'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).send('No se envió ningún archivo.');
    }
    const nombreImagen = req.file.filename;
    const urlImagen = `/public/images/${nombreImagen}`;
    return res.json({
      message: 'Imagen subida correctamente.',
      url: urlImagen
    });
  }
);

// ───────────────────────────────────────────────────────────
// 11. Ruta 404 genérica
// ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

// ───────────────────────────────────────────────────────────
// 12. Iniciar servidor y (por primera vez) generar citas.json
// ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Servidor arrancado en http://localhost:${PORT}`);
});

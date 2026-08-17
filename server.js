// ===== EL CEREBRO DEL BUNKER (version 1 a 1) =====
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 10 * 1024 * 1024 });

// Trabajo 1: servir la cara de la app
app.use(express.static(path.join(__dirname, 'public')));

let mensajes = [];   // { de, para, tipo, contenido, hora }
let nombres = [];    // todos los que han entrado al bunker
let conectados = {}; // nombre -> conexion activa

io.on('connection', (socket) => {

  // Alguien entra con su nombre
  socket.on('entrar', (nombre) => {
    nombre = String(nombre || '').trim().slice(0, 15);
    if (!nombre) return;
    socket.nombre = nombre;
    conectados[nombre] = socket.id;
    if (!nombres.includes(nombre)) nombres.push(nombre);

    // Le damos su lista de amigos y SU historial privado
    socket.emit('bienvenida', {
      contactos: nombres,
      historial: mensajes.filter(m => m.de === nombre || m.para === nombre),
      conectados: Object.keys(conectados)
    });

    // Avisamos a todos que esta persona esta en linea
    io.emit('estado', { nombre: nombre, enLinea: true });
  });

  // Trabajo 2: cartero inteligente (solo al destinatario)
  socket.on('mensaje', (dato) => {
    if (!socket.nombre || !dato || !dato.para) return;
    dato.de = socket.nombre;
    dato.hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    mensajes.push(dato);
    const idDestino = conectados[dato.para];
    if (idDestino) io.to(idDestino).emit('mensaje', dato);
  });

  // Al salir, avisamos que se fue
  socket.on('disconnect', () => {
    if (socket.nombre) {
      delete conectados[socket.nombre];
      io.emit('estado', { nombre: socket.nombre, enLinea: false });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Bunker abierto en puerto ' + PORT));

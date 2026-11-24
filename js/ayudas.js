/* ============================================================
   ayudas.js
   Cosas que hacen la app más cómoda al contar:
     - Teclado numérico grande en pantalla
     - Deshacer el último cambio
     - Ventana de aviso grande
     - Mantener la pantalla encendida
     - Usar el teclado del ordenador en el teclado y los avisos
   ============================================================ */


/* ============================================================
   TECLADO NUMÉRICO
   ============================================================ */

var idArticuloTeclado = null;   // artículo cuya cantidad se está escribiendo
var textoTeclado = '';          // número que se va escribiendo
var MAXIMO_CIFRAS = 5;

function abrirTeclado(idArticulo) {
    var articulo = buscarArticulo(idArticulo);
    idArticuloTeclado = idArticulo;
    textoTeclado = '';

    var idFamilia = buscarProducto(articulo.idProducto).idFamilia;
    var titulo = describirColor(idFamilia, articulo.color);
    if (articulo.medida !== '') {
        titulo = articulo.medida + ' · ' + titulo;
    }
    $('#tecladoTitulo').text(titulo);

    if (articulo.cantidad === null) {
        $('#tecladoAhora').text('Todavía sin contar');
    } else {
        $('#tecladoAhora').text('Ahora hay apuntados: ' + articulo.cantidad);
    }

    pintarPantallaTeclado();
    $('#tecladoNumerico').addClass('visible');
}

function cerrarTeclado() {
    $('#tecladoNumerico').removeClass('visible');
    idArticuloTeclado = null;
}

function pintarPantallaTeclado() {
    if (textoTeclado === '') {
        $('#tecladoPantalla').html('<span class="teclado-vacio">Escribe la cantidad</span>');
    } else {
        $('#tecladoPantalla').text(textoTeclado);
    }
}

function pulsarTecla(tecla) {
    if (tecla === 'borrar') {
        textoTeclado = textoTeclado.slice(0, -1);
    } else if (tecla === 'todo') {
        textoTeclado = '';
    } else if (textoTeclado.length < MAXIMO_CIFRAS) {
        // Evitamos ceros a la izquierda: "07" -> "7"
        if (textoTeclado === '0') {
            textoTeclado = '';
        }
        textoTeclado = textoTeclado + tecla;
    }
    pintarPantallaTeclado();
}

function aceptarTeclado() {
    if (textoTeclado !== '') {
        cambiarCantidadArticulo(idArticuloTeclado, parseInt(textoTeclado, 10));
    }
    cerrarTeclado();
}


/* ============================================================
   DESHACER
   Se guarda una lista con los últimos cambios de cantidad.
   ============================================================ */

var historialDeshacer = [];     // [{ idArticulo, cantidadAntes }, ...]
var MAXIMO_DESHACER = 50;

function guardarParaDeshacer(idArticulo, cantidadAntes) {
    historialDeshacer.push({ idArticulo: idArticulo, cantidadAntes: cantidadAntes });
    if (historialDeshacer.length > MAXIMO_DESHACER) {
        historialDeshacer.shift();
    }
    actualizarBotonDeshacer();
}

function vaciarDeshacer() {
    historialDeshacer = [];
    actualizarBotonDeshacer();
}

function deshacerUltimoCambio() {
    if (historialDeshacer.length === 0) {
        return;
    }
    var ultimo = historialDeshacer.pop();
    if (buscarArticulo(ultimo.idArticulo) !== null) {
        ponerCantidad(ultimo.idArticulo, ultimo.cantidadAntes);
        refrescarFila(ultimo.idArticulo);
    }
    actualizarBotonDeshacer();
}

// El botón solo se puede pulsar si hay algo que deshacer
function actualizarBotonDeshacer() {
    $('#botonDeshacer').prop('disabled', historialDeshacer.length === 0);
}


/* ============================================================
   VENTANA DE AVISO GRANDE
   textoSecundario puede ser '' para no mostrar el segundo botón.
   ============================================================ */

var accionAvisoPrincipal = null;

function mostrarAviso(titulo, texto, textoPrincipal, accionPrincipal, textoSecundario) {
    $('#avisoTitulo').text(titulo);
    $('#avisoTexto').text(texto);
    $('#avisoBotonPrincipal').text(textoPrincipal);
    accionAvisoPrincipal = accionPrincipal;

    if (textoSecundario === '') {
        $('#avisoBotonSecundario').hide();
    } else {
        $('#avisoBotonSecundario').text(textoSecundario).show();
    }
    $('#ventanaAviso').addClass('visible');
}

function cerrarAviso() {
    $('#ventanaAviso').removeClass('visible');
}


/* ============================================================
   PANTALLA SIEMPRE ENCENDIDA (mientras se cuenta)
   Solo funciona en Chrome con la app abierta desde https://
   ============================================================ */

var bloqueoPantalla = null;

function mantenerPantallaEncendida() {
    if (!('wakeLock' in navigator) || bloqueoPantalla !== null) {
        return;
    }
    navigator.wakeLock.request('screen').then(function (bloqueo) {
        bloqueoPantalla = bloqueo;
        bloqueo.addEventListener('release', function () {
            bloqueoPantalla = null;
        });
    }).catch(function () {
        // Si el navegador no lo permite, no pasa nada
    });
}

function dejarApagarPantalla() {
    if (bloqueoPantalla !== null) {
        bloqueoPantalla.release();
        bloqueoPantalla = null;
    }
}


/* ============================================================
   TECLADO DEL ORDENADOR
   Con el teclado numérico abierto:
     números = escribir, Retroceso = borrar una cifra,
     Supr = borrarlo todo, Intro = aceptar, Esc = cancelar.
   Con un aviso abierto: Intro = botón verde, Esc = cerrar.
   ============================================================ */

function pulsarTeclaFisica(evento) {
    var tecla = evento.key;

    if ($('#tecladoNumerico').hasClass('visible')) {
        if (tecla >= '0' && tecla <= '9' && tecla.length === 1) {
            pulsarTecla(tecla);
        } else if (tecla === 'Backspace') {
            pulsarTecla('borrar');
        } else if (tecla === 'Delete') {
            pulsarTecla('todo');
        } else if (tecla === 'Enter') {
            aceptarTeclado();
        } else if (tecla === 'Escape') {
            cerrarTeclado();
        } else {
            return;
        }
        evento.preventDefault();
        return;
    }

    if ($('#ventanaAviso').hasClass('visible')) {
        if (tecla === 'Enter') {
            $('#avisoBotonPrincipal').trigger('click');
        } else if (tecla === 'Escape') {
            cerrarAviso();
        } else {
            return;
        }
        evento.preventDefault();
    }
}


/* ============================================================
   EVENTOS DE ESTAS AYUDAS
   ============================================================ */

function prepararEventosAyudas() {
    $('#tecladoNumerico').on('click', '.tecla', function () {
        pulsarTecla(String($(this).data('tecla')));
    });
    $('#tecladoAceptar').on('click', aceptarTeclado);
    $('#tecladoCancelar').on('click', cerrarTeclado);

    $('#botonDeshacer').on('click', deshacerUltimoCambio);

    $('#avisoBotonPrincipal').on('click', function () {
        cerrarAviso();
        if (accionAvisoPrincipal !== null) {
            accionAvisoPrincipal();
        }
    });
    $('#avisoBotonSecundario').on('click', cerrarAviso);

    // Teclado del ordenador
    $(document).on('keydown', pulsarTeclaFisica);

    // Al volver a la app (por ejemplo, tras bloquear la tablet)
    // el navegador suelta el bloqueo: lo pedimos otra vez.
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && pantallaActual === 'pantallaColores') {
            mantenerPantallaEncendida();
        }
    });
}

/* ============================================================
   app.js
   Pantallas y botones de la aplicación.
   Usa las funciones de datos.js y plantillas.js
   ============================================================ */

var pantallaActual = 'pantallaInicio';
var pantallaAntesDeHerramientas = 'pantallaInicio';
var idFamiliaActual = null;
var idProductoActual = null;
var medidaActual = null;   // texto de la medida que se está contando, ej. "10 cm"
var modoEdicion = false;   // true = se ven los botones para quitar colores
var modoEncargado = false; // false = modo sencillo (el que se abre siempre)


$(document).ready(function () {
    cargarDatos();
    pedirAlmacenamientoPermanente();
    prepararEventos();
    prepararEventosAyudas();
    prepararBotonAtrasTablet();
    mostrarInicio();
    registrarFuncionamientoSinConexion();
});


/* ============================================================
   MODO SENCILLO / MODO ENCARGADO
   ============================================================ */

function entrarModoEncargado() {
    var codigo = prompt('Código del encargado:');
    if (codigo === null) {
        return;
    }
    if (!comprobarCodigo(codigo.trim())) {
        alert('Código incorrecto.');
        return;
    }
    modoEncargado = true;
    $('body').removeClass('modo-sencillo').addClass('modo-encargado');
    repintarPantallaActual();
    avisarSiFaltaCopia();
}

// Si hace una semana o más que no se hace copia, lo avisamos
function avisarSiFaltaCopia() {
    if (datos.articulos.length === 0) {
        return;
    }
    var dias = diasDesdeUltimaCopia();
    var texto = '';
    if (dias === null) {
        texto = 'Todavía no has hecho ninguna copia de seguridad.';
    } else if (dias >= 7) {
        texto = 'Hace ' + dias + ' días que no haces una copia de seguridad.';
    } else {
        return;
    }
    mostrarAviso('Copia de seguridad', texto + ' Los datos solo están en esta tablet.',
        'Descargar copia ahora', descargarCopiaSeguridad, 'Más tarde');
}

function salirModoEncargado() {
    modoEncargado = false;
    modoEdicion = false;
    $('body').removeClass('modo-encargado').addClass('modo-sencillo');

    if (pantallaActual === 'pantallaHerramientas') {
        mostrarInicio();
    } else {
        repintarPantallaActual();
    }
}

// Vuelve a dibujar la pantalla en la que estamos
function repintarPantallaActual() {
    if (pantallaActual === 'pantallaColores') {
        mostrarColores(idProductoActual, medidaActual);
    } else if (pantallaActual === 'pantallaProducto') {
        mostrarProducto(idProductoActual);
    } else if (pantallaActual === 'pantallaFamilia') {
        mostrarFamilia(idFamiliaActual);
    } else if (pantallaActual === 'pantallaInicio') {
        mostrarInicio();
    }
}


/* ============================================================
   BOTÓN "ATRÁS" DE LA TABLET (el de Android)
   Sin esto, con la app instalada, ese botón cierra la app.
   Truco: dejamos siempre una "página" de más en el historial
   del navegador. Al pulsar atrás, el navegador la quita, nosotros
   vamos a la pantalla anterior y la volvemos a poner.
   ============================================================ */

function prepararBotonAtrasTablet() {
    history.pushState({ app: 'inventario' }, '');

    window.addEventListener('popstate', function () {
        // Si hay una ventana abierta, el botón atrás la cierra
        if ($('#tecladoNumerico').hasClass('visible')) {
            cerrarTeclado();
        } else if ($('#ventanaAviso').hasClass('visible')) {
            cerrarAviso();
        } else if (pantallaActual !== 'pantallaInicio') {
            volverAtras();
        }
        // En la pantalla de inicio no hace nada: así no se cierra sin querer
        history.pushState({ app: 'inventario' }, '');
    });
}


/* ============================================================
   FUNCIONAR SIN INTERNET (cuando está instalada en la tablet)
   Solo funciona si la app se abre desde una dirección https://
   ============================================================ */

function registrarFuncionamientoSinConexion() {
    var esSegura = location.protocol === 'https:' || location.hostname === 'localhost';
    if ('serviceWorker' in navigator && esSegura) {
        navigator.serviceWorker.register('sin-conexion.js');
    }
}


/* ============================================================
   CAMBIO DE PANTALLA
   ============================================================ */

function cambiarPantalla(idPantalla, titulo) {
    $('.pantalla').hide();
    $('#' + idPantalla).show();
    $('#tituloPantalla').text(titulo);
    pantallaActual = idPantalla;

    // En la pantalla de inicio no hacen falta Volver ni la barra de abajo
    $('#barraInferior').toggle(idPantalla !== 'pantallaInicio');
    if (idPantalla === 'pantallaInicio') {
        $('#botonVolver').css('visibility', 'hidden');
    } else {
        $('#botonVolver').css('visibility', 'visible');
    }

    // Mientras se cuenta, la pantalla no se apaga
    if (idPantalla === 'pantallaColores') {
        mantenerPantallaEncendida();
    } else {
        dejarApagarPantalla();
    }

    pintarMigas();
    window.scrollTo(0, 0);
}

function volverAtras() {
    if (pantallaActual === 'pantallaColores') {
        volverDesdeColores();
    } else if (pantallaActual === 'pantallaProducto') {
        mostrarFamilia(idFamiliaActual);
    } else if (pantallaActual === 'pantallaFamilia') {
        mostrarInicio();
    } else if (pantallaActual === 'pantallaHerramientas') {
        if (pantallaAntesDeHerramientas === 'pantallaColores') {
            mostrarColores(idProductoActual, medidaActual);
        } else if (pantallaAntesDeHerramientas === 'pantallaProducto') {
            mostrarProducto(idProductoActual);
        } else if (pantallaAntesDeHerramientas === 'pantallaFamilia') {
            mostrarFamilia(idFamiliaActual);
        } else {
            mostrarInicio();
        }
    }
}

// Si el producto no tiene medidas, desde los colores se vuelve a la familia
function volverDesdeColores() {
    if (productoSinMedidas(idProductoActual)) {
        mostrarFamilia(idFamiliaActual);
    } else {
        mostrarProducto(idProductoActual);
    }
}

// Pinta la ruta "Inicio › Familia › Tipo › Medida"
function pintarMigas() {
    var html = '<a href="#" class="miga" data-destino="inicio">Inicio</a>';
    var dentroDeFamilia = pantallaActual === 'pantallaFamilia' ||
                          pantallaActual === 'pantallaProducto' ||
                          pantallaActual === 'pantallaColores';

    if (dentroDeFamilia) {
        var familia = buscarFamilia(idFamiliaActual);
        html += ' &rsaquo; <a href="#" class="miga" data-destino="familia">' + escaparHtml(familia.nombre) + '</a>';
    }
    if (pantallaActual === 'pantallaProducto') {
        var producto = buscarProducto(idProductoActual);
        html += ' &rsaquo; <span>' + escaparHtml(producto.nombre) + '</span>';
    }
    if (pantallaActual === 'pantallaColores') {
        var productoColores = buscarProducto(idProductoActual);
        html += ' &rsaquo; <a href="#" class="miga" data-destino="producto">' + escaparHtml(productoColores.nombre) + '</a>';
        if (medidaActual !== '') {
            html += ' &rsaquo; <span>' + escaparHtml(medidaActual) + '</span>';
        }
    }
    if (pantallaActual === 'pantallaHerramientas') {
        html += ' &rsaquo; <span>Herramientas</span>';
    }

    $('#migas').html(html);
}

// Texto "12 / 30 contados" con su barra
function htmlProgreso(progreso) {
    var porcentaje = 0;
    if (progreso.total > 0) {
        porcentaje = Math.round(progreso.contados * 100 / progreso.total);
    }
    var faltan = progreso.total - progreso.contados;
    var texto = '';
    if (progreso.total === 0) {
        texto = 'Vacío';
    } else if (faltan === 0) {
        texto = '&#10003; Todo contado';
    } else if (faltan === 1) {
        texto = 'Falta 1 por contar';
    } else {
        texto = 'Faltan ' + faltan + ' por contar';
    }

    var claseTexto = 'progreso-texto';
    if (progreso.total > 0 && faltan === 0) {
        claseTexto = 'progreso-texto progreso-completo';
    }

    var html = '';
    html += '<div class="' + claseTexto + '">' + texto + '</div>';
    html += '<div class="barra"><div class="barra-relleno" style="width:' + porcentaje + '%"></div></div>';
    return html;
}


/* ============================================================
   PANTALLA 1: FAMILIAS
   ============================================================ */

function mostrarInicio() {
    idFamiliaActual = null;
    idProductoActual = null;
    pintarFamilias();
    cambiarPantalla('pantallaInicio', 'Inventario');
}

function pintarFamilias() {
    var html = '';

    if (datos.familias.length === 0) {
        html = '<p class="vacio">Todavía no hay nada preparado. El encargado tiene que crear las familias.</p>';
    }

    for (var i = 0; i < datos.familias.length; i++) {
        var familia = datos.familias[i];
        var numeroProductos = obtenerProductosDeFamilia(familia.id).length;
        var progreso = calcularProgreso(obtenerArticulosDeFamilia(familia.id));

        html += '<button type="button" class="tarjeta tarjeta-familia" data-id="' + familia.id + '">';
        html += '<span class="tarjeta-nombre">' + escaparHtml(familia.nombre) + '</span>';
        html += '<span class="tarjeta-detalle">' + numeroProductos + ' productos</span>';
        html += htmlProgreso(progreso);
        html += '</button>';
    }

    $('#listaFamilias').html(html);
}


/* ============================================================
   PANTALLA 2: PRODUCTOS DE UNA FAMILIA
   ============================================================ */

function mostrarFamilia(idFamilia) {
    idFamiliaActual = idFamilia;
    idProductoActual = null;
    pintarProductos();
    pintarCodigosColor();
    cambiarPantalla('pantallaFamilia', buscarFamilia(idFamilia).nombre);
}

// Lista de códigos de color de la familia (solo se ve en modo encargado)
function pintarCodigosColor() {
    var codigos = obtenerCodigosColor(idFamiliaActual);
    var html = '';

    if (codigos.length === 0) {
        html = '<p class="ayuda">Todavía no hay códigos en esta familia.</p>';
    }
    for (var i = 0; i < codigos.length; i++) {
        html += '<div class="fila-codigo">';
        html += htmlMuestraColor(codigos[i].nombre);
        html += '<span class="texto-codigo"><strong>' + escaparHtml(codigos[i].codigo) + '</strong> = ' + escaparHtml(codigos[i].nombre) + '</span>';
        html += '<button type="button" class="boton boton-peligro boton-quitar-codigo" data-codigo="' + escaparHtml(codigos[i].codigo) + '">Quitar</button>';
        html += '</div>';
    }
    $('#listaCodigosColor').html(html);
}

function pintarProductos() {
    var productos = obtenerProductosDeFamilia(idFamiliaActual);
    var html = '';

    if (productos.length === 0) {
        html = '<p class="vacio">Esta familia todavía no tiene tipos.</p>';
    }

    for (var i = 0; i < productos.length; i++) {
        var producto = productos[i];
        var progreso = calcularProgreso(obtenerArticulosDeProducto(producto.id));

        html += '<button type="button" class="tarjeta tarjeta-producto" data-id="' + producto.id + '">';
        html += '<span class="tarjeta-nombre">' + escaparHtml(producto.nombre) + '</span>';
        html += htmlProgreso(progreso);
        html += '</button>';
    }

    $('#listaProductos').html(html);
}


/* ============================================================
   PANTALLA 3: MEDIDAS DE UN PRODUCTO (botones)
   ============================================================ */

// true si el producto solo tiene artículos "sin medida"
function productoSinMedidas(idProducto) {
    var medidas = obtenerMedidasDeProducto(idProducto);
    return medidas.length === 1 && medidas[0] === '';
}

function mostrarProducto(idProducto) {
    idProductoActual = idProducto;
    idFamiliaActual = buscarProducto(idProducto).idFamilia;

    // Si no tiene medidas (por ejemplo, solo colores) vamos directos a contar
    if (productoSinMedidas(idProducto)) {
        mostrarColores(idProducto, '');
        return;
    }

    pintarMedidas();
    cambiarPantalla('pantallaProducto', buscarProducto(idProducto).nombre);
}

function pintarMedidas() {
    var medidas = obtenerMedidasDeProducto(idProductoActual);
    var html = '';

    if (medidas.length === 0) {
        html = '<p class="vacio">Este tipo todavía no tiene medidas ni colores.</p>';
    }

    for (var i = 0; i < medidas.length; i++) {
        var articulos = obtenerArticulosDeMedida(idProductoActual, medidas[i]);
        var progreso = calcularProgreso(articulos);
        var nombreMedida = medidas[i];
        if (nombreMedida === '') {
            nombreMedida = 'Sin medida';
        }

        // La posición en la lista nos dice qué medida es al pulsar
        html += '<button type="button" class="tarjeta tarjeta-medida" data-posicion="' + i + '">';
        html += '<span class="tarjeta-nombre">' + escaparHtml(nombreMedida) + '</span>';
        html += '<span class="tarjeta-detalle">' + articulos.length + ' colores</span>';
        html += htmlProgreso(progreso);
        html += '</button>';
    }

    $('#listaMedidas').html(html);

    var progresoTotal = calcularProgreso(obtenerArticulosDeProducto(idProductoActual));
    $('#resumenProducto').html(htmlProgreso(progresoTotal));
}


/* ============================================================
   PANTALLA 4: COLORES DE UNA MEDIDA (aquí se cuenta)
   ============================================================ */

function mostrarColores(idProducto, medida) {
    idProductoActual = idProducto;
    idFamiliaActual = buscarProducto(idProducto).idFamilia;
    medidaActual = medida;
    modoEdicion = false;
    vaciarDeshacer();
    pintarColores();

    var titulo = buscarProducto(idProducto).nombre;
    if (medida !== '') {
        titulo = titulo + ' · ' + medida;
    }
    cambiarPantalla('pantallaColores', titulo);
}

function pintarColores() {
    var articulos = obtenerArticulosDeMedida(idProductoActual, medidaActual);
    var html = '';

    if (articulos.length === 0) {
        html = '<p class="vacio">No quedan colores en esta medida.</p>';
    }
    for (var i = 0; i < articulos.length; i++) {
        html += htmlFilaArticulo(articulos[i]);
    }
    $('#listaArticulos').html(html);
    pintarResumenMedida();

    // Botones de medida anterior / siguiente
    var medidas = obtenerMedidasDeProducto(idProductoActual);
    var posicion = medidas.indexOf(medidaActual);
    var esLaUltima = posicion === medidas.length - 1;
    $('#botonMedidaAnterior').toggle(posicion > 0);
    $('#botonMedidaSiguiente').toggle(!esLaUltima);
    $('#botonTerminarTipo').toggle(esLaUltima);
    $('#botonRenombrarMedida').toggle(medidaActual !== '');

    if (modoEdicion) {
        $('#pantallaColores').addClass('editando');
        $('#botonModoEdicion').text('Terminar de quitar');
    } else {
        $('#pantallaColores').removeClass('editando');
        $('#botonModoEdicion').text('Quitar colores');
    }
}

// Circulito con el color; con rayas si no conocemos ese nombre
function htmlMuestraColor(nombreColor) {
    var codigoColor = obtenerCodigoColor(nombreColor);
    if (codigoColor === null) {
        return '<span class="muestra-color muestra-desconocida"></span>';
    }
    return '<span class="muestra-color" style="background:' + codigoColor + '"></span>';
}

function htmlFilaArticulo(articulo) {
    // Si el color es un código (701...) y la familia sabe qué color es,
    // se muestra el nombre en grande y el código debajo
    var nombreTraducido = traducirColor(idFamiliaActual, articulo.color);
    var nombreColor = articulo.color;
    var referencia = '';
    if (nombreTraducido !== null) {
        nombreColor = nombreTraducido;
        referencia = 'Ref. ' + articulo.color;
    }
    if (nombreColor === '') {
        nombreColor = '—';
    }

    var valorCampo = '?';
    var claseEstado = 'sin-contar';
    if (articulo.cantidad !== null) {
        valorCampo = articulo.cantidad;
        claseEstado = 'contado';
    }

    var html = '';
    html += '<div class="fila-articulo ' + claseEstado + '" data-id="' + articulo.id + '">';
    html += htmlMuestraColor(nombreColor);
    html += '<span class="nombre-color">' + escaparHtml(nombreColor);
    if (referencia !== '') {
        html += '<small class="referencia">' + escaparHtml(referencia) + '</small>';
    }
    if (articulo.cantidadAnterior !== null) {
        html += '<small class="anterior">Anterior: ' + articulo.cantidadAnterior + '</small>';
    }
    html += '</span>';
    html += '<button type="button" class="boton-cantidad boton-restar">&minus;</button>';
    // Al tocar el número se abre el teclado grande (ver ayudas.js)
    html += '<button type="button" class="campo-cantidad">' + valorCampo + '</button>';
    html += '<button type="button" class="boton-cantidad boton-sumar">+</button>';
    html += '<button type="button" class="boton-quitar-articulo">Quitar</button>';
    html += '</div>';
    return html;
}

function pintarResumenMedida() {
    var progreso = calcularProgreso(obtenerArticulosDeMedida(idProductoActual, medidaActual));
    $('#resumenMedida').html(htmlProgreso(progreso));
}

// Actualiza solo una fila (más rápido que repintar todo al pulsar + o −)
function refrescarFila(idArticulo) {
    var articulo = buscarArticulo(idArticulo);
    var fila = $('.fila-articulo[data-id="' + idArticulo + '"]');

    if (articulo.cantidad === null) {
        fila.find('.campo-cantidad').text('?');
        fila.removeClass('contado').addClass('sin-contar');
    } else {
        fila.find('.campo-cantidad').text(articulo.cantidad);
        fila.removeClass('sin-contar').addClass('contado');
    }
    pintarResumenMedida();

    // Pequeño destello para que se vea que se ha guardado
    fila.addClass('recien-cambiado');
    setTimeout(function () {
        fila.removeClass('recien-cambiado');
    }, 400);
}

// TODOS los cambios de cantidad pasan por aquí:
// guarda para deshacer, cambia, refresca y comprueba si se ha terminado algo
function cambiarCantidadArticulo(idArticulo, cantidadNueva) {
    var articulo = buscarArticulo(idArticulo);
    if (articulo.cantidad === cantidadNueva) {
        return;
    }

    var articulosMedida = obtenerArticulosDeMedida(idProductoActual, medidaActual);
    var medidaEstabaTerminada = estaTodoContado(articulosMedida);
    var inventarioEstabaTerminado = estaTodoContado(datos.articulos);

    guardarParaDeshacer(idArticulo, articulo.cantidad);
    ponerCantidad(idArticulo, cantidadNueva);
    refrescarFila(idArticulo);

    if (!inventarioEstabaTerminado && estaTodoContado(datos.articulos)) {
        avisarInventarioTerminado();
    } else if (!medidaEstabaTerminada && estaTodoContado(articulosMedida)) {
        avisarMedidaTerminada();
    }
}

function sumarUno(idArticulo) {
    var cantidad = buscarArticulo(idArticulo).cantidad;
    if (cantidad === null) {
        cantidad = 0;
    }
    cambiarCantidadArticulo(idArticulo, cantidad + 1);
}

function restarUno(idArticulo) {
    var cantidad = buscarArticulo(idArticulo).cantidad;
    if (cantidad === null || cantidad <= 0) {
        cambiarCantidadArticulo(idArticulo, 0);
    } else {
        cambiarCantidadArticulo(idArticulo, cantidad - 1);
    }
}

function avisarMedidaTerminada() {
    var producto = buscarProducto(idProductoActual);
    var medidas = obtenerMedidasDeProducto(idProductoActual);
    var posicion = medidas.indexOf(medidaActual);
    var nombreMedida = medidaActual;
    if (nombreMedida === '') {
        nombreMedida = producto.nombre;
    }

    if (posicion < medidas.length - 1) {
        var siguiente = medidas[posicion + 1];
        mostrarAviso('¡' + nombreMedida + ' terminada!', 'Ya están contados todos sus colores.',
            'Seguir con ' + siguiente + ' \u203A', function () {
                cambiarDeMedida(1);
            }, 'Quedarme aquí');
    } else {
        mostrarAviso('¡' + producto.nombre + ' terminado!', 'Ya están contadas todas las medidas y colores.',
            'Elegir otro tipo', function () {
                mostrarFamilia(idFamiliaActual);
            }, 'Quedarme aquí');
    }
}

// Cuando se cuenta el último artículo de todo el inventario
function avisarInventarioTerminado() {
    descargarCopiaSeguridad();
    mostrarAviso('¡Inventario completo!',
        'Está todo contado. Se ha guardado una copia de seguridad en Descargas.',
        'Volver al inicio', mostrarInicio, 'Quedarme aquí');
}

// Pasa a la medida anterior (-1) o siguiente (+1)
function cambiarDeMedida(salto) {
    var medidas = obtenerMedidasDeProducto(idProductoActual);
    var posicion = medidas.indexOf(medidaActual) + salto;
    if (posicion >= 0 && posicion < medidas.length) {
        mostrarColores(idProductoActual, medidas[posicion]);
    }
}


/* ============================================================
   PANTALLA 5: HERRAMIENTAS
   ============================================================ */

function mostrarHerramientas() {
    if (!modoEncargado) {
        return;
    }
    if (pantallaActual !== 'pantallaHerramientas') {
        pantallaAntesDeHerramientas = pantallaActual;
    }
    rellenarSelectorPlantilla();
    pintarTextoUltimaCopia();
    cambiarPantalla('pantallaHerramientas', 'Herramientas');
}

// Rellena el desplegable con: Todo, cada familia y, dentro, sus productos
function rellenarSelectorPlantilla() {
    var html = '<option value="todo">Todo el inventario</option>';

    for (var i = 0; i < datos.familias.length; i++) {
        var familia = datos.familias[i];
        html += '<option value="familia-' + familia.id + '">' + escaparHtml(familia.nombre) + ' (toda la familia)</option>';

        var productos = obtenerProductosDeFamilia(familia.id);
        for (var j = 0; j < productos.length; j++) {
            html += '<option value="producto-' + productos[j].id + '">&nbsp;&nbsp;&nbsp;' + escaparHtml(productos[j].nombre) + '</option>';
        }
    }
    $('#selectorPlantilla').html(html);

    // Si venimos de una familia o producto, lo dejamos ya elegido
    if (pantallaAntesDeHerramientas === 'pantallaProducto' || pantallaAntesDeHerramientas === 'pantallaColores') {
        $('#selectorPlantilla').val('producto-' + idProductoActual);
    } else if (pantallaAntesDeHerramientas === 'pantallaFamilia') {
        $('#selectorPlantilla').val('familia-' + idFamiliaActual);
    }
}

function pintarTextoUltimaCopia() {
    var dias = diasDesdeUltimaCopia();
    var texto = 'Todavía no se ha hecho ninguna copia.';
    if (dias === 0) {
        texto = 'Última copia: hoy.';
    } else if (dias === 1) {
        texto = 'Última copia: ayer.';
    } else if (dias !== null) {
        texto = 'Última copia: hace ' + dias + ' días.';
    }
    $('#textoUltimaCopia').text(texto);
}

// Enseña qué hay en la copia y qué hay ahora, y pregunta antes de sustituir
function preguntarRestaurarCopia(datosCopia, nombreArchivo) {
    var fechaCopia = 'fecha desconocida (' + nombreArchivo + ')';
    if (datosCopia.ajustes && datosCopia.ajustes.fechaUltimaCopia) {
        fechaCopia = formatearFechaHora(datosCopia.ajustes.fechaUltimaCopia);
    }

    var texto = '';
    texto += 'COPIA: ' + fechaCopia + '\n';
    texto += resumirDatos(datosCopia) + '\n\n';
    texto += 'AHORA EN ESTE APARATO:\n';
    texto += resumirDatos(datos) + '\n\n';
    texto += 'Lo que hay ahora se sustituirá por la copia.';

    mostrarAviso('¿Restaurar esta copia?', texto, 'Sí, restaurar la copia', function () {
        restaurarDatos(datosCopia);
        mostrarAviso('Copia restaurada', resumirDatos(datos), 'Vale', mostrarInicio, '');
    }, 'Cancelar');
}

function leerFilasEnBlanco() {
    var numero = parseInt($('#campoFilasBlanco').val(), 10);
    if (isNaN(numero) || numero < 0) {
        numero = 0;
    }
    return numero;
}


/* ============================================================
   EVENTOS (qué pasa al pulsar cada cosa)
   ============================================================ */

// Convierte "10 cm, 15 cm ,, 20 cm" en ["10 cm", "15 cm", "20 cm"]
function separarPorComas(texto) {
    var partes = texto.split(',');
    var resultado = [];
    for (var i = 0; i < partes.length; i++) {
        var parte = partes[i].trim();
        if (parte !== '') {
            resultado.push(parte);
        }
    }
    return resultado;
}

function pedirNombre(mensaje, valorInicial) {
    var nombre = prompt(mensaje, valorInicial);
    if (nombre === null) {
        return null;
    }
    nombre = nombre.trim();
    if (nombre === '') {
        return null;
    }
    return nombre;
}

function prepararEventos() {

    /* ----- Cabecera ----- */
    $('#botonVolver').on('click', volverAtras);
    $('#botonAtrasInferior').on('click', volverAtras);
    $('#botonInicioInferior').on('click', mostrarInicio);
    $('#botonHerramientas').on('click', mostrarHerramientas);
    $('#botonEntrarEncargado').on('click', entrarModoEncargado);
    $('#botonSalirEncargado').on('click', salirModoEncargado);

    $('#migas').on('click', '.miga', function (evento) {
        evento.preventDefault();
        var destino = $(this).data('destino');
        if (destino === 'inicio') {
            mostrarInicio();
        } else if (destino === 'familia') {
            mostrarFamilia(idFamiliaActual);
        } else if (destino === 'producto') {
            mostrarProducto(idProductoActual);
        }
    });

    /* ----- Familias ----- */
    $('#listaFamilias').on('click', '.tarjeta-familia', function () {
        mostrarFamilia($(this).data('id'));
    });

    $('#formularioNuevaFamilia').on('submit', function (evento) {
        evento.preventDefault();
        var nombre = $('#campoNombreFamilia').val().trim();
        if (nombre === '') {
            return;
        }
        crearFamilia(nombre);
        $('#campoNombreFamilia').val('');
        pintarFamilias();
    });

    $('#botonRenombrarFamilia').on('click', function () {
        var familia = buscarFamilia(idFamiliaActual);
        var nombre = pedirNombre('Nuevo nombre de la familia:', familia.nombre);
        if (nombre !== null) {
            renombrarFamilia(idFamiliaActual, nombre);
            mostrarFamilia(idFamiliaActual);
        }
    });

    $('#botonBorrarFamilia').on('click', function () {
        var familia = buscarFamilia(idFamiliaActual);
        if (confirm('¿Borrar la familia "' + familia.nombre + '" con todos sus productos y recuentos?')) {
            borrarFamilia(idFamiliaActual);
            mostrarInicio();
        }
    });

    $('#botonImprimirFamilia').on('click', function () {
        imprimirPlantilla('familia-' + idFamiliaActual, 5);
    });

    /* ----- Códigos de color de la familia ----- */
    $('#formularioCodigoColor').on('submit', function (evento) {
        evento.preventDefault();
        var codigo = $('#campoCodigo').val().trim();
        var nombreColor = $('#campoNombreCodigo').val().trim();
        if (codigo === '' || nombreColor === '') {
            alert('Escribe el código y el color.');
            return;
        }
        ponerCodigoColor(idFamiliaActual, codigo, nombreColor);
        $('#campoCodigo').val('').focus();
        $('#campoNombreCodigo').val('');
        pintarCodigosColor();
    });

    $('#listaCodigosColor').on('click', '.boton-quitar-codigo', function () {
        var codigo = String($(this).data('codigo'));
        if (confirm('¿Quitar el código ' + codigo + '?')) {
            quitarCodigoColor(idFamiliaActual, codigo);
            pintarCodigosColor();
        }
    });

    /* ----- Productos ----- */
    $('#listaProductos').on('click', '.tarjeta-producto', function () {
        mostrarProducto($(this).data('id'));
    });

    $('#formularioNuevoProducto').on('submit', function (evento) {
        evento.preventDefault();
        var nombre = $('#campoNombreProducto').val().trim();
        if (nombre === '') {
            return;
        }
        var producto = crearProducto(idFamiliaActual, nombre);
        $('#campoNombreProducto').val('');
        // Vamos directos al producto para darle medidas y colores
        mostrarProducto(producto.id);
    });

    $('#botonRenombrarProducto').on('click', function () {
        var producto = buscarProducto(idProductoActual);
        var nombre = pedirNombre('Nuevo nombre del tipo:', producto.nombre);
        if (nombre !== null) {
            renombrarProducto(idProductoActual, nombre);
            mostrarProducto(idProductoActual);
        }
    });

    $('#botonBorrarProducto').on('click', function () {
        var producto = buscarProducto(idProductoActual);
        if (confirm('¿Borrar el tipo "' + producto.nombre + '" con todas sus medidas y colores?')) {
            borrarProducto(idProductoActual);
            mostrarFamilia(idFamiliaActual);
        }
    });

    $('#botonImprimirProducto').on('click', function () {
        imprimirPlantilla('producto-' + idProductoActual, 5);
    });

    /* ----- Medidas ----- */
    $('#listaMedidas').on('click', '.tarjeta-medida', function () {
        var medidas = obtenerMedidasDeProducto(idProductoActual);
        var posicion = $(this).data('posicion');
        mostrarColores(idProductoActual, medidas[posicion]);
    });

    $('#botonMedidaAnterior').on('click', function () {
        cambiarDeMedida(-1);
    });

    $('#botonMedidaSiguiente').on('click', function () {
        cambiarDeMedida(1);
    });

    // Al acabar la última medida se vuelve a la familia para elegir otro tipo
    $('#botonTerminarTipo').on('click', function () {
        mostrarFamilia(idFamiliaActual);
    });

    $('#botonRenombrarMedida').on('click', function () {
        var nombre = pedirNombre('Nuevo nombre de la medida:', medidaActual);
        if (nombre !== null) {
            renombrarMedida(idProductoActual, medidaActual, nombre);
            mostrarColores(idProductoActual, nombre);
        }
    });

    /* ----- Alta de medidas y colores ----- */
    $('#formularioNuevosArticulos').on('submit', function (evento) {
        evento.preventDefault();
        var medidas = separarPorComas($('#campoMedidas').val());
        var colores = separarPorComas($('#campoColores').val());

        if (medidas.length === 0 && colores.length === 0) {
            alert('Escribe al menos una medida o un color.');
            return;
        }

        var creados = crearArticulosCombinados(idProductoActual, medidas, colores);
        $('#campoMedidas').val('');
        $('#campoColores').val('');

        if (creados === 0) {
            alert('Esas combinaciones ya existían. No se ha creado nada nuevo.');
        }
        mostrarProducto(idProductoActual);
    });

    // "Falta un color": añade un color a la medida que se está contando
    $('#botonFaltaColor').on('click', function () {
        var texto = prompt('Escribe el color que falta:');
        if (texto === null) {
            return;
        }
        var colores = separarPorComas(texto);
        if (colores.length === 0) {
            return;
        }
        var creados = crearArticulosCombinados(idProductoActual, [medidaActual], colores);
        if (creados === 0) {
            alert('Ese color ya está en la lista.');
        }
        pintarColores();
    });

    /* ----- Recuento ----- */

    $('#listaArticulos').on('click', '.boton-sumar', function () {
        sumarUno($(this).closest('.fila-articulo').data('id'));
    });

    $('#listaArticulos').on('click', '.boton-restar', function () {
        restarUno($(this).closest('.fila-articulo').data('id'));
    });

    // Al tocar el número se abre el teclado grande
    $('#listaArticulos').on('click', '.campo-cantidad', function () {
        abrirTeclado($(this).closest('.fila-articulo').data('id'));
    });

    $('#botonModoEdicion').on('click', function () {
        modoEdicion = !modoEdicion;
        pintarColores();
    });

    $('#listaArticulos').on('click', '.boton-quitar-articulo', function () {
        var id = $(this).closest('.fila-articulo').data('id');
        var articulo = buscarArticulo(id);
        var descripcion = (articulo.medida + ' ' + articulo.color).trim();
        if (confirm('¿Quitar "' + descripcion + '"?')) {
            borrarArticulo(id);
            // Si la medida se queda sin colores, volvemos a las medidas
            if (obtenerArticulosDeMedida(idProductoActual, medidaActual).length === 0) {
                mostrarProducto(idProductoActual);
            } else {
                pintarColores();
            }
        }
    });

    /* ----- Herramientas ----- */
    $('#botonImprimirPlantilla').on('click', function () {
        imprimirPlantilla($('#selectorPlantilla').val(), leerFilasEnBlanco());
    });

    $('#botonDescargarPlantillaCsv').on('click', function () {
        descargarPlantillaCsv($('#selectorPlantilla').val(), leerFilasEnBlanco());
    });

    $('#botonExportarRecuento').on('click', exportarRecuentoCsv);

    $('#botonNuevoInventario').on('click', function () {
        if (confirm('¿Empezar un inventario nuevo? Todas las cantidades quedarán "sin contar". Antes se descargará una copia de seguridad.')) {
            descargarCopiaSeguridad();
            empezarNuevoInventario();
            alert('Listo. Ya puedes empezar a contar.');
            mostrarInicio();
        }
    });

    $('#botonDescargarCopia').on('click', function () {
        descargarCopiaSeguridad();
        pintarTextoUltimaCopia();
    });

    $('#campoArchivoCopia').on('change', function () {
        var archivo = this.files[0];
        if (!archivo) {
            return;
        }
        leerCopiaSeguridad(archivo, function (datosCopia) {
            if (datosCopia === null) {
                alert('Ese archivo no es una copia válida.');
                return;
            }
            preguntarRestaurarCopia(datosCopia, archivo.name);
        });
        $(this).val('');
    });

    $('#botonCambiarCodigo').on('click', function () {
        var codigo = prompt('Escribe el código nuevo (4 cifras):');
        if (codigo === null) {
            return;
        }
        codigo = codigo.trim();
        if (!/^[0-9]{4}$/.test(codigo)) {
            alert('Tienen que ser 4 cifras.');
            return;
        }
        cambiarCodigoEncargado(codigo);
        alert('Código cambiado.');
    });

    $('#botonBorrarTodo').on('click', function () {
        if (confirm('¿Seguro que quieres borrar TODO? Esto no se puede deshacer.')) {
            if (confirm('Última confirmación: se borrarán todas las familias, productos y recuentos.')) {
                borrarTodosLosDatos();
                mostrarInicio();
            }
        }
    });
}

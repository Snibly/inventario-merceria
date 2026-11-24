/* ============================================================
   plantillas.js
   Plantillas imprimibles, exportación a CSV (Excel)
   y copias de seguridad.
   ============================================================ */


/* ---------- Utilidades ---------- */

// Evita que un texto con < > & rompa el HTML
function escaparHtml(texto) {
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Prepara un valor para una celda CSV (entre comillas)
function celdaCsv(valor) {
    if (valor === null || valor === undefined) {
        valor = '';
    }
    return '"' + String(valor).replace(/"/g, '""') + '"';
}

// Une una fila de valores con ";" (lo que usa Excel en español)
function filaCsv(listaValores) {
    var celdas = [];
    for (var i = 0; i < listaValores.length; i++) {
        celdas.push(celdaCsv(listaValores[i]));
    }
    return celdas.join(';');
}

// Fecha de hoy en formato día-mes-año, por ejemplo "25-12-2026"
function fechaHoy() {
    var hoy = new Date();
    var dia = String(hoy.getDate()).padStart(2, '0');
    var mes = String(hoy.getMonth() + 1).padStart(2, '0');
    return dia + '-' + mes + '-' + hoy.getFullYear();
}

function descargarArchivo(nombreArchivo, contenido, tipo) {
    var archivo = new Blob([contenido], { type: tipo });
    var enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(archivo);
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
}

function nombreParaArchivo(texto) {
    return texto.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/g, '-');
}


/* ---------- Qué artículos entran en la plantilla ----------
   seleccion es un texto: "todo", "familia-5" o "producto-8"  */

function obtenerFilasSeleccion(seleccion) {
    var articulos = [];

    if (seleccion === 'todo') {
        articulos = datos.articulos;
    } else if (seleccion.indexOf('familia-') === 0) {
        var idFamilia = Number(seleccion.replace('familia-', ''));
        articulos = obtenerArticulosDeFamilia(idFamilia);
    } else if (seleccion.indexOf('producto-') === 0) {
        var idProducto = Number(seleccion.replace('producto-', ''));
        articulos = obtenerArticulosDeProducto(idProducto);
    }

    // Cada fila lleva los nombres ya resueltos
    var filas = [];
    for (var i = 0; i < articulos.length; i++) {
        var producto = buscarProducto(articulos[i].idProducto);
        var familia = buscarFamilia(producto.idFamilia);
        filas.push({
            familia: familia.nombre,
            producto: producto.nombre,
            medida: articulos[i].medida,
            color: articulos[i].color,
            cantidad: articulos[i].cantidad,
            cantidadAnterior: articulos[i].cantidadAnterior
        });
    }
    return filas;
}

function tituloSeleccion(seleccion) {
    if (seleccion.indexOf('familia-') === 0) {
        return buscarFamilia(Number(seleccion.replace('familia-', ''))).nombre;
    }
    if (seleccion.indexOf('producto-') === 0) {
        return buscarProducto(Number(seleccion.replace('producto-', ''))).nombre;
    }
    return 'Todo el inventario';
}


/* ---------- Plantilla imprimible ---------- */

function imprimirPlantilla(seleccion, filasEnBlanco) {
    var filas = obtenerFilasSeleccion(seleccion);

    var html = '';
    html += '<h1>Inventario: ' + escaparHtml(tituloSeleccion(seleccion)) + '</h1>';
    html += '<p class="datos-hoja">Fecha: ____ / ____ / ________ &nbsp;&nbsp; Contado por: ______________________</p>';
    html += '<table class="tabla-plantilla">';
    html += '<thead><tr>';
    html += '<th>Familia</th><th>Producto</th><th>Medida</th><th>Color</th>';
    html += '<th class="columna-cantidad">Cantidad</th><th>Notas</th>';
    html += '</tr></thead><tbody>';

    for (var i = 0; i < filas.length; i++) {
        html += '<tr>';
        html += '<td>' + escaparHtml(filas[i].familia) + '</td>';
        html += '<td>' + escaparHtml(filas[i].producto) + '</td>';
        html += '<td>' + escaparHtml(filas[i].medida) + '</td>';
        html += '<td>' + escaparHtml(filas[i].color) + '</td>';
        html += '<td></td><td></td>';
        html += '</tr>';
    }

    for (var j = 0; j < filasEnBlanco; j++) {
        html += '<tr class="fila-blanco"><td></td><td></td><td></td><td></td><td></td><td></td></tr>';
    }

    html += '</tbody></table>';

    $('#zonaImpresion').html(html);
    window.print();
}

function descargarPlantillaCsv(seleccion, filasEnBlanco) {
    var filas = obtenerFilasSeleccion(seleccion);
    var lineas = [];
    lineas.push(filaCsv(['Familia', 'Producto', 'Medida', 'Color', 'Cantidad', 'Notas']));

    for (var i = 0; i < filas.length; i++) {
        lineas.push(filaCsv([filas[i].familia, filas[i].producto, filas[i].medida, filas[i].color, '', '']));
    }
    for (var j = 0; j < filasEnBlanco; j++) {
        lineas.push(filaCsv(['', '', '', '', '', '']));
    }

    // "﻿" al principio hace que Excel lea bien las tildes y la ñ
    var contenido = '﻿' + lineas.join('\r\n');
    var nombre = 'plantilla-' + nombreParaArchivo(tituloSeleccion(seleccion)) + '.csv';
    descargarArchivo(nombre, contenido, 'text/csv;charset=utf-8');
}


/* ---------- Resultado del inventario ---------- */

function exportarRecuentoCsv() {
    var filas = obtenerFilasSeleccion('todo');
    var lineas = [];
    lineas.push(filaCsv(['Familia', 'Producto', 'Medida', 'Color', 'Cantidad', 'Cantidad anterior', 'Diferencia']));

    for (var i = 0; i < filas.length; i++) {
        var cantidad = filas[i].cantidad;
        var anterior = filas[i].cantidadAnterior;
        var diferencia = '';

        if (cantidad === null) {
            cantidad = 'SIN CONTAR';
        } else if (anterior !== null) {
            diferencia = cantidad - anterior;
        }
        if (anterior === null) {
            anterior = '';
        }

        lineas.push(filaCsv([filas[i].familia, filas[i].producto, filas[i].medida, filas[i].color,
            cantidad, anterior, diferencia]));
    }

    var contenido = '﻿' + lineas.join('\r\n');
    descargarArchivo('inventario-' + fechaHoy() + '.csv', contenido, 'text/csv;charset=utf-8');
}


/* ---------- Copia de seguridad ---------- */

function descargarCopiaSeguridad() {
    registrarCopiaHecha();
    var contenido = JSON.stringify(datos, null, 2);
    descargarArchivo('copia-inventario-' + fechaHoy() + '.json', contenido, 'application/json');
}

// Lee el archivo elegido SIN cambiar nada todavía.
// Cuando termina llama a funcionAlTerminar(datosCopia), o a
// funcionAlTerminar(null) si el archivo no es una copia válida.
function leerCopiaSeguridad(archivo, funcionAlTerminar) {
    var lector = new FileReader();
    lector.onload = function () {
        var datosCopia = null;
        try {
            datosCopia = JSON.parse(lector.result);
        } catch (error) {
            datosCopia = null;
        }
        if (!esCopiaValida(datosCopia)) {
            datosCopia = null;
        }
        funcionAlTerminar(datosCopia);
    };
    lector.readAsText(archivo);
}

// Fecha y hora legibles a partir de un número de milisegundos:
// "24-11-2026 a las 22:51"
function formatearFechaHora(milisegundos) {
    var fecha = new Date(milisegundos);
    var dia = String(fecha.getDate()).padStart(2, '0');
    var mes = String(fecha.getMonth() + 1).padStart(2, '0');
    var hora = String(fecha.getHours()).padStart(2, '0');
    var minutos = String(fecha.getMinutes()).padStart(2, '0');
    return dia + '-' + mes + '-' + fecha.getFullYear() + ' a las ' + hora + ':' + minutos;
}

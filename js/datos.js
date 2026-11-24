/* ============================================================
   datos.js
   Todo lo relacionado con guardar y leer la información.
   Los datos se guardan en el navegador de la tablet (localStorage).

   Estructura:
     familias:  { id, nombre }
     productos: { id, idFamilia, nombre }
     articulos: { id, idProducto, medida, color,
                  cantidad, cantidadAnterior }
     ajustes:   { codigoEncargado, fechaUltimaCopia }
   cantidad = null significa "todavía sin contar".
   ============================================================ */

var CLAVE_ALMACEN = 'inventarioMerceria';
var CODIGO_INICIAL = '1234';

var datos = datosVacios();

function datosVacios() {
    return {
        familias: [],
        productos: [],
        articulos: [],
        siguienteId: 1,
        ajustes: { codigoEncargado: CODIGO_INICIAL, fechaUltimaCopia: null }
    };
}

// Si los datos son de una versión anterior y les falta algo, lo añadimos
function completarDatos() {
    if (!datos.ajustes) {
        datos.ajustes = { codigoEncargado: CODIGO_INICIAL };
    }
    if (datos.ajustes.fechaUltimaCopia === undefined) {
        datos.ajustes.fechaUltimaCopia = null;
    }
}


/* ---------- Guardar y cargar ---------- */

function cargarDatos() {
    try {
        var texto = localStorage.getItem(CLAVE_ALMACEN);
        if (texto) {
            datos = JSON.parse(texto);
        }
        completarDatos();
    } catch (error) {
        alert('No se han podido leer los datos guardados.');
    }
}

// Pide al navegador que estos datos sean permanentes: así no los borra
// por su cuenta aunque la tablet se quede con poco espacio.
// (En una app instalada desde Chrome se concede automáticamente.)
function pedirAlmacenamientoPermanente() {
    if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist();
    }
}

function guardarDatos() {
    try {
        localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(datos));
    } catch (error) {
        alert('¡Atención! No se ha podido guardar. Descarga una copia de seguridad.');
    }
}

function nuevoId() {
    var id = datos.siguienteId;
    datos.siguienteId = datos.siguienteId + 1;
    return id;
}

// Busca en una lista el elemento con ese id
function buscarPorId(lista, id) {
    for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === id) {
            return lista[i];
        }
    }
    return null;
}


/* ---------- Familias ---------- */

function crearFamilia(nombre) {
    var familia = { id: nuevoId(), nombre: nombre };
    datos.familias.push(familia);
    guardarDatos();
    return familia;
}

function buscarFamilia(id) {
    return buscarPorId(datos.familias, id);
}

function renombrarFamilia(id, nombreNuevo) {
    var familia = buscarFamilia(id);
    familia.nombre = nombreNuevo;
    guardarDatos();
}

// Borra la familia y todo lo que tiene dentro
function borrarFamilia(id) {
    var productos = obtenerProductosDeFamilia(id);
    for (var i = 0; i < productos.length; i++) {
        quitarArticulosDeProducto(productos[i].id);
    }
    datos.productos = datos.productos.filter(function (producto) {
        return producto.idFamilia !== id;
    });
    datos.familias = datos.familias.filter(function (familia) {
        return familia.id !== id;
    });
    guardarDatos();
}


/* ---------- Productos ---------- */

function crearProducto(idFamilia, nombre) {
    var producto = { id: nuevoId(), idFamilia: idFamilia, nombre: nombre };
    datos.productos.push(producto);
    guardarDatos();
    return producto;
}

function buscarProducto(id) {
    return buscarPorId(datos.productos, id);
}

function obtenerProductosDeFamilia(idFamilia) {
    return datos.productos.filter(function (producto) {
        return producto.idFamilia === idFamilia;
    });
}

function renombrarProducto(id, nombreNuevo) {
    var producto = buscarProducto(id);
    producto.nombre = nombreNuevo;
    guardarDatos();
}

function borrarProducto(id) {
    quitarArticulosDeProducto(id);
    datos.productos = datos.productos.filter(function (producto) {
        return producto.id !== id;
    });
    guardarDatos();
}


/* ---------- Artículos (cada medida + color) ---------- */

function buscarArticulo(id) {
    return buscarPorId(datos.articulos, id);
}

function obtenerArticulosDeProducto(idProducto) {
    return datos.articulos.filter(function (articulo) {
        return articulo.idProducto === idProducto;
    });
}

function obtenerArticulosDeFamilia(idFamilia) {
    var resultado = [];
    var productos = obtenerProductosDeFamilia(idFamilia);
    for (var i = 0; i < productos.length; i++) {
        resultado = resultado.concat(obtenerArticulosDeProducto(productos[i].id));
    }
    return resultado;
}

// Comprueba si ya existe esa medida + color en el producto
function existeArticulo(idProducto, medida, color) {
    var articulos = obtenerArticulosDeProducto(idProducto);
    for (var i = 0; i < articulos.length; i++) {
        var mismaMedida = articulos[i].medida.toLowerCase() === medida.toLowerCase();
        var mismoColor = articulos[i].color.toLowerCase() === color.toLowerCase();
        if (mismaMedida && mismoColor) {
            return true;
        }
    }
    return false;
}

// Crea un artículo por cada medida combinada con cada color.
// Devuelve cuántos artículos nuevos se han creado.
function crearArticulosCombinados(idProducto, listaMedidas, listaColores) {
    // Si una lista viene vacía, usamos "" para que la combinación funcione igual
    if (listaMedidas.length === 0) {
        listaMedidas = [''];
    }
    if (listaColores.length === 0) {
        listaColores = [''];
    }

    var creados = 0;
    for (var m = 0; m < listaMedidas.length; m++) {
        for (var c = 0; c < listaColores.length; c++) {
            var medida = listaMedidas[m];
            var color = listaColores[c];
            if (!existeArticulo(idProducto, medida, color)) {
                datos.articulos.push({
                    id: nuevoId(),
                    idProducto: idProducto,
                    medida: medida,
                    color: color,
                    cantidad: null,
                    cantidadAnterior: null
                });
                creados = creados + 1;
            }
        }
    }
    guardarDatos();
    return creados;
}

// Lista de medidas distintas de un producto, en el orden en que se crearon
function obtenerMedidasDeProducto(idProducto) {
    var medidas = [];
    var articulos = obtenerArticulosDeProducto(idProducto);
    for (var i = 0; i < articulos.length; i++) {
        if (medidas.indexOf(articulos[i].medida) === -1) {
            medidas.push(articulos[i].medida);
        }
    }
    return medidas;
}

// Artículos (colores) de una medida concreta de un producto
function obtenerArticulosDeMedida(idProducto, medida) {
    return obtenerArticulosDeProducto(idProducto).filter(function (articulo) {
        return articulo.medida === medida;
    });
}

function renombrarMedida(idProducto, medidaVieja, medidaNueva) {
    var articulos = obtenerArticulosDeMedida(idProducto, medidaVieja);
    for (var i = 0; i < articulos.length; i++) {
        articulos[i].medida = medidaNueva;
    }
    guardarDatos();
}

function borrarArticulo(id) {
    datos.articulos = datos.articulos.filter(function (articulo) {
        return articulo.id !== id;
    });
    guardarDatos();
}

function quitarArticulosDeProducto(idProducto) {
    datos.articulos = datos.articulos.filter(function (articulo) {
        return articulo.idProducto !== idProducto;
    });
}


/* ---------- Cantidades ---------- */

// cantidad puede ser un número o null (sin contar)
function ponerCantidad(idArticulo, cantidad) {
    var articulo = buscarArticulo(idArticulo);
    articulo.cantidad = cantidad;
    guardarDatos();
}

// true si TODOS los artículos de la lista están contados (y hay alguno)
function estaTodoContado(listaArticulos) {
    var progreso = calcularProgreso(listaArticulos);
    return progreso.total > 0 && progreso.contados === progreso.total;
}

// Cuenta cuántos artículos de una lista ya están contados
function calcularProgreso(listaArticulos) {
    var contados = 0;
    for (var i = 0; i < listaArticulos.length; i++) {
        if (listaArticulos[i].cantidad !== null) {
            contados = contados + 1;
        }
    }
    return { total: listaArticulos.length, contados: contados };
}

// Guarda lo contado como "anterior" y deja todo sin contar
function empezarNuevoInventario() {
    for (var i = 0; i < datos.articulos.length; i++) {
        var articulo = datos.articulos[i];
        if (articulo.cantidad !== null) {
            articulo.cantidadAnterior = articulo.cantidad;
        }
        articulo.cantidad = null;
    }
    guardarDatos();
}

// Borra familias, productos y recuentos, pero conserva el código del encargado
function borrarTodosLosDatos() {
    var codigo = datos.ajustes.codigoEncargado;
    datos = datosVacios();
    datos.ajustes.codigoEncargado = codigo;
    guardarDatos();
}

// Comprueba que un objeto tiene la forma de una copia de esta app
function esCopiaValida(datosCopia) {
    return datosCopia && datosCopia.familias && datosCopia.productos && datosCopia.articulos;
}

// Resumen de un conjunto de datos (los actuales o los de una copia):
// "4 familias, 120 artículos, 80 contados"
function resumirDatos(conjunto) {
    var progreso = calcularProgreso(conjunto.articulos);
    return escribirCantidad(conjunto.familias.length, 'familia', 'familias') + ', ' +
           escribirCantidad(progreso.total, 'artículo', 'artículos') + ', ' +
           escribirCantidad(progreso.contados, 'contado', 'contados');
}

// escribirCantidad(1, 'familia', 'familias') -> "1 familia"
// escribirCantidad(3, 'familia', 'familias') -> "3 familias"
function escribirCantidad(numero, singular, plural) {
    if (numero === 1) {
        return numero + ' ' + singular;
    }
    return numero + ' ' + plural;
}

// Sustituye todos los datos por los de una copia de seguridad
function restaurarDatos(datosCopia) {
    if (!esCopiaValida(datosCopia)) {
        return false;
    }
    datos = datosCopia;
    completarDatos();
    guardarDatos();
    return true;
}


/* ---------- Código del encargado ---------- */

function comprobarCodigo(codigo) {
    return codigo === datos.ajustes.codigoEncargado;
}

function cambiarCodigoEncargado(codigoNuevo) {
    datos.ajustes.codigoEncargado = codigoNuevo;
    guardarDatos();
}


/* ---------- Fecha de la última copia de seguridad ---------- */

function registrarCopiaHecha() {
    datos.ajustes.fechaUltimaCopia = Date.now();
    guardarDatos();
}

// Días que han pasado desde la última copia (null si nunca se ha hecho)
function diasDesdeUltimaCopia() {
    if (datos.ajustes.fechaUltimaCopia === null) {
        return null;
    }
    var milisegundosDia = 24 * 60 * 60 * 1000;
    return Math.floor((Date.now() - datos.ajustes.fechaUltimaCopia) / milisegundosDia);
}

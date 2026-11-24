/* ============================================================
   colores.js
   Convierte el nombre de un color ("Azul marino", "Beige"...)
   en un código de color para pintar un circulito de muestra.

   Si un color no sale bien o falta alguno, añádelo a la lista.
   El nombre va en minúsculas y SIN tildes.
   ============================================================ */

var CODIGOS_COLOR = {
    'negro': '#111111',
    'blanco': '#ffffff',
    'crudo': '#f3ead7',
    'marfil': '#fffbe6',
    'hueso': '#e8e0cc',
    'beige': '#d9c3a0',
    'arena': '#d8c39a',
    'camel': '#c19a6b',
    'cuero': '#a0703c',
    'tabaco': '#7b5230',
    'marron': '#6d4c41',
    'chocolate': '#4e2f1f',
    'gris': '#9e9e9e',
    'gris claro': '#cfcfcf',
    'gris perla': '#d6d6d6',
    'gris oscuro': '#5a5a5a',
    'marengo': '#4a4a4f',
    'plata': '#c0c0c0',
    'plateado': '#c0c0c0',
    'oro': '#d4af37',
    'dorado': '#d4af37',
    'bronce': '#a97142',
    'cobre': '#b87333',
    'rojo': '#d32f2f',
    'granate': '#7b1f2a',
    'burdeos': '#6d1a36',
    'vino': '#722f37',
    'teja': '#b5523b',
    'coral': '#ff7f50',
    'salmon': '#fa8072',
    'naranja': '#fb8c00',
    'mostaza': '#d4a017',
    'amarillo': '#fdd835',
    'limon': '#f4ec5a',
    'rosa': '#f48fb1',
    'rosa palo': '#e8b7b7',
    'rosa bebe': '#f8c8dc',
    'fucsia': '#e91e8c',
    'lila': '#c39bd3',
    'malva': '#b784a7',
    'morado': '#6a1b9a',
    'violeta': '#8e24aa',
    'berenjena': '#4b1f3f',
    'azul': '#1e63c4',
    'azulon': '#1a3fa0',
    'azul claro': '#7fb3e6',
    'azul cielo': '#87ceeb',
    'azul bebe': '#b3d4f0',
    'celeste': '#81d4fa',
    'marino': '#1a2a52',
    'azul marino': '#1a2a52',
    'turquesa': '#26c6da',
    'verde': '#43a047',
    'verde claro': '#9ccc65',
    'verde botella': '#1b5e20',
    'verde agua': '#80cbc4',
    'menta': '#98e0c0',
    'pistacho': '#b5d66b',
    'oliva': '#6b7c32',
    'kaki': '#8f8a5a',
    'caqui': '#8f8a5a'
};

// Quita tildes y pasa a minúsculas: "Marrón" -> "marron"
function normalizarNombreColor(nombre) {
    return nombre.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .trim();
}

// Devuelve el código del color o null si no lo conoce.
// Si el nombre exacto no está, busca el nombre conocido más largo
// que aparezca dentro: "Rojo pasión" -> "rojo".
function obtenerCodigoColor(nombre) {
    var nombreLimpio = normalizarNombreColor(nombre);
    if (nombreLimpio === '') {
        return null;
    }
    if (CODIGOS_COLOR[nombreLimpio]) {
        return CODIGOS_COLOR[nombreLimpio];
    }

    var mejorCoincidencia = '';
    for (var conocido in CODIGOS_COLOR) {
        var aparece = (' ' + nombreLimpio + ' ').indexOf(' ' + conocido + ' ') !== -1;
        if (aparece && conocido.length > mejorCoincidencia.length) {
            mejorCoincidencia = conocido;
        }
    }
    if (mejorCoincidencia !== '') {
        return CODIGOS_COLOR[mejorCoincidencia];
    }
    return null;
}

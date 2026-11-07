// Modo grupal «¿Qué vemos hoy?»: dos personas cruzan sus plataformas y ven qué tienen en común, sin base de datos.
// La persona 1 arma un link con sus preferencias en la dirección (?qvh=…) y lo manda por WhatsApp; la persona 2 lo
// abre, marca las suyas y aparecen las coincidencias. Primero lo que ya está en «Mi lista» de alguna, después lo
// más popular. El link no lleva datos personales: país, ids de plataformas y géneros, y hasta 40 ids de TMDB.
//
// Sirve en el navegador (queda como `QueVemosHoy`) y en Node (`require('./queVemosHoy.js')`, para las pruebas).
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.QueVemosHoy = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const numeros = (a, max) => (Array.isArray(a) ? a.map(Number).filter(Number.isFinite).slice(0, max) : []);

  function aBase64Url(texto) {
    const b64 = typeof Buffer !== 'undefined'
      ? Buffer.from(texto, 'utf8').toString('base64')
      : btoa(unescape(encodeURIComponent(texto)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function deBase64Url(token) {
    const b64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const relleno = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    return typeof Buffer !== 'undefined'
      ? Buffer.from(relleno, 'base64').toString('utf8')
      : decodeURIComponent(escape(atob(relleno)));
  }

  /** Preferencias → token para `?qvh=`. */
  function codificar(p) {
    return aBase64Url(JSON.stringify({
      v: 1,
      pais: String(p.pais || 'AR').toUpperCase().slice(0, 2),
      p: numeros(p.plataformas, 15),
      g: numeros(p.generos, 10),
      corta: p.menosDeDosHoras ? 1 : 0,
      l: numeros(p.miLista, 40),
    }));
  }

  /** Token de `?qvh=` → preferencias, o null si no se puede leer. */
  function decodificar(token) {
    if (!token || typeof token !== 'string') return null;
    try {
      const d = JSON.parse(deBase64Url(token));
      if (!d || typeof d !== 'object') return null;
      return {
        pais: String(d.pais || 'AR').toUpperCase().slice(0, 2),
        plataformas: numeros(d.p, 15),
        generos: numeros(d.g, 10),
        menosDeDosHoras: d.corta === 1,
        miLista: numeros(d.l, 40),
      };
    } catch (_) {
      return null;
    }
  }

  /**
   * Coincidencias entre dos personas. `titulos`: [{ id, runtime?, genre_ids?, popularity?, plataformas: [ids] }]
   * con las plataformas de suscripción (flatrate/free/ads) del país. `juntos`: true si miran en el mismo sillón
   * (vale cualquiera de las dos cuentas); false si cada una mira desde su casa (tienen que compartir plataforma).
   * Si no comparten ninguna, usa todas para no devolver una lista vacía y lo avisa con `sinPlataformaEnComun`.
   */
  function coincidencias({ titulos, p1, p2, juntos = false, generos = [], menosDeDosHoras = false, lista1 = [], lista2 = [] }) {
    const a = new Set(p1.map(Number));
    const b = new Set(p2.map(Number));
    const comunes = new Set(juntos ? [...a, ...b] : [...a].filter((x) => b.has(x)));
    const sinPlataformaEnComun = comunes.size === 0;
    const validas = sinPlataformaEnComun ? new Set([...a, ...b]) : comunes;
    const gen = new Set(generos.map(Number));
    const l1 = new Set(lista1.map(Number));
    const l2 = new Set(lista2.map(Number));

    const lista = titulos
      .filter((t) => !(menosDeDosHoras && t.runtime && t.runtime > 120))
      .filter((t) => (t.plataformas || []).some((id) => validas.has(Number(id))))
      .filter((t) => gen.size === 0 || !t.genre_ids?.length || t.genre_ids.some((g) => gen.has(Number(g))))
      .map((t) => {
        const enLas2 = l1.has(t.id) && l2.has(t.id);
        const enAlguna = l1.has(t.id) || l2.has(t.id);
        return { ...t, enLas2Listas: enLas2, enAlgunaLista: enAlguna, prioridad: enLas2 ? 2 : enAlguna ? 1 : 0 };
      })
      .sort((x, y) => y.prioridad - x.prioridad || (y.popularity || 0) - (x.popularity || 0));
    return { titulos: lista, sinPlataformaEnComun };
  }

  return { codificar, decodificar, coincidencias };
});

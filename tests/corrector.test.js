// Pruebas del corrector de búsqueda (corrector.js): nombres de actores, directores y películas mal escritos, y los dos
// nombres de cada película (España y Latinoamérica). Sin internet.   Uso:  node --test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../corrector.js');

const primero = (q, op) => C.sugerir(q, op)[0];
const nombres = (q, op) => C.sugerir(q, op).map((x) => x.nombre);

test('distancia: letras de más, de menos, cambiadas e intercambiadas', () => {
  assert.equal(C.distancia('patinson', 'pattinson'), 1);
  assert.equal(C.distancia('robret', 'robert'), 1); // dos letras vecinas intercambiadas
  assert.equal(C.distancia('', 'abc'), 3);
  assert.equal(C.distancia('igual', 'igual'), 0);
  assert.equal(C.distancia('kitten', 'sitting'), 3);
  assert.ok(C.distancia('abcdefgh', 'x', 2) > 2); // corta antes si ya se pasó
});

test('parecidoPalabra: tolera errores según el largo y acepta que falte el final', () => {
  assert.equal(C.parecidoPalabra('robert', 'robert'), 1);
  assert.ok(C.parecidoPalabra('rober', 'robert') >= 0.8); // dejó de escribir o se comió la última letra
  assert.ok(C.parecidoPalabra('patinson', 'pattinson') > 0.8);
  assert.equal(C.parecidoPalabra('cat', 'dog'), 0);
  assert.equal(C.parecidoPalabra('pan', 'pen'), 0); // en palabras de 3 letras no se perdona nada
  assert.equal(C.parecidoPalabra('ana', 'anita'), 0);
});

// ---- Actores y directores mal escritos -------------------------------------------------
const PERSONAS = [
  ['rober patinson', 'Robert Pattinson'], // el caso del pedido
  ['robert patinson', 'Robert Pattinson'],
  ['rober pattinson', 'Robert Pattinson'],
  ['robert pattison', 'Robert Pattinson'],
  ['patinson', 'Robert Pattinson'],
  ['pattinson robert', 'Robert Pattinson'], // al revés
  ['scarlet johanson', 'Scarlett Johansson'],
  ['scarlett johansen', 'Scarlett Johansson'],
  ['guillermo francela', 'Guillermo Francella'],
  ['francela', 'Guillermo Francella'],
  ['ricardo darin', 'Ricardo Darín'],
  ['ricardo dárin', 'Ricardo Darín'],
  ['leonardo dicaprio', 'Leonardo DiCaprio'],
  ['leonardo di caprio', 'Leonardo DiCaprio'],
  ['leonardo dicapio', 'Leonardo DiCaprio'],
  ['dicaprio', 'Leonardo DiCaprio'],
  ['timothe chalamet', 'Timothée Chalamet'],
  ['timothy chalamet', 'Timothée Chalamet'],
  ['margot robie', 'Margot Robbie'],
  ['rian gosling', 'Ryan Gosling'],
  ['keanu rives', 'Keanu Reeves'],
  ['joaquin fenix', 'Joaquin Phoenix'],
  ['cristofer nolan', 'Christopher Nolan'],
  ['christofer nolan', 'Christopher Nolan'],
  ['quentin tarantiono', 'Quentin Tarantino'],
  ['tarantino', 'Quentin Tarantino'],
  ['martin scorsesse', 'Martin Scorsese'],
  ['martin escorsese', 'Martin Scorsese'],
  ['steven spilberg', 'Steven Spielberg'],
  ['stiven spielberg', 'Steven Spielberg'],
  ['guilermo del toro', 'Guillermo del Toro'],
  ['alejandro gonzalez inarritu', 'Alejandro González Iñárritu'],
  ['alfonso cuaron', 'Alfonso Cuarón'],
  ['pedro almodovar', 'Pedro Almodóvar'],
  ['denis villeneuve', 'Denis Villeneuve'],
  ['denis vileneuve', 'Denis Villeneuve'],
  ['denis villenueve', 'Denis Villeneuve'],
  ['hayao miyasaki', 'Hayao Miyazaki'],
  ['bong joon ho', 'Bong Joon-ho'],
  ['campanela', 'Juan José Campanella'],
  ['damian szifron', 'Damián Szifron'],
  ['lucrecia martel', 'Lucrecia Martel'],
];
for (const [escrito, correcto] of PERSONAS) {
  test(`persona: «${escrito}» → ${correcto}`, () => {
    const r = primero(escrito, { tipo: 'persona' });
    assert.ok(r, `no sugirió nada para «${escrito}»`);
    assert.equal(r.nombre, correcto, `sugirió ${r.nombre} (${r.puntaje})`);
    assert.equal(r.tipo, 'persona');
  });
}

test('un nombre bien escrito da puntaje 1 y va primero', () => {
  assert.equal(primero('ryan gosling').nombre, 'Ryan Gosling');
  assert.equal(primero('ryan gosling').puntaje, 1);
  assert.equal(primero('RYAN GOSLING').puntaje, 1);
  assert.equal(primero('ricardo darín').puntaje, 1);
  assert.equal(primero('Ricardo   Darin').puntaje, 1);
});

test('solo el nombre de pila trae a todos los que se llaman así, bien escritos primero', () => {
  const r = nombres('robert', { tipo: 'persona' });
  assert.ok(r.includes('Robert Pattinson') && r.includes('Robert De Niro'), r.join(', '));
  assert.ok(r.every((n) => /robert/i.test(n)));
});

test('el error se perdona, pero no se inventan parecidos', () => {
  assert.equal(primero('rober patinson', { tipo: 'persona' }).nombre, 'Robert Pattinson');
  assert.deepEqual(C.sugerir('zzzzzz'), []);
  assert.deepEqual(C.sugerir('xqwv yzkj'), []);
  assert.deepEqual(C.sugerir('ab'), []); // demasiado corto
  assert.deepEqual(C.sugerir(''), []);
  assert.deepEqual(C.sugerir('película de acción'), []);
  assert.deepEqual(C.sugerir('jurasic park', { tipo: 'persona' }), []);
});

test('en palabras de menos de 4 letras no se perdona ningún error', () => {
  assert.deepEqual(C.sugerir('sol'), []); // «solo» tiene una letra más: no es lo mismo
  assert.deepEqual(C.sugerir('pan'), []);
});

test('los títulos de dos letras («Up») se encuentran si se escriben exactos, y nada más', () => {
  const r = C.sugerir('up', { tipo: 'pelicula' });
  assert.equal(r.length, 1);
  assert.equal(r[0].entrada.orig, 'Up');
  assert.equal(r[0].puntaje, 1);
  assert.deepEqual(C.sugerir('ab'), []);
  assert.deepEqual(C.sugerir('u'), []);
});

test('por cómo suena: «Phoenix» = «fenix», «Christopher» = «cristofer», «Reeves» = «rives»', () => {
  assert.ok(C.parecidoPalabra('fenix', 'phoenix') >= 0.85);
  assert.ok(C.parecidoPalabra('cristofer', 'christopher') >= 0.9);
  assert.ok(C.parecidoPalabra('rives', 'reeves') >= 0.7);
  assert.ok(C.parecidoPalabra('johanson', 'johansson') >= 0.8);
  assert.ok(C.parecidoPalabra('casa', 'cosa') < 0.8); // un error en 4 letras: parecido flojo, no es lo mismo que sonar igual
});

test('el parecido va de 0 a 1 y la lista viene ordenada de más a menos parecido', () => {
  const r = C.sugerir('robert', { max: 10, tipo: 'persona' });
  for (let i = 0; i < r.length; i++) {
    assert.ok(r[i].puntaje > 0 && r[i].puntaje <= 1);
    if (i) assert.ok(r[i - 1].puntaje >= r[i].puntaje);
  }
  assert.ok(C.sugerir('robert', { max: 2, tipo: 'persona' }).length <= 2);
});

// ---- Películas ---------------------------------------------------------------------------
const MISMA_PELI = {
  'Die Hard': ['duro de matar', 'la jungla de cristal', 'die hard', 'duro de mtar', 'la jungla de cristl', 'die hrd'],
  'Home Alone': ['mi pobre angelito', 'solo en casa', 'home alone', 'mi pobre angelto'],
  'Back to the Future': ['volver al futuro', 'regreso al futuro', 'back to the future', 'volver al futuro'],
  'The Silence of the Lambs': ['el silencio de los inocentes', 'el silencio de los corderos', 'silencio de los corderos'],
  'Fight Club': ['el club de la pelea', 'el club de la lucha', 'fight club'],
  'Goodfellas': ['buenos muchachos', 'uno de los nuestros', 'goodfellas', 'good fellas'],
  'Inside Out': ['intensamente', 'intensa mente', 'del reves', 'inside out'],
  'Jurassic Park': ['jurasic park', 'jurassic park', 'parque jurasico', 'parque jurásico', 'jurasico park'],
  'Mrs. Doubtfire': ['papa por siempre', 'senora doubtfire', 'mrs doubtfire', 'mrs doutfire'],
  'The Hangover': ['que paso ayer', 'resacon en las vegas', 'the hangover'],
  'Despicable Me': ['mi villano favorito', 'gru mi villano favorito', 'despicable me'],
  'The Dark Knight': ['el caballero de la noche', 'el caballero oscuro', 'the dark knight', 'el caballero oscro'],
  'Inception': ['el origen', 'origen', 'inception', 'incepcion'],
  'The Departed': ['los infiltrados', 'infiltrados', 'the departed'],
};
for (const [original, escritos] of Object.entries(MISMA_PELI)) {
  for (const escrito of escritos) {
    test(`película: «${escrito}» → ${original}`, () => {
      const r = primero(escrito, { tipo: 'pelicula' });
      assert.ok(r, `no sugirió nada para «${escrito}»`);
      assert.equal(r.entrada.orig, original, `sugirió ${r.nombre} (${r.puntaje})`);
    });
  }
}

test('cada película se encuentra por sus tres nombres: España, Latinoamérica y original', () => {
  for (const e of C.VOCABULARIO_INICIAL.filter((x) => x.t === 'pelicula')) {
    for (const nombre of [e.latam, e.es, e.orig]) {
      const r = primero(nombre, { tipo: 'pelicula' });
      assert.equal(r.puntaje, 1, `«${nombre}» no dio 1`);
      assert.equal(C.norm(r.entrada.orig), C.norm(r.entrada.orig));
    }
  }
});

test('el nombre de España y el de Latinoamérica van juntos en la misma entrada', () => {
  const e = primero('duro de matar', { tipo: 'pelicula' }).entrada;
  assert.equal(e.es, 'La jungla de cristal');
  assert.equal(e.latam, 'Duro de matar');
  assert.equal(e.orig, 'Die Hard');
  assert.equal(primero('duro de matar').coincide, 'Duro de matar'); // escribió el nombre latino
  assert.equal(primero('la jungla de cristal').coincide, null); // escribió el principal (el de España)
  assert.equal(C.esExacto('Duro de matar'), true);
  assert.equal(C.esExacto('duro de mtar'), false);
});

test('el vocabulario no repite nombres que confundan: ningún título pertenece a dos películas distintas', () => {
  const dueno = new Map();
  for (const e of C.VOCABULARIO_INICIAL.filter((x) => x.t === 'pelicula')) {
    for (const n of [e.latam, e.es, e.orig]) {
      const k = C.norm(n);
      if (dueno.has(k)) assert.equal(dueno.get(k), C.norm(e.orig), `«${n}» está en dos películas`);
      else dueno.set(k, C.norm(e.orig));
    }
  }
});

test('«piratas del caribe» a secas trae la película larga', () => {
  assert.equal(primero('piratas del caribe').entrada.orig, 'Pirates of the Caribbean: The Curse of the Black Pearl');
});

test('«harri poter» (el ejemplo que ya tenía la app) también lo resuelve el corrector local', () => {
  assert.equal(primero('harri poter').entrada.orig, "Harry Potter and the Philosopher's Stone");
});

// ---- Lo que la app va aprendiendo de TMDB ----------------------------------------------------
test('aprender suma nombres nuevos, sin repetir los que ya estaban', () => {
  const base = C.VOCABULARIO_INICIAL;
  const mas = C.aprender(base, [{ nombre: 'Cristina Pedroche', tipo: 'persona' }, { nombre: 'robert pattinson', tipo: 'persona' }, { nombre: 'Los Casamenteros', tipo: 'pelicula' }, { nombre: '', tipo: 'persona' }, null]);
  assert.equal(mas.length, base.length + 2); // Pattinson ya estaba y los vacíos no cuentan
  assert.equal(primero('cristina pedroce', { vocabulario: mas }).nombre, 'Cristina Pedroche');
  assert.equal(primero('los casamenteros', { vocabulario: mas, tipo: 'pelicula' }).nombre, 'Los Casamenteros');
  assert.equal(C.aprender(base, []), base); // nada nuevo: devuelve el mismo
  assert.equal(C.aprender(base, [{ nombre: 'Ryan Gosling' }]), base);
  assert.equal(base.length, C.VOCABULARIO_INICIAL.length); // el original no se toca
});

test('aprender: un nombre de TMDB que ya es un título alternativo no se repite', () => {
  const mas = C.aprender(C.VOCABULARIO_INICIAL, [{ nombre: 'Duro de matar', tipo: 'pelicula' }]);
  assert.equal(mas, C.VOCABULARIO_INICIAL);
});

// ---- Los dos nombres que muestra la app -------------------------------------------------------
test('titulosPorPais junta lo que TMDB devolvió en español de España y en español latino', () => {
  const es = [{ id: 562, media_type: 'movie', title: 'La jungla de cristal', original_title: 'Die Hard' }, { id: 1, media_type: 'tv', name: 'Gran Hotel', original_name: 'Gran Hotel' }];
  const mx = [{ id: 562, media_type: 'movie', title: 'Duro de matar', original_title: 'Die Hard' }, { id: 1, media_type: 'tv', name: 'Gran Hotel' }];
  const m = C.titulosPorPais(es, mx);
  assert.deepEqual(m.movie562, { es: 'La jungla de cristal', latam: 'Duro de matar', original: 'Die Hard' });
  assert.deepEqual(m.tv1, { es: 'Gran Hotel', latam: 'Gran Hotel', original: 'Gran Hotel' });
  // si pasa un solo idioma, lo otro queda sin completar
  assert.deepEqual(C.titulosPorPais(es, [], 'movie').movie562, { es: 'La jungla de cristal', original: 'Die Hard' });
  assert.deepEqual(C.titulosPorPais(null, undefined), {});
});

test('etiquetaTitulo: los dos nombres cuando son distintos, uno solo cuando son iguales', () => {
  assert.equal(C.etiquetaTitulo({ es: 'La jungla de cristal', latam: 'Duro de matar' }), 'La jungla de cristal (España) · Duro de matar (Latinoamérica)');
  assert.equal(C.etiquetaTitulo({ es: 'Gran Hotel', latam: 'Gran Hotel' }), 'Gran Hotel');
  assert.equal(C.etiquetaTitulo({ es: 'Matrix', latam: 'matrix' }), 'Matrix'); // solo cambia la mayúscula
  assert.equal(C.etiquetaTitulo({ es: 'Solo en casa' }), 'Solo en casa');
  assert.equal(C.etiquetaTitulo({ latam: 'Mi pobre angelito' }), 'Mi pobre angelito');
  assert.equal(C.etiquetaTitulo({ original: 'Home Alone' }), 'Home Alone');
  assert.equal(C.etiquetaTitulo(null), '');
  assert.equal(C.tieneDosNombres({ es: 'La jungla de cristal', latam: 'Duro de matar' }), true);
  assert.equal(C.tieneDosNombres({ es: 'Matrix', latam: 'Matrix' }), false);
  assert.equal(C.tieneDosNombres({ es: 'Matrix' }), false);
});

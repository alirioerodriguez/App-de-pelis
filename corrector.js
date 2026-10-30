// Corrector de búsqueda de ¿Dónde la veo?: sugiere el nombre bien escrito de un actor, un director o una película
// cuando lo que escribió la persona tiene errores («rober patinson» → «Robert Pattinson», «scarlet johanson» →
// «Scarlett Johansson», «jurasic park» → «Parque Jurásico»), y junta los dos nombres de cada película: el de España y
// el de Latinoamérica («La jungla de cristal» / «Duro de matar»).
//
// Funciona sin internet y sin pedirle nada a nadie: compara contra un vocabulario propio (una lista inicial de nombres
// y títulos conocidos + todo lo que la app va viendo en TMDB, que se suma con `aprender`). Complementa, no reemplaza,
// al corrector de Wikipedia (api/sugerir.js) y a la búsqueda por similitud que ya hay en index.html.
//
// Sirve en el navegador (queda como `Corrector`) y en Node (`require('./corrector.js')`, para las pruebas).
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Corrector = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- Texto ----------
  // Sin tildes, mayúsculas ni signos; «Intensa-Mente» → «intensa mente»
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]+/g, ' ').trim();
  const palabras = (s) => norm(s).split(' ').filter(Boolean);
  const ARTICULOS = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'y', 'e', 'a', 'en', 'the', 'of', 'and']);

  /** Distancia de edición con intercambio de letras vecinas («patinson» ↔ «pattinson» = 1, «robret» ↔ «robert» = 1). */
  function distancia(a, b, tope = Infinity) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > tope) return tope + 1;
    const d = [];
    for (let i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const costo = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + costo);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
    return d[a.length][b.length];
  }

  /**
   * Cómo suena (para quien escribe en español nombres en inglés o en francés): «Phoenix» → «fenix», «Christopher» →
   * «kristofer», «Johansson» → «johanson», «Reeves» → «reves». Solo para comparar: nunca se muestra.
   */
  function fonetica(w) {
    return w
      .replace(/ph/g, 'f').replace(/ck/g, 'k').replace(/th/g, 't').replace(/ch(?=r)/g, 'k').replace(/oe/g, 'e')
      .replace(/qu(?=[ei])/g, 'k').replace(/c(?=[aoulrt])/g, 'k')
      .replace(/(.)\1+/g, '$1'); // letras dobles: «pattinson» = «patinson»
  }

  /** Un error de escritura en cada 4-5 letras, dos en 6-9, tres en las de 10 o más; nada en las de menos de 4. */
  function parecidoDirecto(q, c) {
    if (q === c) return 1;
    const min = Math.min(q.length, c.length), max = Math.max(q.length, c.length);
    // «rober» es el comienzo de «robert»: la persona dejó de escribir o se comió la última letra
    if (q.length >= 4 && c.length > q.length && c.startsWith(q)) return Math.max(0.8, 0.95 - 0.03 * (c.length - q.length));
    const permitido = min < 4 ? 0 : max >= 10 ? 3 : max >= 6 ? 2 : 1;
    const d = distancia(q, c, permitido);
    if (d > permitido) return 0;
    return Math.max(0.6, 1 - d / (max + 1) - 0.04 * d); // 1 error en 8 letras ≈ 0,84; en 5 letras ≈ 0,75
  }

  /** Cuánto se parecen dos palabras: 1 = iguales, 0 = nada que ver. Prueba tal cual y «por cómo suenan». */
  function parecidoPalabra(q, c) {
    const directo = parecidoDirecto(q, c);
    if (directo === 1) return 1;
    const fq = fonetica(q), fc = fonetica(c);
    return Math.max(directo, fq === fc && Math.min(q.length, c.length) >= 4 ? 0.9 : parecidoDirecto(fq, fc) * 0.97);
  }

  /** Cuánto se parece lo escrito (`q`) a un nombre o título (`t`). 0 = nada, 1 = igual. */
  function parecidoTexto(q, t) {
    const pq = palabras(q), pt = palabras(t);
    if (!pq.length || !pt.length) return 0;
    const cq = pq.join(''), ct = pt.join('');
    if (cq === ct) return 1;
    // las palabras importantes (sin artículos) son las que cuentan; si todo son artículos, valen todas
    const clave = (p) => { const k = p.filter((w) => !ARTICULOS.has(w)); return k.length ? k : p; };
    const kq = clave(pq), kt = clave(pt);
    // cada palabra escrita busca su mejor pareja en el nombre (en cualquier orden), sin repetir
    const usadas = new Set();
    let suma = 0, peso = 0;
    for (const w of kq) {
      let mejor = 0, idx = -1;
      kt.forEach((x, i) => { if (usadas.has(i)) return; const s = parecidoPalabra(w, x); if (s > mejor) { mejor = s; idx = i; } });
      if (idx >= 0) usadas.add(idx);
      suma += mejor * w.length;
      peso += w.length;
    }
    let puntaje = peso ? suma / peso : 0;
    // todo junto o todo separado: «cocotrips», «di caprio» ↔ «dicaprio»
    if (cq.length >= 5) puntaje = Math.max(puntaje, parecidoPalabra(cq, ct) * 0.97);
    // buscar solo el apellido («pattinson») es válido, pero un poco menos que el nombre completo
    const sinUsar = kt.length - usadas.size;
    if (sinUsar > 0) puntaje *= kq.length === 1 ? 0.92 : 1 - 0.08 * sinUsar;
    // una sola palabra escrita contra un título largo («harri» contra «harry potter y la piedra filosofal») no alcanza
    return Math.max(0, Math.min(1, puntaje));
  }

  // ---------- Vocabulario ----------
  // Entrada: { n: nombre principal, t: 'persona' | 'pelicula', a: [otros nombres], es?, latam?, orig? }
  const persona = (n) => ({ n, t: 'persona', a: [] });
  // [nombre en Latinoamérica, nombre en España, título original] (si es el mismo, se repite)
  const peli = (latam, es, orig) => {
    const nombres = [...new Set([latam, es, orig].filter(Boolean))];
    return { n: es || latam, t: 'pelicula', a: nombres.filter((x) => x !== (es || latam)), latam, es, orig };
  };

  const ACTORES = ['Robert Pattinson', 'Scarlett Johansson', 'Guillermo Francella', 'Ricardo Darín', 'Leonardo DiCaprio', 'Timothée Chalamet', 'Zendaya', 'Margot Robbie', 'Ryan Gosling', 'Emma Stone', 'Tom Hanks', 'Brad Pitt', 'Angelina Jolie', 'Jennifer Lawrence', 'Keanu Reeves', 'Gael García Bernal', 'Diego Luna', 'Penélope Cruz', 'Javier Bardem', 'Antonio Banderas', 'Salma Hayek', 'Pedro Pascal', 'Oscar Isaac', 'Natalie Portman', 'Anne Hathaway', 'Cillian Murphy', 'Christian Bale', 'Joaquin Phoenix', 'Denzel Washington', 'Morgan Freeman', 'Al Pacino', 'Robert De Niro', 'Meryl Streep', 'Cate Blanchett', 'Nicole Kidman', 'Kate Winslet', 'Tom Cruise', 'Johnny Depp', 'Will Smith', 'Dwayne Johnson', 'Chris Hemsworth', 'Chris Evans', 'Chris Pratt', 'Mark Ruffalo', 'Samuel L. Jackson', 'Harrison Ford', 'Sigourney Weaver', 'Ewan McGregor', 'Emilia Clarke', 'Kit Harington', 'Millie Bobby Brown', 'Florence Pugh', 'Jenna Ortega', 'Sydney Sweeney', 'Austin Butler', 'Tom Holland', 'Andrew Garfield', 'Benedict Cumberbatch', 'Daniel Radcliffe', 'Emma Watson', 'Rupert Grint', 'Hugh Jackman', 'Ryan Reynolds', 'Jake Gyllenhaal', 'Matthew McConaughey', 'Woody Harrelson', 'Viola Davis', "Lupita Nyong'o", 'Michael B. Jordan', 'Chadwick Boseman', 'Idris Elba', 'Jason Momoa', 'Henry Cavill', 'Gal Gadot', 'Eva Green', 'Léa Seydoux', 'Marion Cotillard', 'Juliette Binoche', 'Jean Reno', 'Vincent Cassel', 'Mads Mikkelsen', 'Willem Dafoe', 'Adam Driver', 'Saoirse Ronan', 'Dakota Johnson', 'Anya Taylor-Joy', 'Ana de Armas', 'Eiza González', 'Alfonso Herrera', 'Darío Grandinetti', 'Érica Rivas', 'Pablo Echarri', 'Leonardo Sbaraglia', 'Oscar Martínez', 'Luis Brandoni', 'Norma Aleandro', 'Mercedes Morán', 'Joaquín Furriel', 'Natalia Oreiro', 'Benicio del Toro', 'Gerard Butler', 'Michael Fassbender', 'Jessica Chastain', 'Charlize Theron', 'Julia Roberts', 'Sandra Bullock', 'Keira Knightley', 'Orlando Bloom', 'Elijah Wood', 'Ian McKellen', 'Patrick Stewart', 'Jodie Foster', 'Anthony Hopkins', 'Jack Nicholson', 'Clint Eastwood', 'Bruce Willis', 'Arnold Schwarzenegger', 'Sylvester Stallone', 'Jim Carrey', 'Robin Williams', 'Eddie Murphy', 'Adam Sandler', 'Ben Stiller', 'Steve Carell', 'Paul Rudd', 'Jonah Hill', 'Seth Rogen', 'Kristen Stewart', 'Jessica Alba', 'Jennifer Aniston', 'Jennifer Lopez', 'Shakira', 'Gwyneth Paltrow'];
  const DIRECTORES = ['Christopher Nolan', 'Quentin Tarantino', 'Martin Scorsese', 'Steven Spielberg', 'Francis Ford Coppola', 'Stanley Kubrick', 'Alfred Hitchcock', 'Guillermo del Toro', 'Alejandro González Iñárritu', 'Alfonso Cuarón', 'Pedro Almodóvar', 'Denis Villeneuve', 'Greta Gerwig', 'Wes Anderson', 'David Fincher', 'Ridley Scott', 'James Cameron', 'Peter Jackson', 'Tim Burton', 'Bong Joon-ho', 'Park Chan-wook', 'Hayao Miyazaki', 'Juan José Campanella', 'Damián Szifron', 'Lucrecia Martel', 'Pablo Trapero', 'Santiago Mitre', 'Gaspar Noé', 'Paolo Sorrentino', 'Yorgos Lanthimos', 'Jordan Peele', 'Ari Aster', 'Sofia Coppola', 'Kathryn Bigelow', 'Patty Jenkins', 'Taika Waititi', 'Edgar Wright', 'Guy Ritchie', 'Zack Snyder', 'Michael Bay', 'Robert Zemeckis', 'Ron Howard', 'Woody Allen', 'Spike Lee', 'Oliver Stone', 'Brian De Palma', 'Sam Mendes', 'Danny Boyle', 'Alejandro Amenábar', 'Isabel Coixet', 'Fernando Meirelles', 'Walter Salles', 'Luis Puenzo', 'Fabián Bielinsky', 'Gastón Duprat', 'Mariano Cohn', 'Lisandro Alonso', 'Paul Thomas Anderson', 'Coen', 'Joel Coen', 'Ethan Coen', 'Bryan Singer', 'George Lucas', 'Akira Kurosawa'];
  const PELICULAS = [
    // [Latinoamérica, España, original]
    peli('Duro de matar', 'La jungla de cristal', 'Die Hard'),
    peli('Mi pobre angelito', 'Solo en casa', 'Home Alone'),
    peli('Volver al futuro', 'Regreso al futuro', 'Back to the Future'),
    peli('Jurassic Park', 'Parque Jurásico', 'Jurassic Park'),
    peli('Papá por siempre', 'Señora Doubtfire', 'Mrs. Doubtfire'),
    peli('Ghost: La sombra del amor', 'Ghost (Más allá del amor)', 'Ghost'),
    peli('¿Qué pasó ayer?', 'Resacón en Las Vegas', 'The Hangover'),
    peli('Mujer bonita', 'Pretty Woman', 'Pretty Woman'),
    peli('Buenos muchachos', 'Uno de los nuestros', 'Goodfellas'),
    peli('El club de la pelea', 'El club de la lucha', 'Fight Club'),
    peli('El silencio de los inocentes', 'El silencio de los corderos', 'The Silence of the Lambs'),
    peli('Se7en: Pecados capitales', 'Seven', 'Se7en'),
    peli("Ocean's Eleven: Hagan sus apuestas", "Ocean's Eleven", "Ocean's Eleven"),
    peli('Monsters, Inc.', 'Monstruos, S.A.', 'Monsters, Inc.'),
    peli('Up: Una aventura de altura', 'Up', 'Up'),
    peli('Frozen: Una aventura congelada', 'Frozen: El reino del hielo', 'Frozen'),
    peli('Intensa-Mente', 'Del revés (Inside Out)', 'Inside Out'),
    peli('Mad Max: Furia en el camino', 'Mad Max: Furia en la carretera', 'Mad Max: Fury Road'),
    peli('Dumb and Dumber: Tonto y retonto', 'Dos tontos muy tontos', 'Dumb and Dumber'),
    peli('El joven manos de tijera', 'Eduardo Manostijeras', 'Edward Scissorhands'),
    peli('Sintonía de amor', 'Algo para recordar', 'Sleepless in Seattle'),
    peli('El gladiador', 'Gladiator', 'Gladiator'),
    peli('Los cazadores del arca perdida', 'En busca del arca perdida', 'Raiders of the Lost Ark'),
    peli('El caballero de la noche', 'El caballero oscuro', 'The Dark Knight'),
    peli('Batman inicia', 'Batman Begins', 'Batman Begins'),
    peli('El gran truco', 'El truco final (El prestigio)', 'The Prestige'),
    peli('El origen', 'Origen', 'Inception'),
    peli('La isla siniestra', 'Shutter Island', 'Shutter Island'),
    peli('Los infiltrados', 'Infiltrados', 'The Departed'),
    peli('Whiplash: Música y obsesión', 'Whiplash', 'Whiplash'),
    peli('La La Land: Una historia de amor', 'La ciudad de las estrellas (La La Land)', 'La La Land'),
    peli('Moana: Un mar de aventuras', 'Vaiana', 'Moana'),
    peli('Zootopia: Una nueva ciudad', 'Zootrópolis', 'Zootopia'),
    peli('Valiente', 'Indomable', 'Brave'),
    peli('La era de hielo', 'Ice Age (La edad de hielo)', 'Ice Age'),
    peli('Mi villano favorito', 'Gru, mi villano favorito', 'Despicable Me'),
    peli('Avengers: Endgame', 'Vengadores: Endgame', 'Avengers: Endgame'),
    peli('Piratas del Caribe: La maldición del Perla Negra', 'Piratas del Caribe: La maldición de la Perla Negra', 'Pirates of the Caribbean: The Curse of the Black Pearl'),
    peli('Harry Potter y la piedra filosofal', 'Harry Potter y la piedra filosofal', "Harry Potter and the Philosopher's Stone"),
    peli('Dirty Dancing: Baile caliente', 'Dirty Dancing', 'Dirty Dancing'),
    peli('Matrix', 'Matrix', 'The Matrix'),
    peli('El rey león', 'El rey león', 'The Lion King'),
    peli('Buscando a Nemo', 'Buscando a Nemo', 'Finding Nemo'),
    peli('El padrino', 'El padrino', 'The Godfather'),
    peli('Tiburón', 'Tiburón', 'Jaws'),
    peli('Titanic', 'Titanic', 'Titanic'),
    peli('Avatar', 'Avatar', 'Avatar'),
    peli('Interestelar', 'Interstellar', 'Interstellar'),
    peli('Oppenheimer', 'Oppenheimer', 'Oppenheimer'),
    peli('Barbie', 'Barbie', 'Barbie'),
    peli('Dune', 'Dune', 'Dune'),
    peli('Parásitos', 'Parásitos', 'Parasite'),
    peli('Coco', 'Coco', 'Coco'),
    peli('Encanto', 'Encanto', 'Encanto'),
    peli('Argentina, 1985', 'Argentina, 1985', 'Argentina, 1985'),
    peli('El secreto de sus ojos', 'El secreto de sus ojos', 'El secreto de sus ojos'),
    peli('Relatos salvajes', 'Relatos salvajes', 'Relatos salvajes'),
    peli('Nueve reinas', 'Nueve reinas', 'Nueve reinas'),
    peli('Amores perros', 'Amores perros', 'Amores perros'),
    peli('Y tu mamá también', 'Y tu mamá también', 'Y tu mamá también'),
    peli('El laberinto del fauno', 'El laberinto del fauno', "El laberinto del fauno"),
    peli('Todo sobre mi madre', 'Todo sobre mi madre', 'Todo sobre mi madre'),
    peli('La La Land', 'La La Land', 'La La Land'),
  ];

  const VOCABULARIO_INICIAL = [...ACTORES.map(persona), ...DIRECTORES.map(persona), ...PELICULAS];

  /** Todos los nombres con que se puede buscar una entrada. */
  const nombresDe = (e) => [e.n, ...(e.a || [])];

  /**
   * Nombres y títulos que se parecen a lo escrito, de más a menos parecido.
   * Cada uno: { nombre, tipo, puntaje, entrada, coincide } (`coincide` = el nombre alternativo con el que coincidió, si no fue el principal).
   * Una coincidencia exacta va primera con puntaje 1: quien llama decide si hay algo que corregir (ver `esExacto`).
   * Opciones: vocabulario, max (5), minimo (0,6), tipo ('persona' | 'pelicula': solo ese tipo).
   */
  function sugerir(consulta, opciones = {}) {
    const { vocabulario = VOCABULARIO_INICIAL, max = 5, minimo = 0.6, tipo = null } = opciones;
    const q = norm(consulta);
    if (q.replace(/ /g, '').length < 3) {
      // de menos de 3 letras solo se devuelve un título que se llame exactamente así («Up»)
      const exactos = vocabulario.filter((e) => (!tipo || e.t === tipo) && nombresDe(e).some((n) => norm(n) === q));
      return q ? exactos.slice(0, max).map((e) => ({ nombre: e.n, tipo: e.t, puntaje: 1, entrada: e, coincide: norm(e.n) === q ? null : nombresDe(e).find((n) => norm(n) === q) })) : [];
    }
    const out = [];
    for (const e of vocabulario) {
      if (tipo && e.t !== tipo) continue;
      let mejor = 0, con = null;
      for (const nombre of nombresDe(e)) {
        const p = parecidoTexto(consulta, nombre);
        if (p > mejor) { mejor = p; con = nombre; }
      }
      if (mejor >= minimo) out.push({ nombre: e.n, tipo: e.t, puntaje: Math.round(mejor * 1000) / 1000, entrada: e, coincide: con && con !== e.n ? con : null });
    }
    out.sort((a, b) => b.puntaje - a.puntaje || a.nombre.localeCompare(b.nombre));
    return out.slice(0, max);
  }

  /** ¿Lo escrito ya es un nombre exacto (sin tildes ni mayúsculas) del vocabulario? */
  function esExacto(consulta, vocabulario = VOCABULARIO_INICIAL) {
    const q = norm(consulta);
    return vocabulario.some((e) => nombresDe(e).some((n) => norm(n) === q));
  }

  /** Suma al vocabulario lo que la app ve en TMDB: [{ nombre, tipo }]. No repite ni pisa lo que ya estaba. */
  function aprender(vocabulario, vistos) {
    const ya = new Set(vocabulario.flatMap((e) => nombresDe(e).map(norm)));
    const nuevos = [];
    for (const v of vistos || []) {
      const k = norm(v && v.nombre);
      if (!k || ya.has(k)) continue;
      ya.add(k);
      nuevos.push({ n: v.nombre, t: v.tipo === 'pelicula' ? 'pelicula' : 'persona', a: [] });
    }
    return nuevos.length ? vocabulario.concat(nuevos) : vocabulario;
  }

  // ---------- Dos nombres: España y Latinoamérica ----------
  const tituloDe = (r) => (r && (r.title || r.name)) || '';

  /**
   * Junta lo que devolvió TMDB pidiendo los títulos en español de España (`es-ES`) y en español latino (`es-MX`):
   * { 'movie562': { es: 'La jungla de cristal', latam: 'Duro de matar', original: 'Die Hard' } }.
   * La clave es el tipo + el id (en `/search/multi` viene en media_type; si no, se pasa `tipo`).
   */
  function titulosPorPais(listaEs, listaLatam, tipo = null) {
    const mapa = {};
    const clave = (r) => `${r.media_type || tipo || 'movie'}${r.id}`;
    for (const r of listaEs || []) mapa[clave(r)] = { ...(mapa[clave(r)] || {}), es: tituloDe(r), original: r.original_title || r.original_name || '' };
    for (const r of listaLatam || []) mapa[clave(r)] = { ...(mapa[clave(r)] || {}), latam: tituloDe(r), original: (mapa[clave(r)] || {}).original || r.original_title || r.original_name || '' };
    return mapa;
  }

  /**
   * El texto para mostrar con los dos nombres: «La jungla de cristal (España) · Duro de matar (Latinoamérica)».
   * Si los dos son iguales (o falta uno) muestra un solo nombre, sin aclaración.
   */
  function etiquetaTitulo(t) {
    const es = (t && t.es || '').trim(), latam = (t && t.latam || '').trim();
    if (es && latam && norm(es) !== norm(latam)) return `${es} (España) · ${latam} (Latinoamérica)`;
    return es || latam || (t && t.original) || '';
  }

  /** ¿Los dos nombres son distintos? (para mostrar la segunda línea solo cuando hace falta) */
  const tieneDosNombres = (t) => !!(t && t.es && t.latam && norm(t.es) !== norm(t.latam));

  return { norm, distancia, parecidoPalabra, parecidoTexto, sugerir, esExacto, aprender, titulosPorPais, etiquetaTitulo, tieneDosNombres, VOCABULARIO_INICIAL };
});

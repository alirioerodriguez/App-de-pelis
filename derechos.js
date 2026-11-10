// Dónde se ve cada competencia, por país (sección Deportes de VeoMás). No hay una API pública de derechos de TV: la tabla es
// propia, se arma a mano con lo que publican medios y plataformas, y hay que revisarla cada temporada (los contratos cambian).
//
// Reglas:
//  - Una competencia o país SIN dato no se inventa: la página dice «no encontramos dónde se ve».
//  - Lo que se carga desde el 10/11/2026 lleva FUENTES (link y fecha en que se verificó). Lo anterior (fútbol, F1, NBA, MLB, NHL
//    y tenis) todavía no tiene fuente anotada: figura en `sinFuente()` para ir completándolo.
//  - Las claves de plataforma (disney, dgo, espn…) son las de `PLAT` en index.html.
//
// Sirve en el navegador (queda como `Derechos`) y en Node (`require('./derechos.js')`, para las pruebas).
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Derechos = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  const SUD = ['AR', 'BO', 'CL', 'CO', 'EC', 'PE', 'PY', 'UY', 'VE'];
  const LATAM = [...SUD, 'CR', 'CU', 'SV', 'GT', 'HN', 'NI', 'PA', 'PR', 'DO']; // sin México ni EE. UU.
  const en = (paises, plats) => Object.fromEntries(paises.map((cc) => [cc, plats]));

  const DERECHOS = {
    'arg.1': { AR: ['packfutbol', 'dgo'] },
    'mex.1': { MX: ['vix', 'prime', 'fox'] },
    'col.1': { CO: ['win'] },
    'chi.1': { CL: ['tntcl', 'max'] },
    'per.1': { PE: ['l1max'] },
    'uru.1': { UY: ['disney', 'antel'] },
    'conmebol.libertadores': { ...en(SUD, ['disney']), AR: ['disney', 'foxar', 'telefe'], MX: ['bein'] },
    'conmebol.sudamericana': { ...en(SUD, ['dgo', 'disney']) },
    'uefa.champions': { ...en(LATAM, ['disney']), AR: ['disney', 'foxar'], MX: ['max'] },
    'eng.1': { ...en(LATAM, ['disney']), MX: ['max', 'fox'] },
    'esp.1': { ...en(SUD, ['disney', 'dgo']), MX: ['sky'] },
    f1: { ...en(LATAM, ['disney', 'f1tv']), AR: ['disney', 'foxar', 'f1tv'], MX: ['sky', 'f1tv'] },
    nba: { ...en([...LATAM, 'MX'], ['disney', 'leaguepass']) },
    mlb: { ...en([...LATAM, 'MX'], ['disney', 'mlbtv']) },
    nhl: { ...en([...LATAM, 'MX'], ['disney']) },
    // tenis: los Grand Slams van por ESPN; el resto del circuito, según el torneo
    tenis: { ...en([...LATAM, 'MX'], ['disney']) },

    // ---- Desde el 10/11/2026, con fuente (ver FUENTES). Solo los países con dato. ----
    // Los Pumas en el Nations Championship: ESPN 2 y Disney+ Premium en Argentina. Otros países: sin datos.
    'rugby.test': { AR: ['espn', 'disney'] },
    // Super Rugby Américas: ESPN y Disney+ (Argentina: ESPN 4 y Disney+ Premium). Otros países: sin datos.
    'rugby.super': { AR: ['espn', 'disney'] },
    // Serie del Caribe 2026: México por ESPN, TVC Deportes y Disney+. El resto de los países, sin datos.
    'beisbol.caribe': { MX: ['espn', 'tvc', 'disney'] },
    // Rugby Championship: no se juega en 2026 (lo reemplaza el Nations Championship). Seis Naciones, Mundial, URC, Premiership,
    // Liga Dominicana y Clásico Mundial: sin fuente todavía.
  };

  /** Fuente y fecha de verificación de cada entrada nueva: { fecha: 'AAAA-MM-DD', url, nota? }. */
  const FUENTES = {
    'rugby.test': { fecha: '2026-11-10', url: 'https://www.lacapitalmdp.com/los-pumas-ante-gales-por-el-nations-championship/', nota: 'Los Pumas ante Gales: ESPN 2 y Disney+ Premium. Noviembre en Europa: confirmar cada fecha.' },
    'rugby.super': { fecha: '2026-11-10', url: 'https://espndeportes.espn.com/rugby/nota/_/id/16032732', nota: 'ESPN y Disney+ Premium en Argentina. La temporada 2026 ya terminó; la de 2027 no está anunciada.' },
    'beisbol.caribe': { fecha: '2026-11-10', url: 'https://espndeportes.espn.com/beisbol/nota/_/id/16248384/serie-del-caribe-2026-cuando-donde-como-ver-espn', nota: 'Dato de la edición 2026. La de 2027 es en Hermosillo (1 al 7 de febrero) y todavía no tiene transmisión anunciada.' },
  };

  /**
   * Deportes sin calendario en la app (ESPN no trae sus datos): solo se dice dónde suelen verse, con fuente y fecha.
   * `paises`: lista de códigos donde vale la fuente. `sin`: texto cuando no hay dato fijo.
   */
  const OTROS = [
    {
      id: 'voley', n: 'Vóley', ic: '🏐', torneo: 'Liga de Naciones (VNL)',
      donde: { paises: SUD, plats: ['dsports', 'vbtv'] },
      fuente: { fecha: '2026-11-10', url: 'https://www.lanacion.com.ar/deportes/voley/en-que-canal-pasan-argentina-vs-bulgaria-por-la-nations-league-2026-hoy-nid13062026/', nota: 'Sudamérica; en Brasil, SporTV 2. DSports también está dentro de DGO.' },
    },
    {
      id: 'ciclismo', n: 'Ciclismo', ic: '🚴', torneo: 'Tour de Francia, Tour Femenino y Vuelta',
      donde: { paises: LATAM, plats: ['espn', 'disney'] },
      fuente: { fecha: '2026-11-10', url: 'https://sportbusiness.com/news/espn-retains-tour-de-france-rights-in-latin-america-to-2027', nota: 'Latinoamérica y Caribe, contrato hasta 2027.' },
    },
    {
      id: 'boxeo', n: 'Boxeo', ic: '🥊', torneo: 'Grandes veladas',
      donde: { paises: [], plats: [] },
      sin: 'Las peleas grandes suelen estar en DAZN, pero cada velada puede salir por otro canal o por pago por evento: confirmalo antes.',
      fuente: { fecha: '2026-11-10', url: 'https://www.ringmagazine.com/news/golden-boy-promotions-dazn-reach-multi-year-extension-bAyTZE1a8IxmE7CAEkwtU', nota: 'DAZN tiene varias promotoras grandes en el mundo; para Latinoamérica no está verificado.' },
    },
  ];

  /** Dónde se ve un «otro deporte» en un país: { plats, sinDato }. */
  function dondeOtro(otro, pais) {
    if (otro.donde.paises.includes(pais)) return { plats: otro.donde.plats, sinDato: false };
    return { plats: [], sinDato: true };
  }

  /** Entradas de DERECHOS sin fuente anotada (para ir completándolas). */
  const sinFuente = () => Object.keys(DERECHOS).filter((k) => !FUENTES[k]);

  /** Fuentes de más de `meses` meses (o con fecha rota) al día `hoy` ('AAAA-MM-DD'): hay que volver a verificarlas. */
  function vencidas(hoy, meses = 9) {
    const limite = new Date(hoy + 'T00:00:00Z');
    limite.setUTCMonth(limite.getUTCMonth() - meses);
    const lista = [...Object.entries(FUENTES).map(([k, f]) => [k, f]), ...OTROS.map((o) => [o.id, o.fuente])];
    return lista.filter(([, f]) => !f || !/^\d{4}-\d{2}-\d{2}$/.test(f.fecha) || new Date(f.fecha + 'T00:00:00Z') < limite).map(([k]) => k);
  }

  return { SUD, LATAM, DERECHOS, FUENTES, OTROS, dondeOtro, sinFuente, vencidas };
});

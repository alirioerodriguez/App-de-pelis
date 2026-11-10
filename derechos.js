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
    // Liga Profesional (Clausura 2026): ESPN Premium y TNT Sports (Premium), según el partido. «dgo» sin fuente.
    'arg.1': { AR: ['packfutbol', 'dgo'] },
    // Liga MX (Apertura 2026): ViX Premium, FOX y Fox One, y algunos partidos por ESPN y Disney+, Canal 5 y TUDN (abierta). «prime»: no apareció en las fuentes.
    'mex.1': { MX: ['vix', 'prime', 'fox', 'disney'] },
    // Liga BetPlay: Win Sports+ en cable y Win Play en internet (con suscripción); algunos partidos, por YouTube.
    'col.1': { CO: ['win'] },
    // Campeonato 2026: TNT Sports Premium en cable y TNT Sports en HBO Max; un partido por fecha en Canal 13 (abierta).
    'chi.1': { CL: ['tntcl', 'max', 'canal13'] },
    // Liga 1 2026: L1 MAX (de 1190 Sports) en Movistar y otros operadores; un partido por fecha en abierta (Nativa, fuente menor).
    'per.1': { PE: ['l1max'] },
    'uru.1': { UY: ['disney', 'antel'] },
    // Libertadores 2026: ESPN y Disney+ en Sudamérica. En Argentina, «foxar» y «telefe»; en México, «bein»: sin fuente.
    'conmebol.libertadores': { ...en(SUD, ['espn', 'disney']), AR: ['espn', 'disney', 'foxar', 'telefe'], MX: ['bein'] },
    'conmebol.sudamericana': { ...en(SUD, ['dgo', 'disney']) },
    // Champions 2026-27: ESPN y Disney+ en Latinoamérica; en México, FOX y HBO Max (última temporada del acuerdo actual).
    // Desde 2027-28 se reparte entre ESPN/Disney+ y Paramount+. «foxar» en Argentina: sin fuente.
    'uefa.champions': { ...en(LATAM, ['espn', 'disney']), AR: ['espn', 'disney', 'foxar'], MX: ['fox', 'max'] },
    // Premier League 2026-27: ESPN y Disney+ en Sudamérica (licencia hasta 2027-28). México: las fuentes no coinciden (TNT Sports y FOX, o Sky y Canal 5).
    'eng.1': { ...en(LATAM, ['espn', 'disney']), MX: ['max', 'fox'] },
    // LaLiga 2026-27: ESPN (también en Disney+ Premium) y DSports se reparten los 380 partidos en Sudamérica. México: Sky Sports.
    'esp.1': { ...en(SUD, ['espn', 'disney', 'dsports', 'dgo']), MX: ['sky'] },
    // F1 2026: ESPN y Disney+ Premium en Latinoamérica (sin México ni Brasil), más F1 TV Pro. México: FOX o Sky según la fuente.
    f1: { ...en(LATAM, ['espn', 'disney', 'f1tv']), MX: ['fox', 'sky', 'f1tv'] },
    // NBA 2026-27: en México, cada partido sale por ESPN y Disney+, Prime Video o NBA League Pass. Resto de Latinoamérica: sin datos de esta temporada.
    nba: { ...en(LATAM, ['disney', 'leaguepass']), MX: ['espn', 'disney', 'prime', 'leaguepass'] },
    mlb: { ...en([...LATAM, 'MX'], ['disney', 'mlbtv']) },
    nhl: { ...en([...LATAM, 'MX'], ['disney']) },
    // tenis: los Grand Slams van por ESPN; el resto del circuito, según el torneo
    // Grand Slams 2026 en Latinoamérica: ESPN y Disney+ (Wimbledon y Roland Garros con fuente; US Open sin fuente de 2026).
    tenis: { ...en(LATAM, ['espn', 'disney']), MX: ['disney'] },

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
    'col.1': { fecha: '2026-11-10', url: 'https://www.publimetro.co/deportes/2026/07/24/regresa-el-fpc-partidos-horarios-y-donde-ver-la-fecha-1-de-la-liga-betplay/', nota: 'Win Sports+ en TV y Win Play en internet; la mayoría requiere suscripción. Cada partido puede cambiar de señal.' },
    'chi.1': { fecha: '2026-11-10', url: 'https://www.eldinamo.cl/deportes/2026/01/22/el-futbol-chileno-ira-por-tv-abierta-los-detalles-del-acuerdo-entre-canal-13-y-tnt-sports-por-la-temporada-2026/', nota: 'TNT Sports tiene la cobertura completa; Canal 13 pasa un partido por fecha, gratis.' },
    'per.1': { fecha: '2026-11-10', url: 'https://libero.pe/futbol-peruano/liga-1/2026/01/10/l1-max-cinco-operadores-transmitiran-todos-partidos-de-liga-1-2026-630360', nota: 'L1 MAX en Movistar, DirecTV, Claro, Win y otros operadores. La TV abierta (Nativa) viene de una fuente menor.' },
    tenis: { fecha: '2026-11-10', url: 'https://www.puntodebreak.com/2026/06/23/ver-wimbledon-2026-tv-horarios-favoritos-grand-slam-hierba', nota: 'Wimbledon y Roland Garros por ESPN y Disney+. Del US Open no hay fuente de 2026. El resto del circuito va según el torneo.', porConfirmar: true },
    'mex.1': { fecha: '2026-11-10', url: 'https://www.publimetro.com.mx/deportes/2026/07/16/donde-ver-todos-los-partidos-del-apertura-2026-en-la-liga-mx/', nota: 'Apertura 2026: cada jornada reparte partidos entre ViX, FOX y TV abierta. Prime Video no apareció en las fuentes.', porConfirmar: true },
    'eng.1': { fecha: '2026-11-10', url: 'https://es.digitaltrends.com/deportes/derechos-transmision-ligas-europeas-2026-27-america-latina/', nota: 'Sudamérica: ESPN y Disney+. México: las fuentes no coinciden, confirmalo.', porConfirmar: true },
    'esp.1': { fecha: '2026-11-10', url: 'https://www.insideworldfootball.com/2026/08/12/laliga-agrees-6-year-renewals-with-espn-and-dsports-in-south-america/', nota: 'Sudamérica: ESPN y DSports (renovado hasta 2031/32). México: Sky Sports, según una guía.' },
    nba: { fecha: '2026-11-10', url: 'https://www.excelsior.com.mx/deportes/nba-donde-ver-inicio-temporada-2026-2027', nota: 'Solo México tiene dato de esta temporada: cada partido sale por ESPN y Disney+, Prime Video o League Pass. El resto, sin confirmar.', porConfirmar: true },
    'arg.1': { fecha: '2026-11-10', url: 'https://www.canal26.com/futbol/liga-profesional-de-futbol/river-plate-vs-velez-dia-horario-canal-de-tv-y-como-ver-el-partido-del-torneo-clausura-2026/', nota: 'Clausura 2026: cada partido sale por ESPN Premium o TNT Sports (Premium): mirá cuál. DGO sin fuente.', porConfirmar: true },
    'conmebol.libertadores': { fecha: '2026-11-10', url: 'https://www.vanguardia.com/deportes/futbol/2026/04/06/donde-ver-la-copa-libertadores-2026-en-colombia-horarios-y-la-primera-fecha/', nota: 'ESPN y Disney+ en casi toda Latinoamérica. Fox Sports, Telefe y beIN: sin fuente.', porConfirmar: true },
    'uefa.champions': { fecha: '2026-11-10', url: 'https://es.digitaltrends.com/deportes/derechos-transmision-ligas-europeas-2026-27-america-latina/', nota: 'Temporada 2026-27. En México las fuentes no coinciden (FOX y HBO Max): confirmalo. Desde 2027-28 se reparte con Paramount+.', porConfirmar: true },
    f1: { fecha: '2026-11-10', url: 'https://www.lacapital.com.ar/ovacion/donde-ver-franco-colapinto-la-formula-1-confirmo-un-nuevo-acuerdo-tv-n10246154.html', nota: 'ESPN y Disney+ Premium en Latinoamérica (sin México ni Brasil). En México las fuentes no coinciden (FOX o Sky).', porConfirmar: true },
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

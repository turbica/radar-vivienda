# Radiografía del Ecosistema de Datos Abiertos en València y la Comunitat Valenciana

> Fuentes inexploradas y arquitectura para la innovación social recurrente.
> Informe generado con Gemini Deep Research el 17/10/2026 (conversación "Datos Públicos para Proyecto Social").
> Es el informe común a los tres proyectos: `radar-vivienda`, `escudo-hidrologico` y `monitor-vmp`.
> Gemini puede contener imprecisiones: verificar cifras, URLs e identificadores antes de usarlos.

## Petición original

Analizar todas las fuentes de datos públicas de Valencia y la Comunitat Valenciana que ahora mismo no se estén explotando en gran medida para ningún propósito público, y crear un proyecto social con esa información que se actualice de manera recurrente para que la acción social tenga continuidad en el futuro.

### Plan de investigación seguido

1. Identificar los portales oficiales de datos abiertos, estadística y transparencia del Ayuntamiento de Valencia, la Diputación de Valencia, la Generalitat Valenciana y otros organismos públicos regionales o universitarios.
2. Explorar los catálogos priorizando los conjuntos de datos con actualización recurrente, automatizada o en tiempo real.
3. Categorizar los datos de actualización frecuente en áreas de interés social: servicios sociales, accesibilidad, vivienda, empleo, salud pública, calidad ambiental, demografía y movilidad.
4. Analizar directorios de aplicaciones reutilizadoras, proyectos cívicos, concursos de datos abiertos e iniciativas de innovación social para determinar qué fuentes ya se explotan.
5. Contrastar el catálogo de datos recurrentes con las iniciativas existentes para detectar datasets infrautilizados o cruces inéditos con potencial para el bien público.
6. Formular propuestas de proyectos sociales continuos indicando: (a) fuentes exactas y periodicidad, (b) problemática social, (c) funcionamiento e impacto esperado a largo plazo.

---

## 1. Diagnóstico del ecosistema de datos públicos y sesgos de reutilización

El ecosistema de datos públicos de la Comunitat Valenciana y de la ciudad de València ha madurado técnica e institucionalmente, pero hay una profunda asimetría entre el volumen publicado y su aprovechamiento real para impacto social.

**Generalitat Valenciana.** El portal Dades Obertes (`dadesobertes.gva.es`), respaldado por la Ley 1/2022 de Transparencia y Buen Gobierno, tiene un catálogo de 1.285 conjuntos de datos en 22 áreas temáticas y ha duplicado sus visitas en tres años. Funciona sobre CKAN (Open Knowledge Foundation) con API nativa (`http://www.dadesobertes.gva.es/api/3/action`), gestionado por la Conselleria de Justicia, Transparencia y Participación. Incluye un mecanismo participativo para que la ciudadanía proponga qué información debe abrirse.

**Escala local y provincial**, tres nodos complementarios:

- **Ayuntamiento de València**: catálogo CKAN propio (`opendata.vlci.valencia.es`), conectado con la plataforma IoT de Telefónica (`opendata-valencia.iotplatform.telefonica.com`) y el nodo cartográfico municipal (`geoportal.valencia.es`). Formatos CSV, HTML, GeoJSON, KMZ y PBF. Se refuerza con la Oficina de Estadística municipal (datos demográficos y por barrios) y con la fundación pública Las Naves junto a la UPV, orientadas a la soberanía tecnológica y a la Misión Climática València 2030 (alianzas de cuádruple hélice: sector público, privado, academia y sociedad civil).
- **Diputación de Valencia**: proyecto *Connecta València: territorio turístico, inteligente y sostenible* (5 M€, cofinanciado con Red.es). Red propia de sensores IoT LPWAN y capas analíticas en Python y JavaScript para integrar a los municipios de la provincia.

**Qué se ha premiado (y qué no).** Los ganadores de los Premios de Datos Abiertos y Periodismo de Datos del Ayuntamiento (2023-2025) se concentran casi exclusivamente en movilidad urbana y calidad ambiental:

| Año | Puesto | Proyecto |
|---|---|---|
| 2025 | 1.º | PrediBisi: predicción de disponibilidad de bicicletas públicas |
| 2025 | 2.º | Influencia de la meteorología y la ubicación de estaciones en la medición de la calidad del aire |
| 2025 | 3.º | Análisis de los límites de 30 km/h en el 60 % de las calles |
| 2024 | 1.º | Valencia verde: mapeo ambiental de espacios verdes |
| 2024 | 2.º | Análisis geoespacial de pobreza energética residencial |
| 2024 | 3.º | Un parque al lado de casa: proximidad residencial a parques |
| 2023 | 1.º | Datos VP: periodismo de datos generalista |
| 2023 | 2.º | Equidad ambiental entre barrios mediante dosimetría pasiva |
| 2023 | 3.º | Evolución de emisiones del parque móvil por municipios de la Comunitat |

### Mapa de plataformas y nivel de explotación cívica

| Organismo | Plataforma / endpoint | Volumen / alcance | Formatos y actualización | Explotación cívica actual |
|---|---|---|---|---|
| Generalitat Valenciana (GVA) | Dades Obertes (`dadesobertes.gva.es`) | 1.285 datasets en 22 áreas | API CKAN (`/api/3/action`), CSV, descarga directa dinámica | Media en medio ambiente y parque móvil; muy baja en registros vivos de turismo y territorio |
| Ayuntamiento de València | Open Data (`opendata.vlci.valencia.es`) + nodo IoT Telefónica | Estándar municipal de 80 datasets + sensores urbanos | API CKAN, GeoJSON, PBF, KMZ, CSV, HTML | Muy alta en movilidad (bici, tráfico) y zonas verdes; casi nula en ayudas sociales, avisos, agua y facturas |
| Ayuntamiento de València (SIG y Estadística) | Geoportal (`geoportal.valencia.es`) + Oficina de Estadística | 34 capas SIG base y microdatos demográficos por barrios | GeoJSON, KMZ, PBF y tablas estadísticas | Usado como capa base, infrautilizado en cruces de vulnerabilidad social dinámica |
| Diputación de Valencia (Dival) | Connecta València | Red provincial multimunicipal (5 M€) | Sensores IoT LPWAN, librerías abiertas Python y JS | Muy baja; solo eventos puntuales como DiValHack |
| Confederación Hidrográfica del Júcar (CHJ) | SAIH (`saih.chj.es`) | Estaciones de aforo (EA) y embalses de las cuencas valencianas | Telemetría web en tiempo real (cada 5 min) con umbrales de alerta | Inexplorado por proyectos sociales pese a su criticidad climática |

**Desconexión estructural.** Comparando con la guía de los 80 conjuntos de datos esenciales de la Red de Transparencia y Participación Ciudadana (FEMP) y con los repositorios sectoriales de la Generalitat y del Estado: mientras movilidad y arbolado se consumen de forma intensiva, datasets con potencial directo sobre la desigualdad carecen de plataformas ciudadanas que los auditen:

- concesión de ayudas sociales
- avisos ciudadanos de incidencias en la vía pública
- facturación municipal
- calidad del agua de consumo humano
- siniestralidad desglosada de vehículos de movilidad personal (VMP)
- registro vivo de viviendas de uso turístico
- telemetría hidrológica en tiempo real

---

## 2. Nichos de datos públicos inexplorados con alto potencial social

Criterios: relevancia social del problema y frecuencia de actualización en origen. Tres vectores cumplen ambos y hoy operan en silos desconectados de la sociedad civil.

### 2.1 Metabolismo social, presión residencial y gentrificación en tiempo real

- **Registro dinámico de viviendas de uso turístico** (`tur-gestur-vt`) en Dades Obertes GVA, con enlace persistente CSV (`lista-de-viviendas-turisticas.csv`) que refleja las licencias vigentes en la fecha de consulta.
- Se suele descargar de forma aislada para reportajes puntuales. Su valor real está en capturar **series temporales con instantáneas recurrentes** para cuantificar altas, bajas y velocidad de concentración por código postal o sección censal.
- **Cruce de segundo y tercer orden** con el estándar de 80 datasets municipales y la Oficina de Estadística:
  - Censo de empresas y agentes económicos (dataset n.º 20)
  - Ayudas sociales otorgadas a personas y organizaciones (n.º 12)
  - Avisos sobre incidencias en la vía pública (n.º 11)
  - Facturas municipales (n.º 40)
- Permite modelizar el metabolismo socioeconómico de cada barrio: cómo el aumento mensual de pisos turísticos desplaza al comercio de proximidad, aumenta la demanda de ayudas sociales por presión habitacional y altera la equidad del gasto en mantenimiento (facturas frente a avisos de deterioro).

### 2.2 Resiliencia hídrica, climática y vulnerabilidad territorial

- El territorio valenciano oscila entre estrés hídrico prolongado e inundaciones súbitas, pero la reutilización ambiental se ha limitado a contaminación atmosférica y parques.
- **SAIH Júcar** (`saih.chj.es`): telemetría cada 5 minutos de caudales (m³/s) en estaciones de aforo y salidas de embalses en las cuencas del Turia, Júcar, Magro, Palancia, Mijares, Vinalopó y Rambla de la Viuda. Expone también:
  - caudales máximos de avenida para periodo de retorno de 500 años (QT500)
  - caudales mínimos ecológicos según escenario de normalidad o sequía
  - tres niveles escalonados de alerta hidrológica por estación
- **Cruce propuesto** con:
  - **PATRICOVA** (Plan de Acción Territorial sobre Prevención del Riesgo de Inundación): 6 niveles de peligrosidad probabilística más un 7.º de peligrosidad geomorfológica
  - **Equipamientos municipales** (n.º 37): centros educativos, centros de día, servicios sociales, etc.
  - **Calidad del agua para el consumo humano** (n.º 16)
- **Avenidas**: cuando estaciones de cabecera del Magro (Requena, embalse de Forata, Macastre) o del Turia (Zagra, salida de Loriguilla) superan sus umbrales iniciales (entre 5 y 30 m³/s), un sistema automatizado puede alertar a residencias, colegios o colectivos vulnerables en zonas de peligrosidad 1 a 7 aguas abajo antes de que la crecida llegue a puntos críticos de llanura como Guadassuar.
- **Estiaje**: con caudales como el Vinalopó en Sax (0,01 m³/s), el Palancia en Jérica (0,03 m³/s) o el Magro en Requena (0,07 m³/s), por debajo de los mínimos ecológicos de sequía, el cruce con calidad del agua potable y Áreas empresariales o industriales (n.º 10) permite vigilar la degradación del abastecimiento y proteger la salud pública rural y agrícola.

### 2.3 Cohesión territorial, siniestralidad vial y brecha rural-urbana

- La Diputación diagnosticó que la información municipal provincial estaba fragmentada y sin formatos abiertos reutilizables. Connecta València (IoT LPWAN de última milla + plataforma analítica multicapa en Python y JS) capta datos continuos de movilidad de ciudadanos y turistas e impacto ambiental.
- Tras el hackathon **DiValHack** (60 participantes, 10 mentores) no hay aplicaciones ciudadanas permanentes contra la despoblación ni para auditar la equidad territorial.
- **Indicadores locales de la Agenda 2030** con poca visibilidad:
  - **3.6.EL04**: proporción de accidentes de tráfico con muertes por lesiones
  - **11.2.EL10**: proporción de accidentes con VMP (bicicletas, patinetes), desglosado por tipo
- Ningún proyecto cruza de forma recurrente la siniestralidad VMP (11.2.EL10) con la red de Carril bici (n.º 19), las vías de circulación del Geoportal, el Callejero (n.º 18) y los Avisos de desperfectos (n.º 11) para auditar puntos negros y exigir intervenciones de seguridad vial.

---

## 3. Propuestas de proyectos sociales con actualización recurrente

El proyecto debe dejar de ser un estudio estático y convertirse en un **observatorio vivo alimentado por flujos de datos automatizados**.

| Proyecto | Fuentes integradas | Frecuencia y mecanismo | Impacto social |
|---|---|---|---|
| **Radar de Presión Residencial, Desplazamiento Comercial y Equidad de Barrio** (`radar-vivienda`) | Viviendas turísticas vigentes GVA (`tur-gestur-vt`, CSV); Censo de empresas (n.º 20); Ayudas sociales (n.º 12); Avisos (n.º 11); Facturas (n.º 40); demografía por barrios | Semanal / mensual: descarga automatizada del CSV vivo para comparación diferencial de licencias y consulta programada a la API CKAN municipal | Índice dinámico de vulnerabilidad urbana que alerta a asociaciones vecinales y servicios sociales de zonas donde la turistificación destruye comercio local y el gasto en mantenimiento no compensa la degradación reportada |
| **Escudo Comunitario de Alerta Hidrológica, Sequía y Protección de Equipamientos** (`escudo-hidrologico`) | Caudales y umbrales en tiempo real del SAIH Júcar; PATRICOVA (niveles 1 a 7); Equipamientos municipales (n.º 37); Calidad del agua (n.º 16) | Tiempo real (cada 5 min) / diaria: extracción continua de aforos y embalses cruzada espacialmente con capas SIG GeoJSON y PBF | Aviso temprano hiperlocal para colegios, centros de mayores y colectivos agrarios ante crecidas en cuencas altas (Turia, Magro, Palancia, Mijares) o caída bajo mínimos ecológicos |
| **Monitor de Seguridad de Movilidad Personal (VMP) y Accesibilidad Intermunicipal** (`monitor-vmp`) | Indicadores Agenda 2030 11.2.EL10 y 3.6.EL04; Carril bici (n.º 19) y vías del Geoportal; Avisos (n.º 11); red IoT Connecta València (LPWAN) | Mensual / continua: sincronización vía API CKAN y capas vectoriales del Geoportal y nodos provinciales | Mapa vivo de puntos negros de patinetes y bicis correlacionado con discontinuidades del carril bici y desperfectos no resueltos, para orientar la inversión en infraestructura segura |

**Clave de la viabilidad: indicadores derivados que no existen en las fuentes por separado.**

- En el radar, la GVA publica el listado de viviendas turísticas como fotografía instantánea sin histórico: almacenar el CSV cada semana construye un activo longitudinal único que gana valor con cada mes de operación.
- En el escudo, unir la telemetría CHJ con equipamientos y PATRICOVA traduce métricas hidráulicas crudas en protocolos ciudadanos comprensibles y accionables.

---

## 4. Arquitectura técnica para la automatización y continuidad operativa

El fracaso habitual de estas iniciativas es depender de descargas y limpiezas manuales, lo que deja el proyecto obsoleto a los pocos meses. Se necesita una **arquitectura de ingestión desacoplada** con coste de mantenimiento marginal.

- **Extracción**: tareas programadas en Python y JavaScript (alineado con Connecta València y con los principios de software libre de Las Naves y la UPV).
- **Catálogos GVA y Ayuntamiento**: consulta directa a la API CKAN (`http://www.dadesobertes.gva.es/api/3/action` y su equivalente en `opendata.vlci.valencia.es`), según la documentación oficial (`http://docs.ckan.org/en/latest/api/index.html`). El colector comprueba la marca temporal de actualización de los metadatos y descarga automáticamente las nuevas versiones (viviendas turísticas, ayudas sociales, facturas, avisos…).
- **Capa territorial**: portal municipal + plataforma IoT Telefónica + Geoportal (`geoportal.valencia.es/apps/GeoportalHome/es/inicio/geodatos-abiertos`):
  - GeoJSON y KMZ para cruces espaciales en servidor
  - teselas vectoriales PBF para renderizar en navegador sin infraestructura cartográfica costosa
  - intersecciones automáticas entre Equipamientos, Carril bici, las 34 capas SIG base, las demarcaciones de la Oficina de Estadística y los 7 niveles de PATRICOVA
- **Módulo SAIH**: extracción cada 5 minutos sobre `saih.chj.es/resumen-aforos` y `saih.chj.es/aforos`, incorporando el estado vivo de ríos y embalses a la misma base de datos espacial.

---

## 5. Recomendaciones estratégicas de implementación y gobernanza

### Activación institucional del derecho de apertura de datos

Cuando un dataset clave (ayudas sociales, facturas, calidad del agua…) tenga retrasos o poca desagregación espacial, usar sistemáticamente los canales formales:

- Solicitud de datos abiertos del Ayuntamiento: `https://www.valencia.es/web/gobierno-abierto/cas/datos-abiertos/contacta`
- Oficina de Estadística: `infoestadistica@valencia.es`
- Mecanismo participativo del portal Dades Obertes GVA (amparado por la Ley 1/2022)

Integrar un **registro público de estas solicitudes** en la propia plataforma convierte la auditoría de calidad del dato en incidencia cívica continua.

### Alianzas en cuádruple hélice y sostenibilidad institucional

- Apoyarse en Las Naves y en el grupo de datos de la UPV (`dadesvalencia.webs.upv.es`), cuya misión es coordinar agentes públicos, privados, académicos y sociedad civil para usar el dato como herramienta de innovación social.
- Vincular el proyecto a la **Misión Climática València 2030** para acceder a redes de hardware y software libre, validación metodológica universitaria y transferencia a comunidades vulnerables.
- Una vez operativo el prototipo, presentarse a convocatorias anuales: Premios de Datos Abiertos y Periodismo de Datos del Ayuntamiento, encuentros de innovación de la Diputación y Red.es. Aportan dinero, visibilidad y blindaje institucional, ya que los ganadores pasan a ser casos de uso oficiales (`https://www.valencia.es/web/gobierno-abierto/cas/datos-abiertos/reutilizacion/reutilizacion-datos-abiertos/casos-de-uso`).
- Posicionarse en los huecos de la matriz actual (viviendas turísticas frente a vulnerabilidad barrial, telemetría hidrológica frente a riesgo de inundación y sequía) y **evitar los nichos saturados de movilidad ciclista**.

---

## 6. Canales oficiales y contactos

- Solicitud de datos abiertos (Ayuntamiento): https://www.valencia.es/web/gobierno-abierto/cas/datos-abiertos/contacta
- Casos de uso oficiales (Ayuntamiento): https://www.valencia.es/web/gobierno-abierto/cas/datos-abiertos/reutilizacion/reutilizacion-datos-abiertos/casos-de-uso
- Premios de Datos Abiertos y Periodismo de Datos: https://www.valencia.es/web/gobierno-abierto/cas/datos-abiertos/reutilizacion/reutilizacion-datos-abiertos/premios-de-datos-abiertos-y-periodismo-de-datos
- Oficina de Estadística municipal: infoestadistica@valencia.es / estadistica@valencia.es
- Fundación Las Naves (innovación social y urbana): datoseguro@lasnaves.com
- Documentación de la API CKAN: http://docs.ckan.org/en/latest/api/index.html

## 7. Nota sobre trabajo en paralelo

Los proyectos `radar-vivienda` y `monitor-vmp` comparten datasets municipales (n.º 11 Avisos, Geoportal, API CKAN del Ayuntamiento). Gemini recomienda un **módulo conector CKAN común** reutilizable por los tres proyectos para no duplicar código (p. ej. un cuarto repositorio o paquete compartido).

## 8. Fuentes consultadas por Gemini

Extraídas del panel de fuentes de Deep Research. Las 26 primeras son las fuentes **usadas** en el informe, con su URL. Las 7 del final las consultó, pero no las usó.

### Portales oficiales de datos abiertos

| Dominio | Título | URL |
|---|---|---|
| dadesobertes.gva.es | Datos Abiertos - Generalitat Valenciana | https://dadesobertes.gva.es/es/about |
| dadesobertes.gva.es | Lista de viviendas turísticas - Generalitat Valenciana | https://dadesobertes.gva.es/es/dataset/tur-gestur-vt/resource/b1bdc28e-9813-422a-ab7a-63c21290493d |
| opendata.vlci.valencia.es | Portal de datos abiertos del Ayuntamiento de València | https://opendata.vlci.valencia.es/ |
| opendata.vlci.valencia.es | Conjunto de datos - Open Data Valencia (red/xarxa, KMZ y HTML) | https://opendata.vlci.valencia.es/dataset/?tags=xarxa&license_id=cc-by&res_format=KMZ&res_format=HTML |
| opendata.vlci.valencia.es | Conjunto de datos - Open Data Valencia (urbanismo e infraestructuras) | https://opendata.vlci.valencia.es/dataset/?res_format=GeoJSON&res_format=pbf&res_format=HTML&groups=urbanismo-infraestructuras&res_format=KMZ |
| opendata-valencia.iotplatform.telefonica.com | Conjunto de datos - Open Data Valencia (PBF y CSV) | https://opendata-valencia.iotplatform.telefonica.com/dataset/?res_format=pbf&res_format=CSV&organization=ajuntament-de-valencia |
| datos.gob.es | Dades Obertes de la Generalitat Valenciana | https://datos.gob.es/es/iniciativas/dades-obertes-de-la-generalitat-valenciana |
| datos.gob.es | Ayuntamiento de Valencia Gobierno Abierto | https://datos.gob.es/es/iniciativas/ayuntamiento-de-valencia-gobierno-abierto |
| datos.gob.es | PATRICOVA: Peligrosidad por Inundación | https://datos.gob.es/es/catalogo/a10002983-patricova-peligrosidad-por-inundacion-plan-de-accion-territorial-de-caracter-sectorial-sobre-prevencion-del-riesgo-de-inundacion-en-la-comunitat-valenciana |
| redtransparenciayparticipacion.es | Datos Abiertos. 80 Conjuntos de Datos (PDF, guía FEMP) | https://redtransparenciayparticipacion.es/wp-content/uploads/2025/03/Datos-abiertos-80-conjuntos-de-datos.pdf |
| data.nextgis.com | Valencia: Mapa base - NextGIS Data | https://data.nextgis.com/es/region/ES-CITY-003/base/ |

### Ayuntamiento de València: estadística y premios

| Dominio | Título | URL |
|---|---|---|
| valencia.es | Premios de datos abiertos y periodismo de datos | https://www.valencia.es/web/gobierno-abierto/cas/datos-abiertos/reutilizacion/reutilizacion-datos-abiertos/premios-de-datos-abiertos-y-periodismo-de-datos |
| valencia.es | Oficina de Estadística | https://www.valencia.es/cas/estadistica-quienes-somos |
| sede.valencia.es | Información estadística - Sede Electrónica (procedimiento AE.OT.10) | https://sede.valencia.es/sede/registro/procedimiento/AE.OT.10?lang=1 |

### Hidrología (SAIH Júcar)

Los títulos que muestra Gemini (río Cenia, EA 99 Ulldecona) son los de la página en el momento en que la visitó. Las URLs son las páginas generales de aforos, más la ficha de una estación concreta.

| Dominio | Título | URL |
|---|---|---|
| saih.chj.es | Aforos (Gemini: "ea 99 salida ulldecona (caudal río cenia)") | https://saih.chj.es/aforos |
| saih.chj.es | Resumen de aforos y umbrales (Gemini: "caudal río cenia") | https://saih.chj.es/resumen-aforos |
| saih.chj.es | Ficha de estación 13080 | https://saih.chj.es/aforos/13080 |

### Diputación de Valencia y Connecta València

| Dominio | Título | URL |
|---|---|---|
| turisme.dival.es | La Diputació destina 5 millones de euros al proyecto 'Connecta València' | https://turisme.dival.es/la-diputacio-destina-5-millones-de-euros-al-proyecto-connecta-valencia-para-analizar-los-datos-turisticos-en-toda-la-provincia/ |
| esmartcity.es | Connecta Valencia, territorio inteligente y sostenible | https://www.esmartcity.es/comunicaciones/comunicacion-connecta-valencia-territorio-inteligente-sostenible |
| datos.gob.es | Red.es y la Diputación de Valencia lanzan un Hackathon | https://datos.gob.es/es/eventos/redes-y-la-diputacion-de-valencia-lanzan-un-hackathon-para-para-dar-conocer-el-proyecto |
| datos.gob.es | Red.es and the Valencia Provincial Council launch a Hackathon (EN) | https://datos.gob.es/en/eventos/redes-and-valencia-provincial-council-launch-hackathon-raise-awareness-project-connecta |

### Innovación social y academia

| Dominio | Título | URL |
|---|---|---|
| datos.lasnaves.com | Centre d'Innovació social i urbana - Las Naves València | https://datos.lasnaves.com/step/3 |
| organizacionesdefuturo.es | Organizaciones de Futuro, Las Naves, València | https://organizacionesdefuturo.es/ |
| dadesvalencia.webs.upv.es | Proyectos - Dades València - UPV | https://dadesvalencia.webs.upv.es/proyectos/ |

### Prensa

| Dominio | Título | URL |
|---|---|---|
| valenciaextra.com | El Portal de Dades Obertes de la Generalitat ha duplicado sus visitas en tres años | https://www.valenciaextra.com/es/politica/el-portal-de-dades-obertes-de-la-generalitat-ha-duplicado-sus-visitas-en-tres-anos_595451_102.html |
| valenciaextra.com | Valencia abre su catálogo de datos públicos a la ciudadanía | https://www.valenciaextra.com/es/politica/valencia-abre-su-catalogo-de-datos-publicos-a-la-ciudadania-ahora-cualquier-persona-puede-proponer-que-informacion-publica-la-generalitat_589199_102.html |

### Fuentes consultadas pero no usadas

| Dominio | Título | URL |
|---|---|---|
| spain.meloda.org | Dashboard — Monitorizador de Datos Abiertos, España | https://spain.meloda.org/ |
| meloda.org | La reutilización de datos abiertos en España (estudio Cotec IV, PDF) | https://www.meloda.org/wp-content/uploads/2024/04/ESTUDIO-COTEC_IV-REUTILIZACION-DE-DATOS-ABIERTOS_V3.pdf |
| github.com | Administracion-fuentes-publicas: gobierno abierto (catálogo de fuentes públicas) | https://github.com/BquantFinance/Administracion-fuentes-publicas/blob/main/sources/gobierno-abierto-administracion/README.md |
| ddd.uab.cat | Dades obertes per a la documentació històrica (TFM, PDF) | https://ddd.uab.cat/pub/trerecpro/2023/291864/TFM_VilaFrigola_Lluis.pdf |
| xtradio.es | Comarca - Xtradio | https://xtradio.es/comarca/ |
| ovc.sede.dival.es | Dades personals - Diputació de València (página de login, no accesible) | https://ovc.sede.dival.es/sta/CarpetaPrivate/Login?APP_CODE=STA&PAGE_CODE=OVC_DATOS_PERSONALES |
| es.wikipedia.org | Desfibrilador externo automático | https://es.wikipedia.org/wiki/Desfibrilador_externo_autom%C3%A1tico |

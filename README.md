# radar-vivienda

**Radar de Presión Residencial, Desplazamiento Comercial y Equidad de Barrio**

Observatorio vivo de turistificación y vulnerabilidad barrial en València.

Proyecto social de datos abiertos de València y la Comunitat Valenciana. Forma parte de una iniciativa de tres proyectos paralelos (`escudo-hidrologico`, `monitor-vmp` y este), nacidos del informe [`doc/informe-datos-abiertos-valencia.md`](doc/informe-datos-abiertos-valencia.md).

## Estructura

```
config/fuentes.json   Endpoints, datasets y URLs de origen
data/raw/             Descargas periódicas tal cual llegan (no versionado)
data/processed/       Datos limpios y cruzados (no versionado)
src/                  Colectores y procesado
doc/                  Informe de origen y documentación
```

## Canales oficiales

- Solicitud de datos abiertos (Ayuntamiento de València): https://www.valencia.es/web/gobierno-abierto/cas/datos-abiertos/contacta
- Casos de uso oficiales: https://www.valencia.es/web/gobierno-abierto/cas/datos-abiertos/reutilizacion/reutilizacion-datos-abiertos/casos-de-uso
- Premios de Datos Abiertos y Periodismo de Datos: https://www.valencia.es/web/gobierno-abierto/cas/datos-abiertos/reutilizacion/reutilizacion-datos-abiertos/premios-de-datos-abiertos-y-periodismo-de-datos
- Oficina de Estadística municipal: infoestadistica@valencia.es / estadistica@valencia.es
- Fundación Las Naves: datoseguro@lasnaves.com
- API CKAN (documentación): http://docs.ckan.org/en/latest/api/index.html

## Licencia

Código bajo [GNU AGPL-3.0](LICENSE). Los datos de origen mantienen la licencia de cada organismo publicador (consultar la ficha de cada dataset).

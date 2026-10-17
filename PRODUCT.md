# Radar de Presión Residencial, Desplazamiento Comercial y Equidad de Barrio: visión de producto

## Concepto

Observatorio vivo de turistificación y vulnerabilidad barrial en València. Observatorio vivo alimentado por flujos de datos automatizados, no un estudio estático.

## Problemática social

Modelizar el metabolismo socioeconómico de cada barrio: cómo el aumento de viviendas de uso turístico desplaza al comercio de proximidad, eleva la demanda de ayudas sociales por presión habitacional y altera la equidad del gasto municipal en mantenimiento frente a los avisos ciudadanos de deterioro.

## Frecuencia de actualización

**Semanal / mensual**

## Funcionamiento

- Descarga automatizada semanal del CSV vivo de viviendas turísticas de la GVA (`tur-gestur-vt`).
- Comparación diferencial entre instantáneas para construir la serie histórica de altas, bajas y velocidad de concentración por código postal o sección censal (la GVA no publica histórico).
- Consulta programada a la API CKAN municipal: censo empresarial (n.º 20), ayudas sociales (n.º 12), avisos (n.º 11) y facturas (n.º 40).
- Cruce con la demografía por barrios de la Oficina de Estadística.

## Impacto esperado

Índice dinámico de vulnerabilidad urbana que alerta a asociaciones vecinales y servicios sociales sobre zonas donde la turistificación destruye comercio local y donde el gasto municipal en mantenimiento no compensa la degradación reportada.

## Por qué es viable a largo plazo

El histórico semanal de licencias turísticas es un activo longitudinal que no existe en origen y gana valor con cada mes de operación continua.

## Fuentes de datos

Configuración programática en `config/fuentes.json`:

```json
{
  "gva_viviendas_turisticas_csv": "https://dadesobertes.gva.es/dataset/758f8f8e-c5af-4622-b268-a6c591710a51/resource/b1bdc28e-9813-422a-ab7a-63c21290493d/download/lista-de-viviendas-turisticas.csv",
  "gva_viviendas_turisticas_dataset_id": "tur-gestur-vt",
  "gva_ckan_api": "http://www.dadesobertes.gva.es/api/3/action",
  "valencia_ckan_portal": "https://opendata.vlci.valencia.es/",
  "datasets_municipales_femp80": [
    "Nº 11 - Avisos (comunicaciones de incidencias en la vía pública)",
    "Nº 12 - Ayudas sociales (otorgadas a personas y organizaciones)",
    "Nº 20 - Censo de empresas y agentes económicos",
    "Nº 40 - Facturas municipales"
  ],
  "oficina_estadistica_valencia": {
    "web": "https://www.valencia.es/cas/estadistica-quienes-somos",
    "email_solicitudes": "infoestadistica@valencia.es"
  }
}
```

## Gobernanza

- Si un dataset clave llega con retraso o poca desagregación, solicitarlo por los canales formales (Ayuntamiento, Oficina de Estadística, mecanismo participativo de Dades Obertes GVA, Ley 1/2022) y llevar un registro público de esas solicitudes dentro de la plataforma.
- Alianzas en cuádruple hélice con Las Naves y el grupo de datos de la UPV; vincular el proyecto a la Misión Climática València 2030.
- Cuando haya prototipo, presentarlo a los Premios de Datos Abiertos y Periodismo de Datos del Ayuntamiento y a los encuentros de innovación de la Diputación y Red.es.

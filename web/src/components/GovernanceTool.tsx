import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { AuditoriaFemp80, DatasetAuditItem } from "../types/observatory";

interface GovernanceToolProps {
  auditoria: AuditoriaFemp80;
}

function esParcial(item: DatasetAuditItem): boolean {
  const estado = item.estadoApertura.toLowerCase();
  return estado.includes("parcial") || estado.includes("sin histórico");
}

export function GovernanceTool({ auditoria }: GovernanceToolProps) {
  const [selectedAuditItem, setSelectedAuditItem] = useState<DatasetAuditItem>(
    auditoria.datasetsAuditados[2] ?? auditoria.datasetsAuditados[0]!
  );
  const [copiedRequest, setCopiedRequest] = useState(false);

  const formalRequestTemplate = useMemo(() => {
    return `ASUNTO: Solicitud de apertura / desagregación territorial de datos públicos (${selectedAuditItem.codigo} - ${selectedAuditItem.titulo})

A la atención del Servicio de Transparencia y Gobierno Abierto / Oficina de Estadística:

Al amparo de la Ley 1/2022, de 13 de abril, de Transparencia y Buen Gobierno de la Comunitat Valenciana, y en alineación con la Guía de los 80 Conjuntos de Datos Esenciales de la FEMP, desde el observatorio ciudadano abierto "Radar de Presión Residencial, Desplazamiento Comercial y Equidad de Barrio" (https://github.com/turbica/radar-vivienda) hemos auditado el conjunto de datos:

- Identificador en catálogo CKAN: ${selectedAuditItem.packageId}
- Estado actual verificado: ${selectedAuditItem.estadoApertura} (${selectedAuditItem.desagregacionEspacial})
- Limitación técnica detectada: ${selectedAuditItem.incidenciaDetectada}

SOLICITAMOS:
${selectedAuditItem.accionGobernanza}

En formato abierto, reutilizable y legible por máquina (CSV / GeoJSON / Parquet) a través de la API CKAN municipal/autonómica (/api/3/action), preservando en todo momento la disociación de datos personales conforme al RGPD.

En València, a ${new Date().toLocaleDateString("es-ES")}.`;
  }, [selectedAuditItem]);

  const handleCopyFormalRequest = async () => {
    try {
      await navigator.clipboard.writeText(formalRequestTemplate);
      setCopiedRequest(true);
      setTimeout(() => setCopiedRequest(false), 2400);
    } catch {
      // Sin portapapeles: el texto sigue visible en el área de texto
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <fieldset className="lg:col-span-6">
        <legend className="font-display mb-4 text-xl font-extrabold">
          1. Elige el conjunto de datos que quieres reclamar
        </legend>
        <div className="border-t-2 border-ink">
          {auditoria.datasetsAuditados.map((item) => {
            const isSelected = selectedAuditItem.codigo === item.codigo;
            return (
              <button
                key={item.codigo}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedAuditItem(item)}
                className={`block w-full cursor-pointer border-b border-ink p-4 text-left transition-colors ${
                  isSelected ? "bg-ink text-paper" : "bg-transparent text-ink hover:bg-ink/6"
                }`}
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs uppercase">{item.codigo}</span>
                  <span
                    className={`px-2 py-0.5 text-xs font-bold ${
                      esParcial(item) ? "bg-mark text-ink" : isSelected ? "bg-paper text-ink" : "bg-nivel-baja text-ink"
                    }`}
                  >
                    {item.estadoApertura}
                  </span>
                </span>
                <span className="mt-1.5 block font-bold">{item.titulo}</span>
                <span className={`mt-1 block text-sm ${isSelected ? "text-paper/85" : "text-muted"}`}>
                  {item.incidenciaDetectada}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-4 lg:col-span-6">
        <label htmlFor="escrito-solicitud" className="font-display text-xl font-extrabold">
          2. Copia el escrito y regístralo
        </label>
        <textarea
          id="escrito-solicitud"
          readOnly
          value={formalRequestTemplate}
          rows={16}
          className="w-full border-2 border-ink bg-paper-2 p-4 font-mono text-xs leading-relaxed text-ink"
        />
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={handleCopyFormalRequest} className="btn btn-ink">
            {copiedRequest ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copiar escrito
              </>
            )}
          </button>
          <a href={auditoria.canalesOficiales.solicitud_datos_ayuntamiento} className="btn btn-line">
            Portal del Ayuntamiento
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
          <a
            href={`mailto:${auditoria.canalesOficiales.oficinaEstadisticaEmail}?subject=${encodeURIComponent(
              `Solicitud de datos desagregados por barrio (${selectedAuditItem.codigo})`
            )}&body=${encodeURIComponent(formalRequestTemplate)}`}
            className="btn btn-line"
          >
            Enviar a Estadística
          </a>
        </div>
        <p aria-live="polite" className="sr-only">
          {copiedRequest ? "Escrito copiado al portapapeles" : ""}
        </p>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, FileText } from "lucide-react";
import type { AuditoriaFemp80, DatasetAuditItem } from "../types/observatory";

interface GovernanceToolProps {
  auditoria: AuditoriaFemp80;
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
      // Fallback silencioso
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Lista seleccionable de datasets auditados */}
      <div className="space-y-3 lg:col-span-7">
        <h3 className="text-base font-extrabold text-slate-900">
          1. Selecciona el conjunto de datos que deseas reclamar o auditar
        </h3>
        <p className="text-xs text-slate-600">
          Haz clic sobre cualquiera de los datasets auditados para actualizar
          automáticamente el escrito técnico de solicitud formal en el panel derecho:
        </p>

        <div className="space-y-3">
          {auditoria.datasetsAuditados.map((item) => {
            const isSelected = selectedAuditItem.codigo === item.codigo;
            const isPartial =
              item.estadoApertura.toLowerCase().includes("parcial") ||
              item.estadoApertura.toLowerCase().includes("sin histórico");
            return (
              <button
                key={item.codigo}
                type="button"
                onClick={() => setSelectedAuditItem(item)}
                className={`interactive-btn w-full rounded-2xl border p-4 text-left ${
                  isSelected
                    ? "border-sky-700 bg-sky-50/60 ring-1 ring-sky-700/30"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-sky-900">
                    {item.codigo} · {item.packageId}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                      isPartial
                        ? "border-amber-300 bg-amber-100 text-amber-900"
                        : "border-emerald-300 bg-emerald-100 text-emerald-900"
                    }`}
                  >
                    {item.estadoApertura}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-extrabold text-slate-900">
                  {item.titulo}
                </p>
                <p className="mt-1 text-xs text-slate-700">
                  <strong>Granularidad actual:</strong> {item.desagregacionEspacial}{" "}
                  ({item.registrosCapturados.toLocaleString("es-ES")} registros)
                </p>
                <p className="mt-1 text-xs text-red-800">
                  <strong>Brecha detectada:</strong> {item.incidenciaDetectada}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Generador interactivo de solicitud formal Ley 1/2022 */}
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-5 lg:col-span-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-900 uppercase">
              <FileText className="h-4 w-4 text-sky-700" aria-hidden="true" />
              2. Escrito Formal Listo para Registrar
            </span>
            <span className="rounded bg-white px-2 py-0.5 font-mono text-xs font-bold text-slate-700 border border-slate-200">
              {selectedAuditItem.codigo}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            Fundamentado en la <strong>Ley 1/2022 de Transparencia y Buen Gobierno</strong> y
            en la Guía de los 80 Datasets Esenciales de la FEMP:
          </p>
          <textarea
            readOnly
            value={formalRequestTemplate}
            rows={15}
            aria-label="Texto de solicitud formal de datos abiertos"
            className="w-full rounded-xl border border-slate-300 bg-white p-3.5 font-mono text-[11px] leading-relaxed text-slate-800"
          />
        </div>

        <div className="mt-4 space-y-2.5">
          <button
            type="button"
            onClick={handleCopyFormalRequest}
            className="interactive-btn flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800"
          >
            {copiedRequest ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <span>Solicitud copiada al portapapeles</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" />
                <span>Copiar texto de solicitud formal</span>
              </>
            )}
          </button>

          <div className="grid grid-cols-1 gap-2 pt-1 text-xs sm:grid-cols-2">
            <a
              href={auditoria.canalesOficiales.solicitud_datos_ayuntamiento}
              target="_blank"
              rel="noreferrer"
              className="interactive-btn flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold text-slate-800 hover:bg-slate-100"
            >
              <span>Portal Ayuntamiento</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            <a
              href={`mailto:${auditoria.canalesOficiales.oficinaEstadisticaEmail}?subject=${encodeURIComponent(
                `Solicitud de datos desagregados por barrio (${selectedAuditItem.codigo})`
              )}&body=${encodeURIComponent(formalRequestTemplate)}`}
              className="interactive-btn flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold text-slate-800 hover:bg-slate-100"
            >
              <span>Enviar a Estadística</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesHistoricas } from "../types/observatory";

interface SeriesChartsProps {
  serieAnualAltas: SeriesHistoricas["serieAnualAltas"];
  distritosTop: SeriesHistoricas["distritosResumen"];
}

export function SeriesCharts({
  serieAnualAltas,
  distritosTop,
}: SeriesChartsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Gráfico 1: Evolución anual de licencias VUT en València (2015-2026) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="space-y-1">
          <span className="text-[11px] font-bold tracking-wider text-sky-800 uppercase">
            Serie Histórica Longitudinal (2015–2026)
          </span>
          <h3 className="text-base font-extrabold text-slate-900">
            Velocidad de Concentración: Nuevas Altas vs. Parque Acumulado
          </h3>
          <p className="text-xs leading-relaxed text-slate-600">
            Reconstrucción anual a partir de la fecha de inscripción (`fecha_alta`)
            en el registro autonómico `tur-gestur-vt`. Más del 50% del stock
            actual se inscribió a partir de 2024.
          </p>
        </div>

        <div className="mt-4 h-[310px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={serieAnualAltas}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="anio"
                tick={{ fontSize: 11, fill: "#334155" }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: "#0369a1" }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: "#b45309" }}
              />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar
                yAxisId="left"
                dataKey="nuevas_licencias"
                name="Nuevas altas anuales (VUT)"
                fill="#0284c7"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="stock_acumulado_vigente"
                name="Parque acumulado vigente"
                stroke="#d97706"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico 2: Comparativa por Distritos (VUT vs Terrazas) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="space-y-1">
          <span className="text-[11px] font-bold tracking-wider text-amber-800 uppercase">
            Cruce Espacial por Distritos (GVA + FEMP Nº 20)
          </span>
          <h3 className="text-base font-extrabold text-slate-900">
            Top 10 Distritos: Viviendas Turísticas vs. Licencias de Terrazas
          </h3>
          <p className="text-xs leading-relaxed text-slate-600">
            Comparación entre el parque de pisos turísticos activos y los recibos
            fiscales de ocupación de vía pública con mesas y sillas de hostelería.
          </p>
        </div>

        <div className="mt-4 h-[310px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={distritosTop.slice(0, 10)}
              layout="vertical"
              margin={{ left: 32, right: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#334155" }}
              />
              <YAxis
                type="category"
                dataKey="distrito"
                width={125}
                tick={{ fontSize: 11, fill: "#0f172a" }}
              />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar
                dataKey="vut_activas"
                name="VUT vigentes"
                fill="#0f172a"
                radius={[0, 4, 4, 0]}
              />
              <Bar
                dataKey="recibos_terrazas"
                name="Recibos Terrazas"
                fill="#f59e0b"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

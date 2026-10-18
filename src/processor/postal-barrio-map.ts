/**
 * Correspondencia territorial entre los 26 códigos postales urbanos de València (`46001`..`46026`)
 * y los códigos oficiales de barrio (`coddistbar` de 3 dígitos: 2 de distrito + 1 de barrio)
 * con pesos de distribución residencial/urbana para asignar licencias de `tur-gestur-vt`
 * tanto por código postal como por barrio y distrito oficial.
 */
export const POSTAL_CODE_TO_BARRIOS: Record<
  string,
  Array<{ coddistbar: string; weight: number }>
> = {
  // Ciutat Vella (Distrito 01)
  "46001": [
    { coddistbar: "012", weight: 0.30 }, // El Mercat
    { coddistbar: "013", weight: 0.25 }, // El Pilar
    { coddistbar: "016", weight: 0.25 }, // Sant Francesc
    { coddistbar: "011", weight: 0.20 }, // La Seu
  ],
  "46002": [
    { coddistbar: "016", weight: 0.55 }, // Sant Francesc
    { coddistbar: "012", weight: 0.25 }, // El Mercat
    { coddistbar: "014", weight: 0.20 }, // La Xerea
  ],
  "46003": [
    { coddistbar: "015", weight: 0.45 }, // El Carme
    { coddistbar: "011", weight: 0.25 }, // La Seu
    { coddistbar: "014", weight: 0.30 }, // La Xerea
  ],
  // L'Eixample (Distrito 02)
  "46004": [
    { coddistbar: "022", weight: 0.60 }, // El Pla del Remei
    { coddistbar: "023", weight: 0.40 }, // Gran Via
  ],
  "46005": [
    { coddistbar: "023", weight: 0.55 }, // Gran Via
    { coddistbar: "021", weight: 0.45 }, // Russafa
  ],
  "46006": [
    { coddistbar: "021", weight: 0.50 }, // Russafa
    { coddistbar: "102", weight: 0.25 }, // En Corts
    { coddistbar: "101", weight: 0.25 }, // Montolivet
  ],
  // Extramurs (Distrito 03) y Jesús (Distrito 09)
  "46007": [
    { coddistbar: "033", weight: 0.35 }, // La Roqueta
    { coddistbar: "034", weight: 0.40 }, // Arrancapins
    { coddistbar: "091", weight: 0.25 }, // La Raiosa
  ],
  "46008": [
    { coddistbar: "031", weight: 0.45 }, // El Botànic
    { coddistbar: "032", weight: 0.35 }, // La Petxina
    { coddistbar: "071", weight: 0.20 }, // Nou Moles
  ],
  // La Saïdia (Distrito 05) y Campanar (Distrito 04)
  "46009": [
    { coddistbar: "051", weight: 0.25 }, // Marxalenes
    { coddistbar: "052", weight: 0.25 }, // Morvedre
    { coddistbar: "055", weight: 0.20 }, // Sant Antoni
    { coddistbar: "042", weight: 0.30 }, // Les Tendetes
  ],
  // El Pla del Real (Distrito 06)
  "46010": [
    { coddistbar: "061", weight: 0.30 }, // Exposició
    { coddistbar: "062", weight: 0.40 }, // Mestalla
    { coddistbar: "063", weight: 0.15 }, // Jaume Roig
    { coddistbar: "064", weight: 0.15 }, // Ciutat Universitària
  ],
  // Poblats Marítims (Distrito 11)
  "46011": [
    { coddistbar: "112", weight: 0.52 }, // El Cabanyal-El Canyamelar
    { coddistbar: "113", weight: 0.24 }, // La Malva-rosa
    { coddistbar: "111", weight: 0.14 }, // El Grau
    { coddistbar: "114", weight: 0.10 }, // Beteró
  ],
  // Poblats del Sud (Distrito 19) / Natzaret
  "46012": [
    { coddistbar: "194", weight: 0.35 }, // El Saler
    { coddistbar: "196", weight: 0.35 }, // El Perellonet
    { coddistbar: "195", weight: 0.15 }, // El Palmar
    { coddistbar: "191", weight: 0.15 }, // Pinedo
  ],
  // Quatre Carreres (Distrito 10)
  "46013": [
    { coddistbar: "106", weight: 0.35 }, // La Ciutat de les Arts i de les Ciències
    { coddistbar: "103", weight: 0.25 }, // Malilla
    { coddistbar: "105", weight: 0.25 }, // Na Rovella
    { coddistbar: "104", weight: 0.15 }, // La Fonteta S. Lluís
  ],
  // Patraix (Distrito 08) y L'Olivereta (Distrito 07)
  "46014": [
    { coddistbar: "082", weight: 0.30 }, // Sant Isidre
    { coddistbar: "083", weight: 0.25 }, // Vara de Quart
    { coddistbar: "074", weight: 0.25 }, // La Fuensanta
    { coddistbar: "075", weight: 0.20 }, // La Llum
  ],
  // Campanar (Distrito 04) y Benicalap (Distrito 16)
  "46015": [
    { coddistbar: "041", weight: 0.45 }, // Campanar
    { coddistbar: "044", weight: 0.30 }, // Sant Pau
    { coddistbar: "043", weight: 0.25 }, // El Calvari
  ],
  "46016": [
    { coddistbar: "173", weight: 0.50 }, // Carpesa
    { coddistbar: "172", weight: 0.50 }, // Poble Nou
  ],
  // Jesús (Distrito 09) y Patraix (Distrito 08)
  "46017": [
    { coddistbar: "092", weight: 0.30 }, // L'Hort de Senabre
    { coddistbar: "093", weight: 0.25 }, // La Creu Coberta
    { coddistbar: "094", weight: 0.25 }, // San Marcelino
    { coddistbar: "084", weight: 0.20 }, // Safranar
  ],
  // L'Olivereta (Distrito 07) y Patraix (Distrito 08)
  "46018": [
    { coddistbar: "071", weight: 0.35 }, // Nou Moles
    { coddistbar: "072", weight: 0.25 }, // Soternes
    { coddistbar: "073", weight: 0.15 }, // Tres Forques
    { coddistbar: "081", weight: 0.25 }, // Patraix
  ],
  // Rascanya (Distrito 15) y La Saïdia (Distrito 05)
  "46019": [
    { coddistbar: "151", weight: 0.35 }, // Orriols
    { coddistbar: "152", weight: 0.35 }, // Torrefiel
    { coddistbar: "153", weight: 0.15 }, // Sant Llorenç
    { coddistbar: "054", weight: 0.15 }, // Tormos
  ],
  // Benimaclet (Distrito 14) y Trinitat (053)
  "46020": [
    { coddistbar: "141", weight: 0.65 }, // Benimaclet
    { coddistbar: "142", weight: 0.15 }, // Camí de Vera
    { coddistbar: "053", weight: 0.20 }, // Trinitat
  ],
  // Algirós (Distrito 13) y Camins al Grau (Distrito 12)
  "46021": [
    { coddistbar: "122", weight: 0.30 }, // Albors
    { coddistbar: "132", weight: 0.35 }, // L'Amistat
    { coddistbar: "133", weight: 0.20 }, // La Vega Baixa
    { coddistbar: "131", weight: 0.15 }, // L'Illa Perduda
  ],
  "46022": [
    { coddistbar: "121", weight: 0.40 }, // Aiora
    { coddistbar: "131", weight: 0.25 }, // L'Illa Perduda
    { coddistbar: "134", weight: 0.20 }, // La Carrasca
    { coddistbar: "135", weight: 0.15 }, // Ciutat Jardí
  ],
  // Camins al Grau (Distrito 12)
  "46023": [
    { coddistbar: "124", weight: 0.45 }, // Penya-roja
    { coddistbar: "123", weight: 0.30 }, // La Creu del Grau
    { coddistbar: "125", weight: 0.25 }, // Camí Fondo
  ],
  // Poblats Marítims (115 Natzaret) y Camins al Grau
  "46024": [
    { coddistbar: "115", weight: 0.45 }, // Natzaret
    { coddistbar: "111", weight: 0.35 }, // El Grau
    { coddistbar: "107", weight: 0.20 }, // La Punta
  ],
  // Benicalap (Distrito 16)
  "46025": [
    { coddistbar: "161", weight: 0.80 }, // Benicalap
    { coddistbar: "162", weight: 0.20 }, // Ciutat Fallera
  ],
  // Poblats del Sud (Distrito 19)
  "46026": [
    { coddistbar: "193", weight: 0.35 }, // La Torre
    { coddistbar: "192", weight: 0.35 }, // Castellar-L'Oliveral
    { coddistbar: "197", weight: 0.15 }, // Forn d'Alcedo
    { coddistbar: "095", weight: 0.15 }, // Camí Real
  ],
  // Poblats de l'Oest (Distrito 18: Benimàmet / Beniferri)
  "46035": [
    { coddistbar: "181", weight: 0.80 }, // Benimàmet
    { coddistbar: "182", weight: 0.20 }, // Beniferri
  ],
};

export const DISTRITO_NAMES: Record<string, string> = {
  "01": "Ciutat Vella",
  "02": "L'Eixample",
  "03": "Extramurs",
  "04": "Campanar",
  "05": "La Saïdia",
  "06": "El Pla del Real",
  "07": "L'Olivereta",
  "08": "Patraix",
  "09": "Jesús",
  "10": "Quatre Carreres",
  "11": "Poblats Marítims",
  "12": "Camins al Grau",
  "13": "Algirós",
  "14": "Benimaclet",
  "15": "Rascanya",
  "16": "Benicalap",
  "17": "Poblats del Nord",
  "18": "Poblats de l'Oest",
  "19": "Poblats del Sud",
};

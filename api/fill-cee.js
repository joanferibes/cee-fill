import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";

export default async function handler(req, res) {
  try {
    const { tipo, datos } = req.body;

    // Mapa de rutas correctas en la carpeta /public/assets
    const rutas = {
      delegacion: "public/assets/Modelo_delegacion_tramite_registro.pdf",
      acta: "public/assets/Acta de visita.pdf",
    };

    const relativa = rutas[tipo];
    if (!relativa) {
      return res.status(400).json({ error: "Tipo de documento no válido" });
    }

    // Construimos ruta absoluta desde el directorio del proyecto
    const pdfPath = path.join(process.cwd(), relativa);

    // Lee el PDF
    const existingPdfBytes = fs.readFileSync(pdfPath);

    // Carga el PDF con pdf-lib
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();

    // Escribe campos recibidos
    Object.entries(datos || {}).forEach(([campo, valor]) => {
      try {
        form.getTextField(campo).setText(String(valor ?? ""));
      } catch (e) {
        // Si algún campo no existe, lo ignoramos.
      }
    });

    // Devuelve el PDF
    const filledPdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${tipo}_rellena.pdf"`
    );
    return res.end(Buffer.from(filledPdfBytes));

  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: "Error al procesar el PDF",
      detalle: e.message,
    });
  }
}

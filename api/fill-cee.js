import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";

export default async function handler(req, res) {
  try {
    const { tipo, datos } = req.body;

    // Mapear tipos a archivos PDF
    const rutas = {
      acta: "public/assets/Acta de visita.pdf",
      delegacion: "public/assets/Modelo_delegacion_tramite_registro.pdf",
    };

    const relativa = rutas[tipo];
    if (!relativa) {
      return res.status(400).json({ error: "Tipo de documento no válido" });
    }

    // Construir ruta absoluta
    const pdfPath = path.join(process.cwd(), relativa);

    // Leer el PDF
    const existingPdfBytes = fs.readFileSync(pdfPath);

    // Cargar el PDF con pdf-lib
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();

    // Rellenar los campos
    Object.entries(datos || {}).forEach(([campo, valor]) => {
      try {
        form.getTextField(campo).setText(String(valor ?? ""));
      } catch (e) {
        console.warn("Campo no encontrado:", campo);
      }
    });

    // Guardar el PDF resultante
    const filledPdfBytes = await pdfDoc.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${tipo}_relleno.pdf"`
    );
    return res.end(Buffer.from(filledPdfBytes));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error al procesar el PDF", detalle: e.message });
  }
}

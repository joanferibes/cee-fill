import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";

export default async function handler(req, res) {
  try {
    const { tipo, datos } = req.body;

    let pdfPath;
    if (tipo === "delegacion") {
      pdfPath = path.join(process.cwd(), "public/assets/Modelo_delegacion_tramite_registro.pdf");
    } else if (tipo === "acta") {
      pdfPath = path.join(process.cwd(), "public/assets/Acta de visita.pdf");
    } else {
      return res.status(400).json({ error: "Tipo de documento no válido" });
    }

    const existingPdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();

    // Rellenar campos con los datos recibidos
    Object.entries(datos).forEach(([campo, valor]) => {
      try {
        const field = form.getTextField(campo);
        field.setText(valor);
      } catch (e) {
        console.warn(`Campo no encontrado: ${campo}`);
      }
    });

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${tipo}.pdf`);
    return res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error al procesar el PDF" });
  }
}

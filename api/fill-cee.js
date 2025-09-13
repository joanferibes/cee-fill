import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método no permitido" });
    }

    const { tipo, datos } = req.body || {};
    if (!tipo || typeof datos !== "object") {
      return res.status(400).json({ error: "Faltan 'tipo' o 'datos' en el cuerpo" });
    }

    // Rutas de plantillas
    let pdfPath;
    if (tipo === "delegacion") {
      pdfPath = path.join(process.cwd(), "public/assets/Modelo_delegacion_tramite_registro.pdf");
    } else if (tipo === "acta") {
      pdfPath = path.join(process.cwd(), "public/assets/Acta de visita.pdf");
    } else {
      return res.status(400).json({ error: "Tipo de documento no válido" });
    }

    // Cargar PDF base
    const existingPdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();

    // --- Relleno SEGURO: no fallar si un campo no existe ---
    for (const [campo, valor] of Object.entries(datos || {})) {
      const v = valor ?? "";
      let rellenado = false;

      // Intentar como campo de texto
      try {
        const tf = form.getTextField(campo);
        tf.setText(String(v));
        rellenado = true;
      } catch (_) {}

      // Intentar como desplegable si no era textfield
      if (!rellenado) {
        try {
          const dd = form.getDropdown(campo);
          dd.select(String(v));
          rellenado = true;
        } catch (_) {}
      }

      // Si no existe, lo ignoramos silenciosamente
    }

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${tipo}.pdf`);
    return res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error("Fallo al generar PDF:", error);
    return res.status(500).json({ error: "Error al procesar el PDF" });
  }
}

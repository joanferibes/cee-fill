// api/fill-cee.js
import { PDFDocument } from "pdf-lib";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ error: "Método no permitido" });
    }

    const { tipo, datos } = req.body || {};
    if (!tipo || typeof datos !== "object") {
      return res.status(400).json({ error: "Debes enviar 'tipo' y 'datos'." });
    }

    // Construir URL base segura (funciona en Vercel y en local)
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const proto = req.headers["x-forwarded-proto"] || "https";
    const baseUrl = `${proto}://${host}`;

    // Elegir la plantilla PDF por URL pública
    let pdfUrl;
    if (tipo === "delegacion") {
      pdfUrl = `${baseUrl}/assets/Modelo_delegacion_tramite_registro.pdf`;
    } else if (tipo === "acta") {
      // El espacio debe ir codificado como %20
      pdfUrl = `${baseUrl}/assets/Acta%20de%20visita.pdf`;
    } else {
      return res.status(400).json({ error: "Tipo de documento no válido" });
    }

    // Descargar la plantilla desde /assets (sin usar fs)
    const resp = await fetch(pdfUrl);
    if (!resp.ok) {
      return res
        .status(404)
        .json({ error: "No se pudo descargar la plantilla", pdfUrl, status: resp.status });
    }
    const existingPdfBytes = await resp.arrayBuffer();

    // Cargar y rellenar
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();

    // Relleno SEGURO: si un campo no existe, lo ignoramos y seguimos
    for (const [campo, valor] of Object.entries(datos)) {
      const v = valor == null ? "" : String(valor);
      let ok = false;
      try { form.getTextField(campo).setText(v); ok = true; } catch {}
      if (!ok) { try { form.getDropdown(campo).select(v); ok = true; } catch {} }
      if (!ok) { try { form.getCheckBox(campo).check(); ok = true; } catch {} }
      // si no existe, lo ignoramos
    }

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${tipo}.pdf`);
    return res.send(Buffer.from(pdfBytes));
  } catch (e) {
    console.error("Fallo al generar PDF:", e);
    return res.status(500).json({ error: "Error al procesar el PDF", detalle: e.message });
  }
}

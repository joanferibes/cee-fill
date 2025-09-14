import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";

// función auxiliar para listar campos
async function listFieldNamesFrom(pdfPath) {
  const bytes = await fs.promises.readFile(pdfPath);
  const pdf = await PDFDocument.load(bytes);
  const form = pdf.getForm();
  const fields = form.getFields();
  return fields.map(f => ({ name: f.getName(), type: f.constructor?.name || "Unknown" }));
}

export default async function handler(req, res) {
  const FILES = {
    acta: "Actadevisita.pdf",
    delegacion: "Modelodelegaciontramiteregistro.pdf",
  };

  try {
    // modo GET → listar campos disponibles
    if (req.method === "GET") {
      const t = (req.query?.tipo || "").toString().toLowerCase();
      if (!FILES[t]) {
        return res.status(400).json({ error: "tipo debe ser 'acta' o 'delegacion'" });
      }
      const pdfPath = path.join(process.cwd(), "public", "assets", FILES[t]);
      if (!fs.existsSync(pdfPath)) {
        return res.status(500).json({ error: "PDF base no existe", pdfPath });
      }
      const fields = await listFieldNamesFrom(pdfPath);
      return res.status(200).json({ tipo: t, fields });
    }

    // modo POST → rellenar campos
    if (req.method === "POST") {
      const { tipo, datos } = req.body;
      if (!tipo || !FILES[tipo]) {
        return res.status(400).json({ error: "tipo debe ser 'acta' o 'delegacion'" });
      }

      const pdfPath = path.join(process.cwd(), "public", "assets", FILES[tipo]);
      if (!fs.existsSync(pdfPath)) {
        return res.status(500).json({ error: "PDF base no existe", pdfPath });
      }

      const bytes = await fs.promises.readFile(pdfPath);
      const pdfDoc = await PDFDocument.load(bytes);
      const form = pdfDoc.getForm();

      // rellenar datos
      Object.entries(datos || {}).forEach(([campo, valor]) => {
        const field = form.getFieldMaybe?.(campo) || form.getField(campo);
        if (field) {
          if (field.setText) field.setText(String(valor));
          else if (field.check && valor === true) field.check();
          else if (field.select) field.select(String(valor));
        }
      });

      const pdfBytes = await pdfDoc.save();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=${tipo}.pdf`);
      return res.send(Buffer.from(pdfBytes));
    }

    res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    console.error("Error en fill-cee:", err);
    res.status(500).json({ error: "Error al procesar el PDF", detalle: err.message });
  }
}

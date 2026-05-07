const { query } = require('../models/db');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const exportarPDF = async (req, res) => {
  try {
    const { materia_id, fecha_desde, fecha_hasta } = req.query;
    if (!materia_id) return res.status(400).json({ error: 'materia_id es requerido' });

    // Datos de la materia
    const matInfo = await query(
      `SELECT m.nombre AS materia, m.codigo, cu.nombre AS curso, cu.turno, cu.anio_lectivo,
              u.nombre || ' ' || u.apellido AS docente
       FROM materias m JOIN cursos cu ON m.curso_id = cu.id JOIN usuarios u ON m.docente_id = u.id
       WHERE m.id = $1`, [materia_id]
    );
    if (!matInfo.rows.length) return res.status(404).json({ error: 'Materia no encontrada' });
    const mat = matInfo.rows[0];

    // Clases con temas y actividades
    let whereExtra = '';
    let params = [materia_id];
    if (fecha_desde) { whereExtra += ` AND c.fecha >= $${params.length + 1}`; params.push(fecha_desde); }
    if (fecha_hasta) { whereExtra += ` AND c.fecha <= $${params.length + 1}`; params.push(fecha_hasta); }

    const clases = await query(
      `SELECT c.id, c.fecha, c.numero_clase, c.caracter, c.estado, c.observaciones
       FROM clases c WHERE c.materia_id = $1 ${whereExtra}
       ORDER BY c.fecha ASC`, params
    );

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="libro_temas_${mat.codigo || 'materia'}.pdf"`);
    doc.pipe(res);

    // Encabezado
    doc.fontSize(18).font('Helvetica-Bold').text('SGCA – Libro de Temas', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica-Bold').text(mat.materia, { align: 'center' });
    doc.fontSize(11).font('Helvetica').text(`Curso: ${mat.curso} | Turno: ${mat.turno} | Año: ${mat.anio_lectivo}`, { align: 'center' });
    doc.text(`Docente: ${mat.docente}`, { align: 'center' });
    if (fecha_desde || fecha_hasta)
      doc.text(`Período: ${fecha_desde || '---'} al ${fecha_hasta || '---'}`, { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    if (!clases.rows.length) {
      doc.text('No se encontraron clases para los filtros indicados.', { align: 'center' });
    }

    for (const clase of clases.rows) {
      const [temas, actividades, imprevistos] = await Promise.all([
        query('SELECT * FROM temas WHERE clase_id = $1 ORDER BY orden', [clase.id]),
        query('SELECT * FROM actividades WHERE clase_id = $1', [clase.id]),
        query('SELECT * FROM imprevistos WHERE clase_id = $1', [clase.id])
      ]);

      const fechaStr = new Date(clase.fecha).toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      doc.fontSize(12).font('Helvetica-Bold')
        .text(`Clase N° ${clase.numero_clase} — ${fechaStr}`, { underline: false });
      doc.fontSize(10).font('Helvetica')
        .text(`Carácter: ${clase.caracter}  |  Estado: ${clase.estado}`);
      if (clase.observaciones) doc.text(`Observaciones: ${clase.observaciones}`);
      doc.moveDown(0.3);

      if (temas.rows.length) {
        doc.fontSize(10).font('Helvetica-Bold').text('Temas desarrollados:');
        for (const t of temas.rows) {
          doc.fontSize(10).font('Helvetica').text(`  ${t.orden}. ${t.nombre}`);
          if (t.descripcion) doc.fontSize(9).fillColor('#444').text(`     ${t.descripcion}`).fillColor('black');
        }
        doc.moveDown(0.3);
      }

      if (actividades.rows.length) {
        doc.fontSize(10).font('Helvetica-Bold').text('Actividades:');
        for (const a of actividades.rows) {
          doc.fontSize(10).font('Helvetica').text(`  • [${a.tipo}] ${a.nombre}`);
          if (a.descripcion) doc.fontSize(9).fillColor('#444').text(`     ${a.descripcion}`).fillColor('black');
        }
        doc.moveDown(0.3);
      }

      if (imprevistos.rows.length) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#c0392b').text('Imprevistos:').fillColor('black');
        for (const i of imprevistos.rows) {
          doc.fontSize(10).font('Helvetica').text(`  ⚠ [${i.tipo} – ${i.severidad}] ${i.descripcion} ${i.resuelto ? '(Resuelto)' : '(Pendiente)'}`);
        }
        doc.moveDown(0.3);
      }

      doc.moveTo(50, doc.y).lineTo(545, doc.y).dash(3, { space: 3 }).stroke().undash();
      doc.moveDown(0.5);

      if (doc.y > 720) doc.addPage();
    }

    doc.fontSize(9).fillColor('#888')
      .text(`Generado por SGCA el ${new Date().toLocaleString('es-AR')}`, { align: 'right' });
    doc.end();
  } catch (err) {
    console.error('[REPORTES] PDF:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Error al generar PDF' });
  }
};

const exportarExcel = async (req, res) => {
  try {
    const { materia_id, estado, fecha_desde, fecha_hasta } = req.query;

    let whereClause = ['1=1'];
    let params = [];
    let idx = 1;

    if (materia_id)  { whereClause.push(`c.materia_id = $${idx++}`); params.push(materia_id); }
    if (estado)      { whereClause.push(`c.estado = $${idx++}`);     params.push(estado); }
    if (fecha_desde) { whereClause.push(`c.fecha >= $${idx++}`);     params.push(fecha_desde); }
    if (fecha_hasta) { whereClause.push(`c.fecha <= $${idx++}`);     params.push(fecha_hasta); }

    const clases = await query(
      `SELECT c.id, c.fecha, c.numero_clase, c.caracter, c.estado, c.observaciones,
              c.fecha_creacion, c.fecha_actualizacion,
              m.nombre AS materia, m.codigo,
              cu.nombre AS curso, cu.turno,
              u.nombre || ' ' || u.apellido AS docente,
              ap.nombre || ' ' || ap.apellido AS aprobador,
              (SELECT COUNT(*) FROM temas t WHERE t.clase_id = c.id)::int AS temas,
              (SELECT COUNT(*) FROM actividades a WHERE a.clase_id = c.id)::int AS actividades,
              (SELECT COUNT(*) FROM imprevistos i WHERE i.clase_id = c.id)::int AS imprevistos
       FROM clases c
       JOIN materias m ON c.materia_id = m.id
       JOIN cursos cu ON m.curso_id = cu.id
       JOIN usuarios u ON c.docente_id = u.id
       LEFT JOIN usuarios ap ON c.aprobador_id = ap.id
       WHERE ${whereClause.join(' AND ')}
       ORDER BY c.fecha DESC`,
      params
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SGCA';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Clases', {
      pageSetup: { paperSize: 9, orientation: 'landscape' }
    });

    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3A5C' } },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
    };

    sheet.columns = [
      { header: 'N° Clase',    key: 'numero_clase',  width: 10 },
      { header: 'Fecha',       key: 'fecha',         width: 14 },
      { header: 'Materia',     key: 'materia',        width: 22 },
      { header: 'Código',      key: 'codigo',         width: 10 },
      { header: 'Curso',       key: 'curso',          width: 14 },
      { header: 'Turno',       key: 'turno',          width: 10 },
      { header: 'Docente',     key: 'docente',        width: 22 },
      { header: 'Carácter',    key: 'caracter',       width: 12 },
      { header: 'Estado',      key: 'estado',         width: 18 },
      { header: 'Temas',       key: 'temas',          width: 8 },
      { header: 'Actividades', key: 'actividades',    width: 12 },
      { header: 'Imprevistos', key: 'imprevistos',    width: 12 },
      { header: 'Aprobador',   key: 'aprobador',      width: 22 },
      { header: 'Observaciones', key: 'observaciones',width: 30 },
      { header: 'Creación',    key: 'fecha_creacion', width: 18 },
    ];

    sheet.getRow(1).eachCell((cell) => { Object.assign(cell, headerStyle); });
    sheet.getRow(1).height = 30;

    const estadoColors = {
      'INMUTABLE': 'FF198754', 'APROBADO': 'FF20C997', 'PENDIENTE': 'FFFFC107',
      'REVISION_REQUERIDA': 'FFDC3545', 'CREADO': 'FF6C757D'
    };

    for (const cls of clases.rows) {
      const row = sheet.addRow({
        ...cls,
        fecha: cls.fecha ? new Date(cls.fecha).toLocaleDateString('es-AR') : '',
        fecha_creacion: cls.fecha_creacion ? new Date(cls.fecha_creacion).toLocaleString('es-AR') : ''
      });
      const estadoCell = row.getCell('estado');
      const color = estadoColors[cls.estado] || 'FF6C757D';
      estadoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
      estadoCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      row.eachCell(c => {
        c.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
        c.alignment = { vertical: 'middle', wrapText: true };
      });
    }

    // Hoja de resumen
    const summary = workbook.addWorksheet('Resumen');
    summary.addRow(['SGCA – Reporte de Clases']).font = { bold: true, size: 14 };
    summary.addRow([`Generado: ${new Date().toLocaleString('es-AR')}`]);
    summary.addRow([`Total de clases: ${clases.rows.length}`]);
    const porEstado = clases.rows.reduce((acc, c) => { acc[c.estado] = (acc[c.estado]||0)+1; return acc; }, {});
    summary.addRow([]);
    summary.addRow(['Estado', 'Cantidad']);
    for (const [est, cnt] of Object.entries(porEstado)) {
      summary.addRow([est, cnt]);
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_clases_sgca.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('[REPORTES] Excel:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Error al generar Excel' });
  }
};

module.exports = { exportarPDF, exportarExcel };
